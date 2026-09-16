const Attendance = require('../models/Attendance');
const FeeInvoice = require('../models/FeeInvoice');
const Grade = require('../models/Grade');
const Homework = require('../models/Homework');
const HomeworkSubmission = require('../models/HomeworkSubmission');
const User = require('../models/User');
const { ATTENDANCE_STATUS, FEE_STATUS } = require('../constants/status');
const { ROLES } = require('../constants/roles');
const { schoolScope, personalStudentIds, teacherClassScope } = require('./dataScope');

const personalRoles = new Set([ROLES.STUDENT, ROLES.PARENT]);
const teacherRoles = new Set([ROLES.SUBJECT_TEACHER, ROLES.HOMEROOM_TEACHER]);
const feeStatuses = [FEE_STATUS.UNPAID, FEE_STATUS.PARTIAL, FEE_STATUS.PAID, FEE_STATUS.OVERDUE];

const percent = (part, total) => total ? Math.round((part / total) * 1000) / 10 : 0;
const clauses = (...items) => ({ $and: items.filter(Boolean) });

const scopedStudentIds = async (actor) => {
  const ids = await personalStudentIds(actor);
  return ids === null ? null : ids;
};

const attendanceFilter = async (actor) => {
  const base = await schoolScope(actor);
  if (personalRoles.has(actor.role)) return { document: base, studentIds: await scopedStudentIds(actor) };
  if (teacherRoles.has(actor.role)) {
    return {
      document: clauses(base, await teacherClassScope(actor, 'attendance'), { teacherId: actor._id }),
      studentIds: null,
    };
  }
  return { document: base, studentIds: null };
};

const gradeFilter = async (actor) => {
  const base = await schoolScope(actor);
  if (personalRoles.has(actor.role)) return clauses(base, { studentId: { $in: await scopedStudentIds(actor) } });
  if (teacherRoles.has(actor.role)) return clauses(base, await teacherClassScope(actor, 'grades'), { teacherId: actor._id });
  return base;
};

const feeFilter = async (actor) => {
  const base = await schoolScope(actor);
  if (personalRoles.has(actor.role)) return clauses(base, { studentId: { $in: await scopedStudentIds(actor) } });
  return base;
};

const assignmentFilters = async (actor) => {
  const base = await schoolScope(actor);
  if (personalRoles.has(actor.role)) {
    const ids = await scopedStudentIds(actor);
    const students = await User.find({ _id: { $in: ids } }).select('classId').lean();
    return {
      homework: clauses(base, { classId: { $in: students.map(student => student.classId).filter(Boolean) } }, { status: { $in: ['PUBLISHED', 'CLOSED'] } }),
      studentIds: ids,
    };
  }
  if (teacherRoles.has(actor.role)) return { homework: clauses(base, { teacherId: actor._id }), studentIds: null };
  return { homework: base, studentIds: null };
};

const buildAttendance = async (actor) => {
  const { document, studentIds } = await attendanceFilter(actor);
  const recordMatch = studentIds ? { 'records.studentId': { $in: studentIds } } : {};
  const statusRows = await Attendance.aggregate([
    { $match: clauses(document, recordMatch) },
    { $unwind: '$records' },
    ...(studentIds ? [{ $match: { 'records.studentId': { $in: studentIds } } }] : []),
    { $group: { _id: '$records.status', value: { $sum: 1 } } },
  ]);
  const counts = Object.fromEntries(statusRows.map(row => [row._id, row.value]));
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const trend = await Attendance.aggregate([
    { $match: clauses(document, recordMatch) },
    { $unwind: '$records' },
    ...(studentIds ? [{ $match: { 'records.studentId': { $in: studentIds } } }] : []),
    { $group: {
      _id: { date: { $dateToString: { date: '$date', format: '%Y-%m-%d', timezone: 'Asia/Ho_Chi_Minh' } }, status: '$records.status' },
      value: { $sum: 1 },
    } },
    { $sort: { '_id.date': -1 } },
    { $limit: 120 },
  ]);
  const byDate = new Map();
  for (const row of trend) {
    const value = byDate.get(row._id.date) || { date: row._id.date, total: 0, present: 0, absent: 0, late: 0 };
    value.total += row.value;
    if (row._id.status === ATTENDANCE_STATUS.PRESENT) value.present += row.value;
    else if (row._id.status === ATTENDANCE_STATUS.LATE) value.late += row.value;
    else value.absent += row.value;
    byDate.set(row._id.date, value);
  }
  return {
    total,
    present: counts[ATTENDANCE_STATUS.PRESENT] || 0,
    absentExcused: counts[ATTENDANCE_STATUS.ABSENT_EXCUSED] || 0,
    absentUnexcused: counts[ATTENDANCE_STATUS.ABSENT_UNEXCUSED] || 0,
    late: counts[ATTENDANCE_STATUS.LATE] || 0,
    attendanceRate: percent((counts[ATTENDANCE_STATUS.PRESENT] || 0) + (counts[ATTENDANCE_STATUS.LATE] || 0), total),
    trend: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-30),
  };
};

