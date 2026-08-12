const ApiError = require('../utils/ApiError');
const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');
const { ROLES } = require('../constants/roles');

const listExams = async (actor, query = {}) => {
  const filter = {};
  if (actor.schoolId) filter.schoolId = actor.schoolId;
  if (query.classId) filter.classId = query.classId;
  if (query.status) filter.status = query.status;
  if (actor.role === ROLES.STUDENT) {
    filter.status = 'PUBLISHED';
    if (actor.classId) filter.classId = actor.classId;
  }
  if (actor.role === ROLES.PARENT) {
    filter.status = { $in: ['PUBLISHED', 'CLOSED'] };
  }
  return Exam.find(filter)
    .populate('subjectId', 'name code')
    .populate('classId', 'name')
    .populate('createdBy', 'name')
    .select(actor.role === ROLES.STUDENT ? '-questions.correctKey' : '')
    .sort({ createdAt: -1 });
};

const getExam = async (actor, id) => {
  const exam = await Exam.findById(id)
    .populate('subjectId', 'name')
    .populate('classId', 'name');
  if (!exam) throw new ApiError(404, 'Không tìm thấy đề thi');
  if (actor.role === ROLES.STUDENT) {
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
  return Exam.create({
    schoolId: actor.schoolId,
    title: data.title,
    subjectId: data.subjectId || null,
    classId: data.classId || null,
    createdBy: actor._id,
    startAt: data.startAt || null,
    endAt: data.endAt || null,
    durationMinutes: data.durationMinutes || 45,
    maxAttempts: data.maxAttempts || 1,
    shuffleQuestions: !!data.shuffleQuestions,
    showResults: data.showResults !== false,
    questions: data.questions || [],
    status: data.status || 'DRAFT',
  });
};

const updateExam = async (actor, id, data) => {
  const exam = await Exam.findById(id);
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
  for (const key of allowed) {
    if (data[key] !== undefined) exam[key] = data[key];
  }
  await exam.save();
  return exam;
};

const startAttempt = async (actor, examId) => {
  const exam = await Exam.findById(examId);
  if (!exam || exam.status !== 'PUBLISHED') throw new ApiError(400, 'Đề chưa mở');
  const count = await ExamAttempt.countDocuments({ examId, studentId: actor._id });
  if (count >= exam.maxAttempts) throw new ApiError(400, 'Đã hết lượt làm bài');

  return ExamAttempt.create({
    schoolId: exam.schoolId,
    examId,
    studentId: actor._id,
    maxScore: (exam.questions || []).reduce((s, q) => s + (q.points || 1), 0),
    status: 'IN_PROGRESS',
  });
};

const submitAttempt = async (actor, attemptId, answers = []) => {
  const attempt = await ExamAttempt.findById(attemptId);
  if (!attempt) throw new ApiError(404, 'Không tìm thấy bài làm');
  if (String(attempt.studentId) !== String(actor._id) && actor.role === ROLES.STUDENT) {
    throw new ApiError(403, 'Không phải bài của bạn');
  }
  if (attempt.status !== 'IN_PROGRESS') throw new ApiError(400, 'Bài đã nộp');

  const exam = await Exam.findById(attempt.examId);
  let score = 0;
  const graded = (answers || []).map((a) => {
    const q = (exam.questions || []).find((x) => String(x._id) === String(a.questionId));
    if (!q) return { ...a, isCorrect: null, pointsAwarded: 0 };
    if (q.type === 'MCQ') {
      const ok = a.answerKey && a.answerKey === q.correctKey;
      const pts = ok ? q.points || 1 : 0;
      score += pts;
      return { ...a, isCorrect: ok, pointsAwarded: pts };
    }
    return { ...a, isCorrect: null, pointsAwarded: 0 };
  });

  attempt.answers = graded;
  attempt.score = score;
  attempt.status = 'SUBMITTED';
  attempt.submittedAt = new Date();
  await attempt.save();
  return attempt;
};

const gradeEssay = async (actor, attemptId, grades = []) => {
  const attempt = await ExamAttempt.findById(attemptId);
  if (!attempt) throw new ApiError(404, 'Không tìm thấy bài làm');
  let score = attempt.answers
    .filter((a) => a.isCorrect === true || a.isCorrect === false)
    .reduce((s, a) => s + (a.pointsAwarded || 0), 0);

  attempt.answers = attempt.answers.map((a) => {
    const g = grades.find((x) => String(x.questionId) === String(a.questionId));
    if (!g) return a;
    score += Number(g.pointsAwarded) || 0;
    return {
      questionId: a.questionId,
      answerKey: a.answerKey,
      answerText: a.answerText,
      isCorrect: g.pointsAwarded > 0,
      pointsAwarded: Number(g.pointsAwarded) || 0,
    };
  });
  attempt.score = score;
  attempt.status = 'GRADED';
  await attempt.save();
  return attempt;
};

const listAttempts = async (actor, query = {}) => {
  const filter = {};
  if (actor.schoolId) filter.schoolId = actor.schoolId;
  if (query.examId) filter.examId = query.examId;
  if (actor.role === ROLES.STUDENT) filter.studentId = actor._id;
  if (actor.role === ROLES.PARENT) filter.studentId = { $in: actor.parentOf || [] };
  return ExamAttempt.find(filter)
    .populate('studentId', 'name code')
    .populate('examId', 'title showResults')
    .sort({ createdAt: -1 })
    .limit(100);
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
