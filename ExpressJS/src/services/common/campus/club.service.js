function createClubService(dependencies) {
  const persistence = dependencies.persistence;
  const ApiError = require("../../../utils/common/http/api-error.util"); const Subject = "subject";
  const { ROLES } = require("../../../config/constants/roles.config"); const { schoolScope, personalStudentIds, objectId } = dependencies.services["data-scope"]; const { targetSchool, reference } = dependencies.services["write-scope"];
  const managers = [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS];
  const listClubs = async actor => persistence.listClubsFind(await schoolScope(actor), { name: 1 });
  const createClub = async (actor, data) => { if (!managers.includes(actor.role)) throw new ApiError(403, 'Khong co quyen tao CLB'); const schoolId = await targetSchool(actor, data.schoolId); if (!data.name?.trim()) throw new ApiError(400, 'Thieu ten CLB'); return persistence.createClubCreate({ schoolId, name: data.name.trim(), description: String(data.description || '').trim(), capacity: Number(data.capacity || 50), coordinatorId: actor._id, status: 'OPEN' }); };
  const register = async (actor, id) => { if (actor.role !== ROLES.STUDENT) throw new ApiError(403, 'Chi hoc sinh duoc dang ky CLB'); const club = await persistence.clubFindOne({ _id: objectId(id), ...(await schoolScope(actor)) }); if (!club) throw new ApiError(404, 'Khong tim thay CLB'); if (club.status !== 'OPEN') throw new ApiError(409, 'CLB da dong dang ky'); const count = await persistence.countCountDocuments({ clubId: club._id, status: 'REGISTERED' }); if (count >= club.capacity) throw new ApiError(409, 'CLB da du suc chua'); try { return await persistence.registerFindOneAndUpdate({ clubId: club._id, studentId: actor._id }, { clubId: club._id, schoolId: club.schoolId, studentId: actor._id, status: 'REGISTERED' }, { upsert: true, new: true, runValidators: true }); } catch (e) { if (e.code === 11000) throw new ApiError(409, 'Da dang ky CLB'); throw e; } };
  const cancelRegistration = async (actor, id) => { if (actor.role !== ROLES.STUDENT) throw new ApiError(403, 'Chi hoc sinh duoc huy dang ky'); const row = await persistence.rowFindOne({ _id: objectId(id), studentId: actor._id }); if (!row) throw new ApiError(404, 'Khong tim thay dang ky'); row.status = 'CANCELLED'; return persistence.cancelRegistrationSave(row); };
  const listRegistrations = async actor => { const ids = await personalStudentIds(actor); const filter = ids ? { schoolId: (await schoolScope(actor)).schoolId, studentId: { $in: ids } } : await schoolScope(actor); return persistence.listRegistrationsFind(filter, { createdAt: -1 }); };
  const retakeScope = async actor => { const filter = await schoolScope(actor); const ids = await personalStudentIds(actor); return ids ? { ...filter, studentId: { $in: ids } } : filter; };
  const listRetakes = async actor => persistence.listRetakesFind(await retakeScope(actor), { createdAt: -1 });
  const createRetake = async (actor, data) => {
    if (actor.role !== ROLES.STUDENT) throw new ApiError(403, 'Chi hoc sinh duoc tao yeu cau');
    const requestType = data.requestType || 'RETAKE_EXAM';
    if (!['RETAKE_EXAM', 'REPEAT_COURSE'].includes(requestType)) throw new ApiError(400, 'Loai yeu cau khong hop le');
    const student = await persistence.studentFindById(actor._id);
    if (!student?.classId) throw new ApiError(400, 'Hoc sinh chua co lop');
    const cls = await persistence.clsFindOne({ _id: student.classId, schoolId: student.schoolId });
    if (!cls) throw new ApiError(403, 'Lop khong thuoc truong');
    const yearId = objectId(data.academicYearId || cls.academicYearId);
    if (String(yearId) !== String(cls.academicYearId)) throw new ApiError(400, 'Nam hoc khong thuoc lop');
    const subjectId = objectId(data.subjectId, 'subjectId');
    await reference(Subject, subjectId, student.schoolId);
    if (!data.reason?.trim()) throw new ApiError(400, 'Can neu ly do');
    const existing = await persistence.existingFindOne({ studentId: actor._id, subjectId, academicYearId: yearId, requestType, status: { $in: ['REQUESTED', 'APPROVED'] } });
    if (existing) throw new ApiError(409, 'Da co yeu cau dang xu ly');
    return persistence.createRetakeCreate({ schoolId: student.schoolId, studentId: actor._id, subjectId, academicYearId: yearId, requestType, reason: data.reason.trim() });
  };
  const reviewRetake = async (actor, id, data) => { if (!managers.includes(actor.role)) throw new ApiError(403, 'Khong co quyen duyet yeu cau'); const row = await persistence.rowFindOne2({ _id: objectId(id), ...(await schoolScope(actor)) }); if (!row) throw new ApiError(404, 'Khong tim thay yeu cau'); if (row.status !== 'REQUESTED') throw new ApiError(409, 'Yeu cau da duoc xu ly'); if (!['APPROVED', 'REJECTED'].includes(data.status)) throw new ApiError(400, 'Trang thai khong hop le'); row.status = data.status; row.reviewedBy = actor._id; row.reviewedAt = new Date(); row.reviewNote = String(data.reviewNote || '').trim(); return persistence.reviewRetakeSave(row); };
  return { listClubs, createClub, register, cancelRegistration, listRegistrations, listRetakes, createRetake, reviewRetake };
  
}

class ClubService {
  constructor(dependencies) {
    Object.assign(this, createClubService(dependencies));
  }
}

module.exports = ClubService;
