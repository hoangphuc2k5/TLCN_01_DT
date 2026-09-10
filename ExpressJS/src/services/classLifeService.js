const ApiError = require('../utils/ApiError');
const ClassActivity = require('../models/ClassActivity');
const ParentMeeting = require('../models/ParentMeeting');
const ParentMeetingResponse = require('../models/ParentMeetingResponse');
const User = require('../models/User');
const { ROLES } = require('../constants/roles');
const { schoolScope, personalStudentIds, objectId, teacherClassScope } = require('./dataScope');
const { academicReferences, targetSchool } = require('./writeScope');

const managers = [ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS];
const teachers = [ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER];
const populate = [{ path: 'classId', select: 'name gradeLevel' }, { path: 'academicYearId', select: 'name startDate endDate' }, { path: 'organizerId', select: 'name code' }];
const classScope = async actor => {
  const base = await schoolScope(actor); const clauses = [base];
  if ([ROLES.STUDENT, ROLES.PARENT].includes(actor.role)) {
    const ids = await personalStudentIds(actor); const children = await User.find({ _id: { $in: ids } }).select('classId');
    clauses.push({ classId: { $in: children.map(x => x.classId).filter(Boolean) } }, { status: 'PUBLISHED' });
  } else if (teachers.includes(actor.role)) clauses.push(await teacherClassScope(actor, 'class_activities'));
  return { $and: clauses };
};
const meetingScope = async actor => {
  const base = await schoolScope(actor); if (![ROLES.STUDENT, ROLES.PARENT].includes(actor.role)) return base;
  const ids = await personalStudentIds(actor); const children = await User.find({ _id: { $in: ids } }).select('classId'); return { $and: [base, { classId: { $in: children.map(x => x.classId).filter(Boolean) } }, { status: { $ne: 'CANCELLED' } }] };
};
const assertOwner = (actor, row) => { const id = row.organizerId?._id || row.organizerId; if (managers.includes(actor.role) || String(id) === String(actor._id)) return; throw new ApiError(403, 'Khong co quyen thao tac'); };
const refs = async (actor, data) => { const schoolId = await targetSchool(actor, data.schoolId); const cls = await academicReferences(actor, { classId: data.classId, academicYearId: data.academicYearId }, { homeroomAllowed: true, expectedSchoolId: schoolId }); const year = await require('../models/AcademicYear').findById(cls.academicYearId); const scheduledAt = new Date(data.scheduledAt); if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt < year.startDate || scheduledAt > year.endDate) throw new ApiError(400, 'Thoi gian khong hop le'); return { schoolId, classId: cls._id, academicYearId: cls.academicYearId, scheduledAt }; };
const listActivities = async (actor, query = {}) => { const filter = await classScope(actor); if (query.classId) filter.$and.push({ classId: objectId(query.classId) }); return ClassActivity.find(filter).populate(populate).sort({ scheduledAt: -1 }).limit(300); };
const createActivity = async (actor, data) => { if (![...managers, ...teachers].includes(actor.role)) throw new ApiError(403, 'Khong co quyen tao sinh hoat lop'); const r = await refs(actor, data); return ClassActivity.create({ ...r, organizerId: actor._id, title: String(data.title || '').trim(), agenda: String(data.agenda || '').trim(), minutes: String(data.minutes || '').trim(), status: 'DRAFT' }); };
const publishActivity = async (actor, id) => { const row = await ClassActivity.findOne({ _id: objectId(id), ...(await classScope(actor)) }); if (!row) throw new ApiError(404, 'Khong tim thay sinh hoat lop'); assertOwner(actor, row); if (row.status !== 'DRAFT') throw new ApiError(409, 'Da cong bo'); row.status = 'PUBLISHED'; return row.save(); };
const listMeetings = async actor => { const rows = await ParentMeeting.find(await meetingScope(actor)).populate(populate).sort({ scheduledAt: 1 }).limit(200); if (actor.role !== ROLES.PARENT) return rows; const responses = await ParentMeetingResponse.find({ meetingId: { $in: rows.map(x => x._id) }, parentId: actor._id }).lean(); const map = new Map(responses.map(x => [String(x.meetingId), x])); return rows.map(x => ({ ...x.toObject(), response: map.get(String(x._id)) || null })); };
const createMeeting = async (actor, data) => { if (![...managers, ...teachers].includes(actor.role)) throw new ApiError(403, 'Khong co quyen tao hop phu huynh'); const r = await refs(actor, data); return ParentMeeting.create({ ...r, organizerId: actor._id, title: String(data.title || '').trim(), meetingUrl: String(data.meetingUrl || '').trim(), agenda: String(data.agenda || '').trim(), minutes: String(data.minutes || '').trim() }); };
const cancelMeeting = async (actor, id) => { const row = await ParentMeeting.findOne({ _id: objectId(id), ...(await meetingScope(actor)) }); if (!row) throw new ApiError(404, 'Khong tim thay cuoc hop'); assertOwner(actor, row); if (row.status === 'CANCELLED') throw new ApiError(409, 'Da huy'); row.status = 'CANCELLED'; return row.save(); };
const rsvp = async (actor, id, data) => { if (actor.role !== ROLES.PARENT) throw new ApiError(403, 'Chi phu huynh duoc RSVP'); const row = await ParentMeeting.findOne({ _id: objectId(id), ...(await meetingScope(actor)) }); if (!row) throw new ApiError(404, 'Khong tim thay cuoc hop'); if (!['GOING', 'MAYBE', 'DECLINED'].includes(data.status)) throw new ApiError(400, 'Trang thai RSVP khong hop le'); return ParentMeetingResponse.findOneAndUpdate({ meetingId: row._id, parentId: actor._id }, { meetingId: row._id, schoolId: row.schoolId, parentId: actor._id, status: data.status, note: String(data.note || '').trim() }, { upsert: true, new: true, runValidators: true }); };
module.exports = { listActivities, createActivity, publishActivity, listMeetings, createMeeting, cancelMeeting, rsvp };