const buildFees = async (actor) => {
  const rows = await FeeInvoice.aggregate([
    { $match: await feeFilter(actor) },
    { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' }, paidAmount: { $sum: '$paidAmount' } } },
  ]);
  const byStatus = new Map(rows.map(row => [row._id, row]));
  const statuses = feeStatuses.map(status => {
    const row = byStatus.get(status) || {};
    return { status, count: row.count || 0, amount: row.amount || 0, paidAmount: row.paidAmount || 0 };
  });
  const billed = statuses.reduce((sum, row) => sum + row.amount, 0);
  const paid = statuses.reduce((sum, row) => sum + row.paidAmount, 0);
  return { invoiceCount: statuses.reduce((sum, row) => sum + row.count, 0), billed, paid, outstanding: Math.max(0, billed - paid), collectionRate: percent(paid, billed), statuses };
};

const buildGrades = async (actor) => {
  const rows = await Grade.find(await gradeFilter(actor)).select('average').lean();
  const scores = rows.map(row => row.average).filter(score => typeof score === 'number');
  const distribution = [
    { key: 'excellent', label: 'Từ 8.0', value: scores.filter(score => score >= 8).length },
    { key: 'good', label: '6.5–7.9', value: scores.filter(score => score >= 6.5 && score < 8).length },
    { key: 'average', label: '5.0–6.4', value: scores.filter(score => score >= 5 && score < 6.5).length },
    { key: 'needsImprovement', label: 'Dưới 5.0', value: scores.filter(score => score < 5).length },
  ];
  return { sheetCount: rows.length, scoredCount: scores.length, average: scores.length ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100) / 100 : null, distribution };
};

const buildAssignments = async (actor) => {
  const { homework, studentIds } = await assignmentFilters(actor);
  const assignments = await Homework.find(homework).select('_id').lean();
  const ids = assignments.map(assignment => assignment._id);
  if (!ids.length) return { assignments: 0, submitted: 0, graded: 0, pendingUploads: 0 };
  const submissionFilter = { homeworkId: { $in: ids }, ...(studentIds ? { studentId: { $in: studentIds } } : {}) };
  const rows = await HomeworkSubmission.aggregate([
    { $match: submissionFilter },
    { $group: { _id: '$status', value: { $sum: 1 } } },
  ]);
  const totals = Object.fromEntries(rows.map(row => [row._id, row.value]));
  return {
    assignments: assignments.length,
    submitted: (totals.SUBMITTED || 0) + (totals.GRADED || 0),
    graded: totals.GRADED || 0,
    pendingUploads: totals.UPLOADING || 0,
  };
};

const buildDashboardAnalytics = async (actor, access = {}) => {
  const tasks = [];
  if (access.attendance) tasks.push(buildAttendance(actor).then(value => ['attendance', value]));
  if (access.fees) tasks.push(buildFees(actor).then(value => ['fees', value]));
  if (access.grades) tasks.push(buildGrades(actor).then(value => ['grades', value]));
  if (access.assignments) tasks.push(buildAssignments(actor).then(value => ['assignments', value]));
  return Object.fromEntries(await Promise.all(tasks));
};

module.exports = { buildDashboardAnalytics };
