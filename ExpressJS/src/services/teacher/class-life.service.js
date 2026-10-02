function createClassLifeService(dependencies) {
  const persistence = dependencies.persistence;
  const ApiError = require("../../utils/common/http/api-error.util");
  const { ROLES } = require("../../config/constants/roles.config");
  const { schoolScope, personalStudentIds, objectId, teacherClassScope } = dependencies.services["data-scope"];
  const { academicReferences, targetSchool } = dependencies.services["write-scope"];
  
  const managers = [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS];
  const teachers = [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER];
  const populate = [{ path: 'classId', select: 'name gradeLevel' }, { path: 'academicYearId', select: 'name startDate endDate' }, { path: 'organizerId', select: 'name code' }];
  const classScope = async actor => {
    const base = await schoolScope(actor); const clauses = [base];
    if ([ROLES.STUDENT, ROLES.PARENT].includes(actor.role)) {
      const ids = await personalStudentIds(actor); const children = await persistence.childrenFind({ _id: { $in: ids } });
      clauses.push({ classId: { $in: children.map(x => x.classId).filter(Boolean) } }, { status: 'PUBLISHED' });
    } else if (teachers.includes(actor.role)) clauses.push(await teacherClassScope(actor, 'class_activities'));
    return { $and: clauses };
  };
  const meetingScope = async actor => {
    const base = await schoolScope(actor); if (![ROLES.STUDENT, ROLES.PARENT].includes(actor.role)) return base;
    const ids = await personalStudentIds(actor); const children = await persistence.childrenFind2({ _id: { $in: ids } }); return { $and: [base, { classId: { $in: children.map(x => x.classId).filter(Boolean) } }, { status: { $ne: 'CANCELLED' } }] };
  };
  const assertOwner = (actor, row) => { const id = row.organizerId?._id || row.organizerId; if (managers.includes(actor.role) || String(id) === String(actor._id)) return; throw new ApiError(403, 'Khong co quyen thao tac'); };
  const refs = async (actor, data) => { const schoolId = await targetSchool(actor, data.schoolId); const cls = await academicReferences(actor, { classId: data.classId, academicYearId: data.academicYearId }, { homeroomAllowed: true, expectedSchoolId: schoolId }); const year = await persistence.yearFindById(cls.academicYearId); const scheduledAt = new Date(data.scheduledAt); if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt < year.startDate || scheduledAt > year.endDate) throw new ApiError(400, 'Thoi gian khong hop le'); return { schoolId, classId: cls._id, academicYearId: cls.academicYearId, scheduledAt }; };
  const listActivities = async (actor, query = {}) => { const filter = await classScope(actor); if (query.classId) filter.$and.push({ classId: objectId(query.classId) }); return persistence.listActivitiesFind(filter, populate, { scheduledAt: -1 }); };
  const createActivity = async (actor, data) => { if (![...managers, ...teachers].includes(actor.role)) throw new ApiError(403, 'Khong co quyen tao sinh hoat lop'); const r = await refs(actor, data); return persistence.createActivityCreate({ ...r, organizerId: actor._id, title: String(data.title || '').trim(), agenda: String(data.agenda || '').trim(), minutes: String(data.minutes || '').trim(), status: 'DRAFT' }); };
  const publishActivity = async (actor, id) => { const row = await persistence.rowFindOne({ _id: objectId(id), ...(await classScope(actor)) }); if (!row) throw new ApiError(404, 'Khong tim thay sinh hoat lop'); assertOwner(actor, row); if (row.status !== 'DRAFT') throw new ApiError(409, 'Da cong bo'); row.status = 'PUBLISHED'; return persistence.publishActivitySave(row); };
  const listMeetings = async actor => { const rows = await persistence.rowsFind(await meetingScope(actor), populate, { scheduledAt: 1 }); if (actor.role !== ROLES.PARENT) return rows; const responses = await persistence.responsesFind({ meetingId: { $in: rows.map(x => x._id) }, parentId: actor._id }); const map = new Map(responses.map(x => [String(x.meetingId), x])); return rows.map(x => ({ ...x.toObject(), response: map.get(String(x._id)) || null })); };
  const createMeeting = async (actor, data) => { if (![...managers, ...teachers].includes(actor.role)) throw new ApiError(403, 'Khong co quyen tao hop phu huynh'); const r = await refs(actor, data); return persistence.createMeetingCreate({ ...r, organizerId: actor._id, title: String(data.title || '').trim(), meetingUrl: String(data.meetingUrl || '').trim(), agenda: String(data.agenda || '').trim(), minutes: String(data.minutes || '').trim() }); };
  const cancelMeeting = async (actor, id) => { const row = await persistence.rowFindOne2({ _id: objectId(id), ...(await meetingScope(actor)) }); if (!row) throw new ApiError(404, 'Khong tim thay cuoc hop'); assertOwner(actor, row); if (row.status === 'CANCELLED') throw new ApiError(409, 'Da huy'); row.status = 'CANCELLED'; return persistence.cancelMeetingSave(row); };
  const rsvp = async (actor, id, data) => { if (actor.role !== ROLES.PARENT) throw new ApiError(403, 'Chi phu huynh duoc RSVP'); const row = await persistence.rowFindOne3({ _id: objectId(id), ...(await meetingScope(actor)) }); if (!row) throw new ApiError(404, 'Khong tim thay cuoc hop'); if (!['GOING', 'MAYBE', 'DECLINED'].includes(data.status)) throw new ApiError(400, 'Trang thai RSVP khong hop le'); return persistence.rsvpFindOneAndUpdate({ meetingId: row._id, parentId: actor._id }, { meetingId: row._id, schoolId: row.schoolId, parentId: actor._id, status: data.status, note: String(data.note || '').trim() }, { upsert: true, new: true, runValidators: true }); };
  return { listActivities, createActivity, publishActivity, listMeetings, createMeeting, cancelMeeting, rsvp };
  
}

class ClassLifeService {
  constructor(dependencies) {
    Object.assign(this, createClassLifeService(dependencies));
  }
}

module.exports = ClassLifeService;
