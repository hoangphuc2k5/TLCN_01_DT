const ApiError = require('../utils/ApiError');
const Reward = require('../models/RewardDisciplineRecord');
const User = require('../models/User');
const { ROLES } = require('../constants/roles');
const { objectId, schoolScope, personalStudentIds, teacherClassScope } = require('./dataScope');
const { academicReferences, scopedDocument } = require('./writeScope');

const TEACHERS = [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER];
const REVIEWERS = [ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS];

const list = async (actor, query = {}) => {
  const filter = { $and: [await schoolScope(actor)] };
  if (query.studentId) filter.$and.push({ studentId: objectId(query.studentId, 'studentId') });
  if (query.type) {
    const type = String(query.type).toUpperCase();
    if (!['REWARD', 'DISCIPLINE'].includes(type)) throw new ApiError(400, 'Loại bản ghi không hợp lệ');
    filter.$and.push({ type });
  }
  if (query.status) filter.$and.push({ status: String(query.status).toUpperCase() });
  const personal = await personalStudentIds(actor);
  if (personal !== null) filter.$and.push({ studentId: { $in: personal }, status: 'APPROVED' });
  if (TEACHERS.includes(actor.role)) filter.$and.push(await teacherClassScope(actor, 'conduct'));
  return Reward.find(filter)
    .populate('studentId', 'name code')
    .populate('classId', 'name')
    .populate('academicYearId', 'name')
    .populate('recordedBy', 'name role')
    .populate('reviewedBy', 'name')
    .sort({ awardedAt: -1 }).limit(300);
};

const create = async (actor, data = {}) => {
  if (!data.studentId || !data.academicYearId || !data.classId || !data.type || !data.title) throw new ApiError(400, 'Thiếu học sinh, lớp, năm học, loại hoặc tiêu đề');
  const type = String(data.type).toUpperCase();
  if (!['REWARD', 'DISCIPLINE'].includes(type)) throw new ApiError(400, 'Loại bản ghi không hợp lệ');
  const student = await scopedDocument(User, actor, data.studentId);
  if (student.role !== ROLES.STUDENT) throw new ApiError(400, 'Cần tài khoản học sinh');
  const cls = await academicReferences(actor, { ...data, classId: data.classId, studentId: data.studentId }, { homeroomAllowed: true });
  const points = Number(data.points || 0);
  if (!Number.isInteger(points) || points < -100 || points > 100) throw new ApiError(400, 'Điểm phải là số nguyên từ -100 đến 100');
  const status = REVIEWERS.includes(actor.role) ? 'APPROVED' : 'PENDING';
  return Reward.create({
    schoolId: cls.schoolId, academicYearId: cls.academicYearId, studentId: student._id, classId: cls._id,
    type, title: String(data.title).trim(), description: String(data.description || '').trim(), points,
    awardedAt: data.awardedAt || new Date(), status, recordedBy: actor._id,
    reviewedBy: status === 'APPROVED' ? actor._id : null, reviewedAt: status === 'APPROVED' ? new Date() : null,
  });
};

const review = async (actor, id, data = {}) => {
  if (!REVIEWERS.includes(actor.role)) throw new ApiError(403, 'Chỉ quản lý được duyệt khen thưởng/kỷ luật');
  const row = await Reward.findOne({ _id: objectId(id), ...(await schoolScope(actor)) });
  if (!row) throw new ApiError(404, 'Không tìm thấy bản ghi');
  if (!['PENDING'].includes(row.status)) throw new ApiError(409, 'Bản ghi đã được xử lý');
  const status = String(data.status || '').toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(status)) throw new ApiError(400, 'Trạng thái duyệt không hợp lệ');
  row.status = status; row.reviewedBy = actor._id; row.reviewedAt = new Date(); row.reviewNote = String(data.reviewNote || '').trim();
  return row.save();
};

module.exports = { list, create, review };
