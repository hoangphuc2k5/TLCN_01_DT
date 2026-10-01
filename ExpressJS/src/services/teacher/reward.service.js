function createRewardService(dependencies) {
  const persistence = dependencies.persistence;
  const ApiError = require("../../utils/common/api-error.util");
  const User = "user";
  const { ROLES } = require("../../config/constants/roles.config");
  const { objectId, schoolScope, personalStudentIds, teacherClassScope } = dependencies.services["data-scope"];
  const { academicReferences, scopedDocument } = dependencies.services["write-scope"];
  
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
    return persistence.listFind(filter, { awardedAt: -1 });
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
    return persistence.createCreate({
      schoolId: cls.schoolId, academicYearId: cls.academicYearId, studentId: student._id, classId: cls._id,
      type, title: String(data.title).trim(), description: String(data.description || '').trim(), points,
      awardedAt: data.awardedAt || new Date(), status, recordedBy: actor._id,
      reviewedBy: status === 'APPROVED' ? actor._id : null, reviewedAt: status === 'APPROVED' ? new Date() : null,
    });
  };
  
  const review = async (actor, id, data = {}) => {
    if (!REVIEWERS.includes(actor.role)) throw new ApiError(403, 'Chỉ quản lý được duyệt khen thưởng/kỷ luật');
    const row = await persistence.rowFindOne({ _id: objectId(id), ...(await schoolScope(actor)) });
    if (!row) throw new ApiError(404, 'Không tìm thấy bản ghi');
    if (!['PENDING'].includes(row.status)) throw new ApiError(409, 'Bản ghi đã được xử lý');
    const status = String(data.status || '').toUpperCase();
    if (!['APPROVED', 'REJECTED'].includes(status)) throw new ApiError(400, 'Trạng thái duyệt không hợp lệ');
    row.status = status; row.reviewedBy = actor._id; row.reviewedAt = new Date(); row.reviewNote = String(data.reviewNote || '').trim();
    return persistence.reviewSave(row);
  };
  
  return { list, create, review };
  
}

class RewardService {
  constructor(dependencies) {
    Object.assign(this, createRewardService(dependencies));
  }
}

module.exports = RewardService;
