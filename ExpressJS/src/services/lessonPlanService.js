const ApiError = require('../utils/ApiError');
const LessonPlan = require('../models/LessonPlan');
const Notification = require('../models/Notification');
const TeacherAssignment = require('../models/TeacherAssignment');
const { ROLES } = require('../constants/roles');
const { objectId, schoolScope } = require('./dataScope');
const { academicReferences, targetSchool } = require('./writeScope');

const EDITABLE = ['title', 'classId', 'subjectId', 'academicYearId', 'lessonDate', 'durationMinutes', 'objectives', 'preparation', 'content', 'activities'];
const POPULATE = [
  { path: 'classId', select: 'name gradeLevel' },
  { path: 'subjectId', select: 'name code' },
  { path: 'academicYearId', select: 'name startDate endDate' },
  { path: 'teacherId', select: 'name code' },
  { path: 'reviewedBy', select: 'name role' },
  { path: 'reviews.reviewedBy', select: 'name role' },
];

const cleanText = (value) => String(value || '').trim();
const normalizeActivities = (activities = []) => {
  if (!Array.isArray(activities) || activities.length > 20) throw new ApiError(400, 'Danh sách hoạt động không hợp lệ');
  return activities.map((activity, index) => {
    const title = cleanText(activity?.title);
    const durationMinutes = Number(activity?.durationMinutes);
    if (!title || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 240) {
      throw new ApiError(400, `Hoạt động ${index + 1} không hợp lệ`);
    }
    return {
      title,
      durationMinutes,
      teacherActivities: cleanText(activity.teacherActivities),
      studentActivities: cleanText(activity.studentActivities),
      assessment: cleanText(activity.assessment),
    };
  });
};

