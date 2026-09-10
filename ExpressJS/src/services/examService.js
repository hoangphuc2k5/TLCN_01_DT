const ApiError = require('../utils/ApiError');
const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');
const { ROLES } = require('../constants/roles');
const { schoolScope, personalStudentIds, teacherClassScope, objectId } = require('./dataScope');
const { scopedDocument, academicReferences, targetSchool, reference, pick } = require('./writeScope');
const User = require('../models/User');
const Subject = require('../models/Subject');
const cache = require('./rolePermissionCache');
const { randomInt } = require('node:crypto');

const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 24 * 60;
const MIN_ATTEMPTS = 1;
const MAX_ATTEMPTS = 10;

const personalActor = actor => [ROLES.STUDENT, ROLES.PARENT].includes(actor.role);
const examScope = async (actor) => {
  const filters = [await schoolScope(actor), await teacherClassScope(actor, 'exams')];
  const ids = await personalStudentIds(actor);
  if (ids !== null) {
    const students = await User.find({ _id: { $in: ids } }).select('classId');
    filters.push({ $or: [{ classId: null }, { classId: { $in: students.map(s => s.classId).filter(Boolean) } }], status: { $in: ['PUBLISHED', 'CLOSED'] } });
  }
  return { $and: filters };
};
const examDocument = async (actor, id) => {
  const exam = await Exam.findOne({ ...await examScope(actor), _id: objectId(id) });
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

const gradeAnswers = (exam, answers) => {
  let score = 0;
  const graded = answers.map((a) => {
    const q = (exam.questions || []).find((x) => String(x._id) === String(a.questionId));
    if (!q) return { ...a, isCorrect: null, pointsAwarded: 0 };
    if (q.type === 'MCQ') {
      const ok = Boolean(a.answerKey) && a.answerKey === q.correctKey;
      const pointsAwarded = ok ? q.points || 1 : 0;
      score += pointsAwarded;
      return { ...a, isCorrect: ok, pointsAwarded };
    }
    return { ...a, isCorrect: null, pointsAwarded: 0 };
  });
  return { graded, score };
};

const attemptDeadline = (attempt, exam) => attempt.expiresAt || new Date(new Date(attempt.startedAt).getTime() + (exam.durationMinutes || 45) * 60 * 1000);

const expireAttempt = async (attempt, exam, now = new Date()) => {
  if (attempt.status !== 'IN_PROGRESS' || attemptDeadline(attempt, exam) > now) return attempt;
  const answers = Array.isArray(attempt.answers) ? attempt.answers.map(a => ({ questionId: a.questionId, answerKey: a.answerKey || '', answerText: a.answerText || '' })) : [];
  const { graded, score } = gradeAnswers(exam, answers);
  return ExamAttempt.findOneAndUpdate(
    { _id: attempt._id, status: 'IN_PROGRESS' },
    { answers: graded, score, status: 'SUBMITTED', submittedAt: now, autoSubmitted: true, submissionReason: 'TIMEOUT' },
    { new: true, runValidators: true }
  );
};
const presentAttempt = (actor, attempt, showResults) => {
  const result = attempt.toObject ? attempt.toObject() : attempt;
  if (personalActor(actor) && !showResults) {
    result.score = null;
    result.answers = (result.answers || []).map(a => pick(a, ['questionId', 'answerKey', 'answerText']));
  }
  return result;
};

const listExams = async (actor, query = {}) => {
  const filter = await examScope(actor);
  if (query.classId) filter.classId = objectId(query.classId, 'classId');
  if (query.status) filter.status = query.status;
  return Exam.find(filter)
    .populate('subjectId', 'name code')
    .populate('classId', 'name')
    .populate('createdBy', 'name')
    .select(personalActor(actor) || !(await cache.canAccess(actor.role, 'exams', 'update')) ? '-questions.correctKey' : '')
    .sort({ createdAt: -1 });
};

const getExam = async (actor, id) => {
  const exam = await examDocument(actor, id);
  await exam.populate([{ path: 'subjectId', select: 'name' }, { path: 'classId', select: 'name' }]);
  if (!exam) throw new ApiError(404, 'Không tìm thấy đề thi');
  if (personalActor(actor) || !(await cache.canAccess(actor.role, 'exams', 'update'))) {
    const obj = exam.toObject();
    obj.questions = (obj.questions || []).map((q) => {
      const { correctKey, ...rest } = q;
      return rest;
    });
    return obj;
  }
  return exam;
};

const createExam = async (actor, data) => {
  if (!data.title) throw new ApiError(400, 'Thiếu tiêu đề');
  validateExamSettings(data);
  const schoolId = await targetSchool(actor, data.schoolId);
  await validateExamRefs(actor, data, schoolId);
  return Exam.create({
    schoolId,
    title: data.title,
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
  await validateExamRefs(actor, { ...exam.toObject(), ...pick(data, allowed) }, exam.schoolId);
  if (data.questions !== undefined && await ExamAttempt.exists({ examId: exam._id })) throw new ApiError(409, 'Không sửa câu hỏi khi đã có bài làm');
  for (const key of allowed) {
    if (data[key] !== undefined) exam[key] = data[key];
  }
  await exam.save();
  return exam;
};

const startAttempt = async (actor, examId) => {
  if (actor.role !== ROLES.STUDENT) throw new ApiError(403, 'Chỉ học sinh được làm bài');
  const exam = await examDocument(actor, examId);
  if (!exam || exam.status !== 'PUBLISHED') throw new ApiError(400, 'Đề chưa mở');
  const now = new Date();
  if ((exam.startAt && now < exam.startAt) || (exam.endAt && now > exam.endAt)) throw new ApiError(400, 'Ngoài thời gian mở đề');
  const count = await ExamAttempt.countDocuments({ examId, studentId: actor._id });
  if (count >= exam.maxAttempts) throw new ApiError(400, 'Đã hết lượt làm bài');

  const durationDeadline = new Date(now.getTime() + (exam.durationMinutes || 45) * 60 * 1000);
  const expiresAt = exam.endAt && exam.endAt < durationDeadline ? exam.endAt : durationDeadline;
  const questionIds = (exam.questions || []).map(q => q._id);
  const questionOrder = exam.shuffleQuestions ? shuffle(questionIds) : questionIds;
  try { return await ExamAttempt.create({
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
  if (!Array.isArray(answers)) throw new ApiError(400, 'answers phải là danh sách');
  const questionIds = new Set();
  for (const a of answers) {
    if (questionIds.has(String(a.questionId)) || !exam.questions.some(q => String(q._id) === String(a.questionId))) throw new ApiError(400, 'Câu trả lời bị trùng hoặc không thuộc đề');
    questionIds.add(String(a.questionId));
  }
  const { graded, score } = gradeAnswers(exam, answers || []);
  const now = new Date();
  const timedOut = attemptDeadline(attempt, exam) <= now;

  const saved = await ExamAttempt.findOneAndUpdate(
    { _id: attempt._id, status: 'IN_PROGRESS', studentId: actor._id },
    { answers: graded, score, status: 'SUBMITTED', submittedAt: now, autoSubmitted: timedOut, submissionReason: timedOut ? 'TIMEOUT' : 'MANUAL' },
    { new: true, runValidators: true }
  );
  if (!saved) throw new ApiError(409, 'Bài đã được nộp');
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
      questionId: a.questionId,
      answerKey: a.answerKey,
      answerText: a.answerText,
      isCorrect: g.pointsAwarded > 0,
      pointsAwarded: Number(g.pointsAwarded) || 0,
    };
  });
  attempt.score = attempt.answers.reduce((sum, answer) => sum + (answer.pointsAwarded || 0), 0);
  attempt.status = 'GRADED';
  await attempt.save();
  return attempt;
};

const listAttempts = async (actor, query = {}) => {
  const exams = await Exam.find(await examScope(actor)).select('_id');
  const filter = { ...await schoolScope(actor), $and: [{ examId: { $in: exams.map(e => e._id) } }] };
  if (query.examId) filter.examId = query.examId;
  if (actor.role === ROLES.STUDENT) filter.studentId = actor._id;
  if (actor.role === ROLES.PARENT) filter.studentId = { $in: actor.parentOf || [] };
  const attempts = await ExamAttempt.find(filter)
    .populate('studentId', 'name code')
    .populate('examId', 'title showResults')
    .sort({ createdAt: -1 })
    .limit(100);
  const now = new Date();
  const refreshed = [];
  for (const attempt of attempts) {
    if (attempt.status === 'IN_PROGRESS' && attempt.examId) {
      const exam = await Exam.findById(attempt.examId._id || attempt.examId).select('durationMinutes questions showResults');
      const expired = exam && await expireAttempt(attempt, exam, now);
      if (expired) await expired.populate([{ path: 'studentId', select: 'name code' }, { path: 'examId', select: 'title showResults' }]);
      refreshed.push(expired || attempt);
    } else refreshed.push(attempt);
  }
  return refreshed.map(a => presentAttempt(actor, a, a.examId?.showResults));
};

module.exports = {
  listExams,
  getExam,
  createExam,
  updateExam,
  startAttempt,
  submitAttempt,
  gradeEssay,
  listAttempts,
};
