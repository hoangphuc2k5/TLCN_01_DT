const ApiError = require('../utils/ApiError');
const School = require('../models/School'); const User = require('../models/User'); const Class = require('../models/Class'); const Grade = require('../models/Grade'); const FeeInvoice = require('../models/FeeInvoice'); const Attendance = require('../models/Attendance'); const XLSX = require('xlsx');
const { schoolScope, objectId } = require('./dataScope');

const compare = async (actor, query = {}) => {
  const raw = Array.isArray(query.schoolIds) ? query.schoolIds : String(query.schoolIds || '').split(',').filter(Boolean);
  const ids = [...new Set(raw.map(value => String(objectId(value, 'schoolId'))))];
  if (ids.length < 2 || ids.length > 20) throw new ApiError(400, 'Can it nhat 2 va toi da 20 truong');
  const scope = await schoolScope(actor); const schoolScopeFilter = scope.schoolId ? { _id: scope.schoolId } : scope.clusterId ? { clusterId: scope.clusterId } : {}; const schools = await School.find({ ...schoolScopeFilter, _id: { $in: ids } }).select('name code subdomain status').lean();
  if (schools.length !== ids.length) throw new ApiError(403, 'Co truong ngoai pham vi');
  const objectIds = schools.map(item => item._id);
  const [users, classes, grades, fees, attendance] = await Promise.all([
    User.aggregate([{ $match: { schoolId: { $in: objectIds }, status: 'ACTIVE' } }, { $group: { _id: { schoolId: '$schoolId', role: '$role' }, count: { $sum: 1 } } }]),
    Class.aggregate([{ $match: { schoolId: { $in: objectIds } } }, { $group: { _id: '$schoolId', count: { $sum: 1 } } }]),
    Grade.aggregate([{ $match: { schoolId: { $in: objectIds }, average: { $ne: null } } }, { $group: { _id: '$schoolId', average: { $avg: '$average' }, count: { $sum: 1 } } }]),
    FeeInvoice.aggregate([{ $match: { schoolId: { $in: objectIds } } }, { $group: { _id: '$schoolId', billed: { $sum: '$amount' }, paid: { $sum: '$paidAmount' } } }]),
    Attendance.aggregate([{ $match: { schoolId: { $in: objectIds } } }, { $unwind: '$records' }, { $group: { _id: { schoolId: '$schoolId', status: '$records.status' }, count: { $sum: 1 } } }]),
  ]);
  const by = (list, id) => list.find(item => String(item._id?.schoolId || item._id) === String(id));
  const countRoles = (id, roles) => users.filter(item => String(item._id.schoolId) === String(id) && roles.includes(item._id.role)).reduce((total, item) => total + item.count, 0);
  return schools.map(school => {
    const fee = by(fees, school._id); const grade = by(grades, school._id);
    const attendanceRows = attendance.filter(item => String(item._id.schoolId) === String(school._id));
    const attendanceRecords = attendanceRows.reduce((total, item) => total + item.count, 0);
    const presentCount = attendanceRows.filter(item => item._id.status === 'PRESENT').reduce((total, item) => total + item.count, 0);
    const absentCount = attendanceRows.filter(item => ['ABSENT_EXCUSED', 'ABSENT_UNEXCUSED'].includes(item._id.status)).reduce((total, item) => total + item.count, 0);
    return { school, students: countRoles(school._id, ['STUDENT']), teachers: countRoles(school._id, ['SUBJECT_TEACHER', 'HOMEROOM_TEACHER']), classes: by(classes, school._id)?.count || 0, gradeAverage: grade?.average || null, gradeSheets: grade?.count || 0, billedAmount: fee?.billed || 0, paidAmount: fee?.paid || 0, outstandingAmount: Math.max(0, (fee?.billed || 0) - (fee?.paid || 0)), attendanceRecords, presentCount, absentCount, attendanceRate: attendanceRecords ? Number((presentCount / attendanceRecords * 100).toFixed(2)) : null };
  });
};

const pdfEscape = value => String(value ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[\r\n]+/g, ' ');
const createPdf = rows => {
  const lines = ['Bao cao doi chieu lien truong', 'Truong | Hoc sinh | Giao vien | Lop | Diem TB | Ty le co mat | No con lai', ...rows.map(row => `${row.school.code} | ${row.students} | ${row.teachers} | ${row.classes} | ${row.gradeAverage ?? '-'} | ${row.attendanceRate == null ? '-' : `${row.attendanceRate}%`} | ${row.outstandingAmount}`)];
  const content = `BT\n/F1 9 Tf\n36 800 Td\n${lines.map((line, index) => `${index ? '0 -16 Td\n' : ''}(${pdfEscape(line)}) Tj\n`).join('')}ET\n`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets[index + 1] = Buffer.byteLength(pdf, 'binary'); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf, 'binary'); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'binary');
};

const exportExcel = async (actor, query) => {
  const rows = await compare(actor, query);
  const data = rows.map(row => ({ Truong: row.school.name, MaTruong: row.school.code, HocSinh: row.students, GiaoVien: row.teachers, Lop: row.classes, DiemTB: row.gradeAverage, TyLeCoMat: row.attendanceRate, SoBanGhiDiemDanh: row.attendanceRecords, Vang: row.absentCount, NoConLai: row.outstandingAmount }));
  const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), 'DoiChieu');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};
const exportPdf = async (actor, query) => createPdf(await compare(actor, query));
module.exports = { compare, exportExcel, exportPdf };
