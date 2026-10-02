function createHomeworkService(dependencies) {
  const persistence = dependencies.persistence;
  const ApiError = require("../../../utils/common/http/api-error.util");
  const User = "user";
  const { ROLES } = require("../../../config/constants/roles.config");
  const { schoolScope, personalStudentIds, objectId } = dependencies.services["data-scope"];
  const { targetSchool, reference } = dependencies.services["write-scope"];
  
  const teachers = [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER];
  const managers = [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS];
  const parseDate = (value, label) => {
    const date = new Date(value);
    if (!value || !Number.isFinite(date.getTime())) throw new ApiError(400, `${label} không hợp lệ`);
    return date;
  };
  const assignmentScope = async (actor, query = {}) => {
    const clauses = [await schoolScope(actor)];
    if (query.classId) clauses.push({ classId: objectId(query.classId, 'classId') });
    if (query.subjectId) clauses.push({ subjectId: objectId(query.subjectId, 'subjectId') });
    if (query.status) clauses.push({ status: query.status });
    const ids = await personalStudentIds(actor);
    if (ids !== null) {
      const students = await persistence.studentsFind({ _id: { $in: ids } });
      clauses.push({ classId: { $in: students.map(s => s.classId).filter(Boolean) }, status: { $in: ['PUBLISHED', 'CLOSED'] } });
    } else if (teachers.includes(actor.role)) {
      clauses.push({ teacherId: actor._id });
    }
    return { $and: clauses };
  };
  const populate = [
    { path: 'classId', select: 'name gradeLevel' },
    { path: 'subjectId', select: 'name code' },
    { path: 'academicYearId', select: 'name startDate endDate' },
    { path: 'teacherId', select: 'name code' },
  ];
  const validateReferences = async (actor, data, schoolId) => {
    const classId = objectId(data.classId, 'classId');
    const subjectId = objectId(data.subjectId, 'subjectId');
    const academicYearId = objectId(data.academicYearId, 'academicYearId');
    const teacherId = objectId(data.teacherId || actor._id, 'teacherId');
    await reference("class", classId, schoolId, { academicYearId });
    await reference("subject", subjectId, schoolId);
    const year = await reference("academic-year", academicYearId, schoolId);
    const teacher = await reference(User, teacherId, schoolId, { role: { $in: teachers }, status: 'ACTIVE' });
    if (!await persistence.validateReferencesExists({ schoolId, classId, subjectId, academicYearId, teacherId })) {
      throw new ApiError(403, 'Giáo viên chưa được phân công lớp/môn/năm học này');
    }
    return { classId, subjectId, academicYearId, teacherId, year };
  };
  const assertOwner = (actor, homework) => {
    if (managers.includes(actor.role)) return;
    const ownerId = homework.teacherId?._id || homework.teacherId;
    if (teachers.includes(actor.role) && String(ownerId) === String(actor._id)) return;
    throw new ApiError(403, 'Không có quyền thao tác bài tập này');
  };
  const assertSubmissionOpen = (row, now = new Date()) => {
    if (row.status !== 'PUBLISHED') throw new ApiError(400, row.status === 'CLOSED' ? 'Bài tập đã đóng, không nhận bài mới' : 'Bài tập chưa được mở');
    if (now < row.availableFrom) throw new ApiError(400, 'Bài tập chưa đến thời gian mở');
    const deadline = row.allowLate && row.lateUntil ? row.lateUntil : row.dueAt;
    if (now > deadline) throw new ApiError(400, 'Đã quá hạn nộp bài');
  };
  
  const listHomeworks = async (actor, query = {}) => {
    const rows = await persistence.rowsFind(await assignmentScope(actor, query), populate, { dueAt: 1, createdAt: -1 });
    if (![ROLES.STUDENT, ROLES.PARENT].includes(actor.role)) return rows;
    const ids = await personalStudentIds(actor);
    const submissions = await persistence.submissionsFind({ homeworkId: { $in: rows.map(r => r._id) }, studentId: { $in: ids } });
    const byHomework = new Map(submissions.map(s => [String(s.homeworkId), s]));
    return rows.map(row => ({ ...row.toObject(), submission: byHomework.get(String(row._id)) || null }));
  };
  const getHomework = async (actor, id) => {
    const row = await persistence.rowFindOne({ ...(await assignmentScope(actor)), _id: objectId(id) }, populate);
    if (!row) throw new ApiError(404, 'Không tìm thấy bài tập trong phạm vi');
    return row;
  };
  const createHomework = async (actor, data) => {
    if (![...managers, ...teachers].includes(actor.role)) throw new ApiError(403, 'Không có quyền giao bài');
    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) throw new ApiError(400, 'Thiếu tiêu đề bài tập');
    const schoolId = await targetSchool(actor, data.schoolId);
    const refs = await validateReferences(actor, data, schoolId);
    const availableFrom = data.availableFrom ? parseDate(data.availableFrom, 'Thời điểm mở bài') : new Date();
    const dueAt = parseDate(data.dueAt, 'Hạn nộp');
    const lateUntil = data.lateUntil ? parseDate(data.lateUntil, 'Hạn nộp trễ') : null;
    if (dueAt <= availableFrom || (lateUntil && lateUntil < dueAt) || availableFrom < refs.year.startDate || dueAt > refs.year.endDate || (lateUntil && lateUntil > refs.year.endDate)) throw new ApiError(400, 'Mốc thời gian bài tập không hợp lệ');
    const maxScore = data.maxScore === undefined ? 10 : Number(data.maxScore);
    if (!Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 100) throw new ApiError(400, 'Điểm tối đa phải từ 0 đến 100');
    return persistence.createHomeworkCreate({ schoolId, classId: refs.classId, subjectId: refs.subjectId, academicYearId: refs.academicYearId, teacherId: refs.teacherId, title: data.title.trim(), instructions: String(data.instructions || '').trim(), availableFrom, dueAt,
      lateUntil, allowLate: !!data.allowLate, maxScore, status: 'DRAFT' });
  };
  const updateHomework = async (actor, id, data) => {
    const row = await getHomework(actor, id); assertOwner(actor, row);
    if (row.status !== 'DRAFT') throw new ApiError(409, 'Chỉ sửa được bài tập đang nháp');
    const allowed = ['title', 'instructions', 'availableFrom', 'dueAt', 'lateUntil', 'allowLate', 'maxScore'];
    const merged = { ...row.toObject(), ...Object.fromEntries(allowed.filter(k => data[k] !== undefined).map(k => [k, data[k]])) };
    const refs = await validateReferences(actor, merged, row.schoolId);
    const availableFrom = parseDate(merged.availableFrom, 'Thời điểm mở bài');
    const dueAt = parseDate(merged.dueAt, 'Hạn nộp');
    const lateUntil = merged.lateUntil ? parseDate(merged.lateUntil, 'Hạn nộp trễ') : null;
    if (dueAt <= availableFrom || (lateUntil && lateUntil < dueAt) || availableFrom < refs.year.startDate || dueAt > refs.year.endDate || (lateUntil && lateUntil > refs.year.endDate)) throw new ApiError(400, 'Mốc thời gian bài tập không hợp lệ');
    const maxScore = Number(merged.maxScore);
    if (!Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 100) throw new ApiError(400, 'Điểm tối đa phải từ 0 đến 100');
    Object.assign(row, { classId: refs.classId, subjectId: refs.subjectId, academicYearId: refs.academicYearId, teacherId: refs.teacherId, title: String(merged.title || '').trim(), instructions: String(merged.instructions || '').trim(), availableFrom, dueAt, lateUntil, allowLate: !!merged.allowLate, maxScore });
    if (!row.title) throw new ApiError(400, 'Thiếu tiêu đề bài tập');
    return persistence.updateHomeworkSave(row);
  };
  const publishHomework = async (actor, id) => {
    const row = await getHomework(actor, id); assertOwner(actor, row);
    const updated = await persistence.updatedFindOneAndUpdate({ _id: row._id, status: 'DRAFT' }, { status: 'PUBLISHED' }, { new: true, runValidators: true });
    if (!updated) throw new ApiError(409, 'Bài tập đã được mở hoặc đã đóng');
    return updated;
  };
  const closeHomework = async (actor, id) => {
    const row = await getHomework(actor, id); assertOwner(actor, row);
    const updated = await persistence.updatedFindOneAndUpdate2({ _id: row._id, status: 'PUBLISHED' }, { status: 'CLOSED' }, { new: true });
    if (!updated) throw new ApiError(409, 'Bài tập không ở trạng thái đang mở');
    return updated;
  };
  const submitHomework = async (actor, id, data) => {
    if (actor.role !== ROLES.STUDENT) throw new ApiError(403, 'Chỉ học sinh được nộp bài');
    const row = await getHomework(actor, id);
    const now = new Date();
    assertSubmissionOpen(row, now);
    const submissionMode = data.submissionMode || 'WEB';
    if (!['WEB', 'FILE'].includes(submissionMode)) throw new ApiError(400, 'Hình thức nộp bài không hợp lệ');
    const answerText = typeof data.answerText === 'string' ? data.answerText.trim() : '';
    if (submissionMode === 'WEB' && !answerText) throw new ApiError(400, 'Cần nội dung bài làm');
    const previous = await persistence.previousFindOne({ homeworkId: row._id, studentId: actor._id });
    if (previous?.status === 'GRADED') throw new ApiError(409, 'Bài đã được chấm, không thể nộp lại');
    const hasAttachments = (previous?.attachmentIds || []).length > 0;
    const storedMode = submissionMode === 'FILE' ? 'FILE' : hasAttachments ? 'MIXED' : 'WEB';
    const payload = { homeworkId: row._id, schoolId: row.schoolId, studentId: actor._id, answerText, submissionMode: storedMode,
      submittedAt: now, late: now > row.dueAt, status: submissionMode === 'FILE' ? 'UPLOADING' : 'SUBMITTED', score: null, feedback: '', gradedBy: null, gradedAt: null };
    try { return await persistence.submitHomeworkFindOneAndUpdate({ homeworkId: row._id, studentId: actor._id }, payload, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }); }
    catch (error) { if (error.code === 11000) throw new ApiError(409, 'Bài nộp đã được tạo đồng thời'); throw error; }
  };
  const listSubmissions = async (actor, id) => {
    const row = await getHomework(actor, id);
    if (actor.role === ROLES.STUDENT) return persistence.listSubmissionsFind({ homeworkId: row._id, studentId: actor._id }, { submittedAt: -1 });
    if (actor.role === ROLES.PARENT) {
      const ids = await personalStudentIds(actor);
      return persistence.listSubmissionsFind2({ homeworkId: row._id, studentId: { $in: ids } }, { submittedAt: -1 });
    }
    assertOwner(actor, row);
    return persistence.listSubmissionsFind3({ homeworkId: row._id, status: { $ne: 'UPLOADING' } }, { submittedAt: 1 });
  };
  const gradeSubmission = async (actor, id, data) => {
    const submission = await persistence.submissionFindById(objectId(id));
    if (!submission) throw new ApiError(404, 'Không tìm thấy bài nộp');
    const row = await getHomework(actor, submission.homeworkId); assertOwner(actor, row);
    const score = Number(data.score);
    if (!Number.isFinite(score) || score < 0 || score > row.maxScore) throw new ApiError(400, 'Điểm không hợp lệ');
    const feedback = typeof data.feedback === 'string' ? data.feedback.trim() : '';
    const updated = await persistence.updatedFindOneAndUpdate3({ _id: submission._id, status: 'SUBMITTED' }, { score, feedback, status: 'GRADED', gradedBy: actor._id, gradedAt: new Date() }, { new: true, runValidators: true });
    if (!updated) throw new ApiError(409, 'Bài nộp đã được chấm');
    return updated;
  };
  return { listHomeworks, getHomework, createHomework, updateHomework, publishHomework, closeHomework, submitHomework, listSubmissions, gradeSubmission, assertSubmissionOpen };
  
}

class HomeworkService {
  constructor(dependencies) {
    Object.assign(this, createHomeworkService(dependencies));
  }
}

module.exports = HomeworkService;