const scope = async (actor, query = {}) => {
  const clauses = [await schoolScope(actor)];
  const canReview = actor.role === ROLES.SUPER_ADMIN || await require('./rolePermissionCache').canAccess(actor.role, 'lesson_plans', 'execute');
  if (!canReview) clauses.push({ teacherId: actor._id });
  if (query.status) {
    const status = String(query.status).toUpperCase();
    if (!['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].includes(status)) throw new ApiError(400, 'Trạng thái giáo án không hợp lệ');
    clauses.push({ status });
  }
  if (query.classId) clauses.push({ classId: objectId(query.classId, 'classId') });
  if (query.subjectId) clauses.push({ subjectId: objectId(query.subjectId, 'subjectId') });
  return { $and: clauses };
};

const list = async (actor, query = {}) => LessonPlan.find(await scope(actor, query))
  .populate(POPULATE).sort({ submittedAt: -1, createdAt: -1 }).limit(300);

const get = async (actor, id) => {
  const row = await LessonPlan.findOne({ ...(await scope(actor)), _id: objectId(id) }).populate(POPULATE);
  if (!row) throw new ApiError(404, 'Không tìm thấy giáo án trong phạm vi');
  return row;
};

const validateReferences = async (actor, data, expectedSchoolId) => {
  const schoolId = await targetSchool(actor, expectedSchoolId || data.schoolId);
  const cls = await academicReferences(actor, data, { expectedSchoolId: schoolId });
  const assigned = await TeacherAssignment.exists({
    schoolId, teacherId: actor._id, classId: cls._id,
    subjectId: objectId(data.subjectId, 'subjectId'), academicYearId: cls.academicYearId,
  });
  if (!assigned) throw new ApiError(403, 'Không được phân công lớp/môn/năm học này');
  const lessonDate = data.lessonDate ? new Date(data.lessonDate) : null;
  if (lessonDate && !Number.isFinite(lessonDate.getTime())) throw new ApiError(400, 'Ngày dạy không hợp lệ');
  const year = await require('../models/AcademicYear').findOne({ _id: cls.academicYearId, schoolId });
  if (lessonDate && (lessonDate < year.startDate || lessonDate > year.endDate)) throw new ApiError(400, 'Ngày dạy nằm ngoài năm học');
  return { schoolId, classId: cls._id, subjectId: objectId(data.subjectId, 'subjectId'), academicYearId: cls.academicYearId, lessonDate };
};

const normalizeDraft = (data, refs) => {
  const durationMinutes = data.durationMinutes === undefined ? 45 : Number(data.durationMinutes);
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 300) throw new ApiError(400, 'Thời lượng phải từ 1 đến 300 phút');
  const title = cleanText(data.title);
  if (!title) throw new ApiError(400, 'Thiếu tiêu đề giáo án');
  return {
    ...refs,
    title,
    durationMinutes,
    objectives: cleanText(data.objectives),
    preparation: cleanText(data.preparation),
    content: cleanText(data.content),
    activities: normalizeActivities(data.activities || []),
  };
};

const assertOwner = (actor, row) => {
  if (String(row.teacherId?._id || row.teacherId) !== String(actor._id)) {
    throw new ApiError(403, 'Chỉ giáo viên soạn giáo án được thao tác');
  }
};

const create = async (actor, data = {}) => {
  const refs = await validateReferences(actor, data);
  return LessonPlan.create({ ...normalizeDraft(data, refs), teacherId: actor._id, status: 'DRAFT' });
};

const update = async (actor, id, data = {}) => {
  const row = await get(actor, id);
  assertOwner(actor, row);
  if (!['DRAFT', 'REJECTED'].includes(row.status)) throw new ApiError(409, 'Chỉ sửa được giáo án nháp hoặc bị từ chối');
  const current = row.toObject({ depopulate: true });
  const merged = { ...current, ...Object.fromEntries(EDITABLE.filter(key => data[key] !== undefined).map(key => [key, data[key]])) };
  const refs = await validateReferences(actor, merged, row.schoolId);
  const updated = await LessonPlan.findOneAndUpdate(
    { _id: row._id, teacherId: actor._id, status: row.status },
    { $set: normalizeDraft(merged, refs) },
    { new: true, runValidators: true },
  );
  if (!updated) throw new ApiError(409, 'Trạng thái giáo án vừa thay đổi');
  return updated;
};

const validateSubmission = (row) => {
  if (!cleanText(row.objectives) || !cleanText(row.content) || !row.activities.length) {
    throw new ApiError(400, 'Cần mục tiêu, nội dung và ít nhất một hoạt động trước khi gửi duyệt');
  }
  const activityMinutes = row.activities.reduce((sum, item) => sum + item.durationMinutes, 0);
  if (activityMinutes > row.durationMinutes) throw new ApiError(400, 'Tổng thời lượng hoạt động vượt thời lượng tiết dạy');
};

const submit = async (actor, id) => {
  const row = await get(actor, id);
  assertOwner(actor, row);
  if (!['DRAFT', 'REJECTED'].includes(row.status)) throw new ApiError(409, 'Giáo án không ở trạng thái có thể gửi duyệt');
  validateSubmission(row);
  const updated = await LessonPlan.findOneAndUpdate(
    { _id: row._id, status: row.status },
    { $set: { status: 'SUBMITTED', submittedAt: new Date(), reviewedBy: null, reviewedAt: null, reviewNote: '' }, $inc: { revision: 1 } },
    { new: true, runValidators: true },
  );
  if (!updated) throw new ApiError(409, 'Trạng thái giáo án vừa thay đổi');
  return updated;
};

const review = async (actor, id, data = {}) => {
  const row = await LessonPlan.findOne({ _id: objectId(id), ...(await schoolScope(actor)) });
  if (!row) throw new ApiError(404, 'Không tìm thấy giáo án trong phạm vi');
  if (String(row.teacherId) === String(actor._id)) throw new ApiError(403, 'Không được tự duyệt giáo án');
  const status = String(data.status || '').toUpperCase();
  const note = cleanText(data.reviewNote);
  if (!['APPROVED', 'REJECTED'].includes(status)) throw new ApiError(400, 'Kết quả duyệt không hợp lệ');
  if (status === 'REJECTED' && !note) throw new ApiError(400, 'Cần ghi lý do từ chối');
  const now = new Date();
  const updated = await LessonPlan.findOneAndUpdate(
    { _id: row._id, status: 'SUBMITTED', revision: row.revision },
    {
      $set: { status, reviewedBy: actor._id, reviewedAt: now, reviewNote: note },
      $push: { reviews: { revision: row.revision, status, note, reviewedBy: actor._id, reviewedAt: now } },
    },
    { new: true, runValidators: true },
  );
  if (!updated) throw new ApiError(409, 'Giáo án đã được xử lý hoặc vừa thay đổi');
  await Notification.create({
    userId: row.teacherId,
    schoolId: row.schoolId,
    title: 'Kết quả duyệt giáo án',
    message: `Giáo án “${row.title}” đã ${status === 'APPROVED' ? 'được duyệt' : 'bị từ chối'}.`,
    type: status === 'APPROVED' ? 'SUCCESS' : 'WARNING',
    meta: { lessonPlanId: row._id, revision: row.revision, status },
  });
  return updated;
};

const remove = async (actor, id) => {
  const row = await get(actor, id);
  assertOwner(actor, row);
  if (!['DRAFT', 'REJECTED'].includes(row.status)) throw new ApiError(409, 'Chỉ xóa được giáo án nháp hoặc bị từ chối');
  const result = await LessonPlan.deleteOne({ _id: row._id, teacherId: actor._id, status: row.status });
  if (result.deletedCount !== 1) throw new ApiError(409, 'Trạng thái giáo án vừa thay đổi');
  return { id: row._id };
};

module.exports = { list, get, create, update, submit, review, remove };
