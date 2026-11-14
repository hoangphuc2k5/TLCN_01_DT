function createExamService(dependencies) {
  const persistence = dependencies.persistence;
  const ApiError = require("../../../utils/common/http/api-error.util");
  const ExamAttempt = "exam-attempt";
  const { ROLES } = require("../../../config/constants/roles.config");
  const { schoolScope, personalStudentIds, teacherClassScope, objectId } = dependencies.services["data-scope"];
  const { scopedDocument, academicReferences, targetSchool, reference, pick } = dependencies.services["write-scope"];
  const Subject = "subject";
  const cache = dependencies.services["role-permission-cache"];
  const { randomInt } = require('node:crypto');
  const {
    gradeAnswers,
    validateExamSections,
    validateExamQuestions,
    validatePublishTotal,
    roundScore,
  } = require('../../../utils/common/academics/exam-question.util');
  
  const MIN_DURATION_MINUTES = 1;
  const MAX_DURATION_MINUTES = 24 * 60;
  const MIN_ATTEMPTS = 1;
  const MAX_ATTEMPTS = 10;
  
  const personalActor = actor => [ROLES.STUDENT, ROLES.PARENT].includes(actor.role);
  const examScope = async (actor) => {
    const filters = [await schoolScope(actor), await teacherClassScope(actor, 'exams')];
    const ids = await personalStudentIds(actor);
    if (ids !== null) {
      const students = await persistence.studentsFind({ _id: { $in: ids } });
      filters.push({ $or: [{ classId: null }, { classId: { $in: students.map(s => s.classId).filter(Boolean) } }], status: { $in: ['PUBLISHED', 'CLOSED'] } });
    }
    return { $and: filters };
  };
  const examDocument = async (actor, id) => {
    const exam = await persistence.examFindOne({ ...await examScope(actor), _id: objectId(id) });
    if (!exam) throw new ApiError(404, 'Không tìm thấy đề trong phạm vi');
    return exam;
  };
  const validateExamRefs = async (actor, data, schoolId) => {
    if ([ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER].includes(actor.role) && !data.classId) throw new ApiError(400, 'Giáo viên cần chọn lớp được phân công');
    if (data.classId) await academicReferences(actor, data, { expectedSchoolId: schoolId });
    if (data.subjectId) await reference(Subject, data.subjectId, schoolId);
  };
  
  const validateExamSettings = (data) => {
    if (data.durationMinutes !== undefined && (!Number.isInteger(data.durationMinutes) || data.durationMinutes < MIN_DURATION_MINUTES || data.durationMinutes > MAX_DURATION_MINUTES)) {
      throw new ApiError(400, `Thời lượng phải là số nguyên từ ${MIN_DURATION_MINUTES} đến ${MAX_DURATION_MINUTES} phút`);
    }
    if (data.maxAttempts !== undefined && (!Number.isInteger(data.maxAttempts) || data.maxAttempts < MIN_ATTEMPTS || data.maxAttempts > MAX_ATTEMPTS)) {
      throw new ApiError(400, `Số lượt làm bài phải là số nguyên từ ${MIN_ATTEMPTS} đến ${MAX_ATTEMPTS}`);
    }
  };
  
  const shuffle = (items) => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = randomInt(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };

  const buildQuestionOrder = (exam) => {
    const questions = [...(exam.questions || [])];
    const sections = [...(exam.sections || [])].sort((a, b) => a.order - b.order);
    if (!sections.length) {
      const ordered = questions.sort((a, b) => (a.order || 0) - (b.order || 0));
      return (exam.shuffleQuestions ? shuffle(ordered) : ordered).map(question => question._id);
    }
    const grouped = sections.map(section => questions
      .filter(question => question.sectionKey === section.key)
      .sort((a, b) => (a.order || 0) - (b.order || 0)));
    const unsectioned = questions.filter(question => !sections.some(section => section.key === question.sectionKey))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    return [...grouped, unsectioned].flatMap(group => (exam.shuffleQuestions ? shuffle(group) : group).map(question => question._id));
  };
  
  const attemptDeadline = (attempt, exam) => attempt.expiresAt || new Date(new Date(attempt.startedAt).getTime() + (exam.durationMinutes || 45) * 60 * 1000);
  
  const expireAttempt = async (attempt, exam, now = new Date()) => {
    if (attempt.status !== 'IN_PROGRESS' || attemptDeadline(attempt, exam) > now) return attempt;
    const answers = Array.isArray(attempt.answers) ? attempt.answers.map(a => ({ questionId: a.questionId, answerKey: a.answerKey || '', answerKeys: a.answerKeys || [], answerFlags: a.answerFlags || [], answerText: a.answerText || '' })) : [];
    const { graded, score, pendingManualGrading } = gradeAnswers(exam, answers);
    return persistence.expireAttemptFindOneAndUpdate({ _id: attempt._id, status: 'IN_PROGRESS' }, { answers: graded, score, pendingManualGrading, status: 'SUBMITTED', submittedAt: now, autoSubmitted: true, submissionReason: 'TIMEOUT' }, { new: true, runValidators: true });
  };
  const validateAttemptAnswers = (exam, answers) => {
    if (!Array.isArray(answers)) throw new ApiError(400, 'answers phải là danh sách');
    const questionIds = new Set();
    for (const answer of answers) {
      if (!answer?.questionId || questionIds.has(String(answer.questionId)) || !exam.questions.some(q => String(q._id) === String(answer.questionId))) {
        throw new ApiError(400, 'Câu trả lời bị trùng hoặc không thuộc đề');
      }
      questionIds.add(String(answer.questionId));
    }
    return answers.map(answer => {
      const question = exam.questions.find(item => String(item._id) === String(answer.questionId));
      const safe = { questionId: answer.questionId };
      if (question.type === 'MCQ') {
        const answerKey = answer.answerKey || '';
        if (answerKey && !(question.options || []).some(option => option.key === answerKey)) throw new ApiError(400, 'Đáp án trắc nghiệm không hợp lệ');
        safe.answerKey = answerKey;
      } else if (question.type === 'MCQ_MULTI') {
        const answerKeys = answer.answerKeys || [];
        if (!Array.isArray(answerKeys) || new Set(answerKeys).size !== answerKeys.length || answerKeys.some(key => !(question.options || []).some(option => option.key === key))) throw new ApiError(400, 'Danh sách đáp án không hợp lệ');
        safe.answerKeys = answerKeys;
      } else if (question.type === 'TRUE_FALSE_4') {
        const answerFlags = answer.answerFlags || [];
        if (!Array.isArray(answerFlags) || answerFlags.length > 4 || answerFlags.some(value => value !== null && typeof value !== 'boolean')) throw new ApiError(400, 'Câu Đúng/Sai cần tối đa 4 lựa chọn Đúng/Sai');
        safe.answerFlags = answerFlags;
      } else {
        const answerText = answer.answerText || '';
        if (typeof answerText !== 'string' || answerText.length > 20000) throw new ApiError(400, 'Câu trả lời văn bản không hợp lệ');
        safe.answerText = answerText;
      }
      return safe;
    });
  };
  const presentAttempt = (actor, attempt, showResults) => {
    const result = attempt.toObject ? attempt.toObject() : attempt;
    const rawScore = result.score;
    const hasPendingManual = Number(result.pendingManualGrading || 0) > 0;
    result.scoreOutOfTen = rawScore == null || !result.maxScore || hasPendingManual ? null : roundScore((rawScore / result.maxScore) * 10);
    if (personalActor(actor) && (!showResults || hasPendingManual)) {
      result.score = null;
      result.scoreOutOfTen = null;
      result.answers = (result.answers || []).map(a => pick(a, ['questionId', 'answerKey', 'answerKeys', 'answerFlags', 'answerText']));
    }
    return result;
  };
  
  const listExams = async (actor, query = {}) => {
    const filter = await examScope(actor);
    if (query.classId) filter.classId = objectId(query.classId, 'classId');
    if (query.status) filter.status = query.status;
    return persistence.listExamsFind(filter, personalActor(actor) || !(await cache.canAccess(actor.role, 'exams', 'update')) ? '-questions.correctKey -questions.correctKeys -questions.acceptedAnswers -questions.statements.correctAnswer' : '', { createdAt: -1 });
  };
  
  const getExam = async (actor, id) => {
    const exam = await examDocument(actor, id);
    await persistence.getExamPopulate(exam, [{ path: 'subjectId', select: 'name' }, { path: 'classId', select: 'name' }]);
    if (!exam) throw new ApiError(404, 'Không tìm thấy đề thi');
    if (personalActor(actor) || !(await cache.canAccess(actor.role, 'exams', 'update'))) {
      const obj = exam.toObject();
      obj.questions = (obj.questions || []).map((q) => {
        const { correctKey: _correctKey, correctKeys: _correctKeys, acceptedAnswers: _acceptedAnswers, ...rest } = q;
        rest.statements = (rest.statements || []).map(({ correctAnswer: _correctAnswer, ...statement }) => statement);
        return rest;
      });
      return obj;
    }
    return exam;
  };
  
  const createExam = async (actor, data) => {
    if (!data.title) throw new ApiError(400, 'Thiếu tiêu đề');
    validateExamSettings(data);
    if (data.template !== undefined && !['CUSTOM', 'THPT_2025'].includes(data.template)) throw new ApiError(400, 'Mẫu đề không hợp lệ');
    const sectionsError = validateExamSections(data.sections);
    if (sectionsError) throw new ApiError(400, sectionsError);
    const questionsError = validateExamQuestions(data.questions || [], data.sections || []);
    if (questionsError) throw new ApiError(400, questionsError);
    if (data.status === 'PUBLISHED') {
      if (!(data.questions || []).length) throw new ApiError(400, 'Đề thi cần ít nhất một câu hỏi trước khi mở');
      const totalError = validatePublishTotal(data, data.questions || []);
      if (totalError) throw new ApiError(400, totalError);
    }
    const schoolId = await targetSchool(actor, data.schoolId);
    await validateExamRefs(actor, data, schoolId);
    return persistence.createExamCreate({
      schoolId,
      title: data.title,
      template: data.template || 'CUSTOM',
      sections: data.sections || [],
      subjectId: data.subjectId || null,
      classId: data.classId || null,
      createdBy: actor._id,
      startAt: data.startAt || null,
      endAt: data.endAt || null,
      durationMinutes: data.durationMinutes === undefined ? 45 : data.durationMinutes,
      maxAttempts: data.maxAttempts === undefined ? 1 : data.maxAttempts,
      shuffleQuestions: !!data.shuffleQuestions,
      showResults: data.showResults !== false,
      questions: data.questions || [],
      status: data.status || 'DRAFT',
    });
  };
  
  const updateExam = async (actor, id, data) => {
    const exam = await examDocument(actor, id);
    if (!exam) throw new ApiError(404, 'Không tìm thấy đề thi');
    if (String(exam.schoolId) !== String(actor.schoolId) && actor.role !== ROLES.SUPER_ADMIN) {
      throw new ApiError(403, 'Ngoài phạm vi');
    }
    const allowed = [
      'title',
      'template',
      'sections',
      'subjectId',
      'classId',
      'startAt',
      'endAt',
      'durationMinutes',
      'maxAttempts',
      'shuffleQuestions',
      'showResults',
      'questions',
      'status',
    ];
    validateExamSettings(data);
    const updated = { ...exam.toObject(), ...pick(data, allowed) };
    if (!['CUSTOM', 'THPT_2025'].includes(updated.template)) throw new ApiError(400, 'Mẫu đề không hợp lệ');
    const shouldValidateQuestions = data.questions !== undefined || data.sections !== undefined || data.template !== undefined || data.status === 'PUBLISHED';
    if (shouldValidateQuestions) {
      const sectionsError = validateExamSections(updated.sections);
      if (sectionsError) throw new ApiError(400, sectionsError);
      const questionsError = validateExamQuestions(updated.questions || [], updated.sections || []);
      if (questionsError) throw new ApiError(400, questionsError);
    }
    if (updated.status === 'PUBLISHED') {
      if (!(updated.questions || []).length) throw new ApiError(400, 'Đề thi cần ít nhất một câu hỏi trước khi mở');
      const totalError = validatePublishTotal(updated, updated.questions || []);
      if (totalError) throw new ApiError(400, totalError);
    }
    await validateExamRefs(actor, updated, exam.schoolId);
    if (data.questions !== undefined && await persistence.updateExamExists({ examId: exam._id })) throw new ApiError(409, 'Không sửa câu hỏi khi đã có bài làm');
    for (const key of allowed) {
      if (data[key] !== undefined) exam[key] = data[key];
    }
    await persistence.updateExamSave(exam);
    return exam;
  };
  
  const startAttempt = async (actor, examId) => {
    if (actor.role !== ROLES.STUDENT) throw new ApiError(403, 'Chỉ học sinh được làm bài');
    const exam = await examDocument(actor, examId);
    if (!exam || exam.status !== 'PUBLISHED') throw new ApiError(400, 'Đề chưa mở');
    const now = new Date();
    if ((exam.startAt && now < exam.startAt) || (exam.endAt && now > exam.endAt)) throw new ApiError(400, 'Ngoài thời gian mở đề');
    const active = await persistence.activeFindOne({ examId, studentId: actor._id, status: 'IN_PROGRESS' }, { attemptNumber: -1 });
    if (active) {
      const refreshed = await expireAttempt(active, exam, now);
      if (refreshed?.status === 'IN_PROGRESS') return refreshed;
    }
    const count = await persistence.countCountDocuments({ examId, studentId: actor._id });
    if (count >= exam.maxAttempts) throw new ApiError(400, 'Đã hết lượt làm bài');
  
    const durationDeadline = new Date(now.getTime() + (exam.durationMinutes || 45) * 60 * 1000);
    const expiresAt = exam.endAt && exam.endAt < durationDeadline ? exam.endAt : durationDeadline;
    const questionOrder = buildQuestionOrder(exam);
    try { return await persistence.startAttemptCreate({
      schoolId: exam.schoolId,
      examId,
      studentId: actor._id,
      attemptNumber: count + 1,
      maxScore: (exam.questions || []).reduce((s, q) => s + (q.points || 1), 0),
      status: 'IN_PROGRESS',
      expiresAt,
      questionOrder,
    }); } catch (error) {
      if (error.code === 11000) throw new ApiError(409, 'Lượt làm bài đã được tạo');
      throw error;
    }
  };
  
  const submitAttempt = async (actor, attemptId, answers = []) => {
    const attempt = await scopedDocument(ExamAttempt, actor, attemptId);
    if (!attempt) throw new ApiError(404, 'Không tìm thấy bài làm');
    if (actor.role !== ROLES.STUDENT || String(attempt.studentId) !== String(actor._id)) {
      throw new ApiError(403, 'Không phải bài của bạn');
    }
    if (attempt.status !== 'IN_PROGRESS') throw new ApiError(400, 'Bài đã nộp');
  
    const exam = await examDocument(actor, attempt.examId);
    const now = new Date();
    const timedOut = attemptDeadline(attempt, exam) <= now;
    const selectedAnswers = timedOut ? (attempt.answers || []) : validateAttemptAnswers(exam, answers);
    const { graded, score, pendingManualGrading } = gradeAnswers(exam, selectedAnswers);
  
    const saved = await persistence.savedFindOneAndUpdate({ _id: attempt._id, status: 'IN_PROGRESS', studentId: actor._id }, { answers: graded, score, pendingManualGrading, status: 'SUBMITTED', submittedAt: now, autoSubmitted: timedOut, submissionReason: timedOut ? 'TIMEOUT' : 'MANUAL' }, { new: true, runValidators: true });
    if (!saved) throw new ApiError(409, 'Bài đã được nộp');
    return presentAttempt(actor, saved, exam.showResults);
  };
  
  const saveDraft = async (actor, attemptId, answers = []) => {
    const attempt = await scopedDocument(ExamAttempt, actor, attemptId);
    if (actor.role !== ROLES.STUDENT || String(attempt.studentId) !== String(actor._id)) throw new ApiError(403, 'Không phải bài của bạn');
    if (attempt.status !== 'IN_PROGRESS') throw new ApiError(409, 'Bài đã nộp');
    const exam = await examDocument(actor, attempt.examId);
    if (attemptDeadline(attempt, exam) <= new Date()) {
      await expireAttempt(attempt, exam);
      throw new ApiError(409, 'Bài đã hết thời gian');
    }
    const safeAnswers = validateAttemptAnswers(exam, answers);
    const saved = await persistence.savedFindOneAndUpdate2({ _id: attempt._id, status: 'IN_PROGRESS', studentId: actor._id }, { $set: { answers: safeAnswers } }, { new: true, runValidators: true });
    if (!saved) throw new ApiError(409, 'Bài vừa được nộp');
    return presentAttempt(actor, saved, exam.showResults);
  };
  
  const gradeEssay = async (actor, attemptId, grades = []) => {
    const attempt = await scopedDocument(ExamAttempt, actor, attemptId);
    if (!attempt) throw new ApiError(404, 'Không tìm thấy bài làm');
    const exam = await examDocument(actor, attempt.examId);
    await validateExamRefs(actor, exam, exam.schoolId);
    if (!['SUBMITTED', 'GRADED'].includes(attempt.status)) throw new ApiError(409, 'Bài chưa nộp');
    if (!Array.isArray(grades)) throw new ApiError(400, 'grades phải là danh sách');
    const seen = new Set();
    for (const g of grades) {
      const question = exam.questions.find(q => String(q._id) === String(g.questionId));
      if (!question || question.type !== 'ESSAY' || seen.has(String(g.questionId)) || typeof g.pointsAwarded !== 'number' || !Number.isFinite(g.pointsAwarded) || g.pointsAwarded < 0 || g.pointsAwarded > question.points) throw new ApiError(400, 'Điểm/câu tự luận không hợp lệ');
      seen.add(String(g.questionId));
    }
  
    attempt.answers = attempt.answers.map((a) => {
      const g = grades.find((x) => String(x.questionId) === String(a.questionId));
      if (!g) return a;
      return {
        ...(a.toObject ? a.toObject() : a),
        isCorrect: g.pointsAwarded > 0,
        pointsAwarded: Number(g.pointsAwarded) || 0,
      };
    });
    attempt.score = attempt.answers.reduce((sum, answer) => sum + (answer.pointsAwarded || 0), 0);
    const essayQuestionIds = new Set(exam.questions.filter(question => question.type === 'ESSAY').map(question => String(question._id)));
    attempt.pendingManualGrading = attempt.answers.filter(answer => essayQuestionIds.has(String(answer.questionId)) && String(answer.answerText || '').trim() && answer.isCorrect == null).length;
    attempt.status = attempt.pendingManualGrading ? 'SUBMITTED' : 'GRADED';
    await persistence.gradeEssaySave(attempt);
    return attempt;
  };
  
  const listAttempts = async (actor, query = {}) => {
    const exams = await persistence.examsFind(await examScope(actor));
    const filter = { ...await schoolScope(actor), $and: [{ examId: { $in: exams.map(e => e._id) } }] };
    if (query.examId) filter.examId = query.examId;
    if (actor.role === ROLES.STUDENT) filter.studentId = actor._id;
    if (actor.role === ROLES.PARENT) filter.studentId = { $in: actor.parentOf || [] };
    const attempts = await persistence.attemptsFind(filter, { createdAt: -1 });
    const now = new Date();
    const refreshed = [];
    for (const attempt of attempts) {
      if (attempt.status === 'IN_PROGRESS' && attempt.examId) {
        const exam = await persistence.examFindById(attempt.examId._id || attempt.examId);
        const expired = exam && await expireAttempt(attempt, exam, now);
        if (expired) await persistence.listAttemptsPopulate(expired, [{ path: 'studentId', select: 'name code' }, { path: 'examId', select: 'title showResults' }]);
        refreshed.push(expired || attempt);
      } else refreshed.push(attempt);
    }
    return refreshed.map(a => presentAttempt(actor, a, a.examId?.showResults));
  };
  
  return {
    listExams,
    getExam,
    createExam,
    updateExam,
    startAttempt,
    submitAttempt,
    saveDraft,
    gradeEssay,
    listAttempts,
  };
  
}

class ExamService {
  constructor(dependencies) {
    Object.assign(this, createExamService(dependencies));
  }
}

module.exports = ExamService;
