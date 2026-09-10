const ApiError = require('../utils/ApiError');
const School = require('../models/School'); const User = require('../models/User'); const Class = require('../models/Class'); const Grade = require('../models/Grade'); const FeeInvoice = require('../models/FeeInvoice'); const Attendance = require('../models/Attendance'); const XLSX = require('xlsx');
const { schoolScope, objectId } = require('./dataScope');

const compare = async (actor, query = {}) => {
  const raw = Array.isArray(query.schoolIds) ? query.schoolIds : String(query.schoolIds || '').split(',').filter(Boolean);
  const ids = [...new Set(raw.map(value => String(objectId(value, 'schoolId'))))];
  if (ids.length < 2 || ids.length > 20) throw new ApiError(400, 'Can it nhat 2 va toi da 20 truong');
  const scope = await schoolScope(actor); const schoolScopeFilter = scope.schoolId ? { _id: scope.schoolId } : scope.clusterId ? { clusterId: scope.clusterId } : {}; const schools = await School.find({ $and: [schoolScopeFilter, { _id: { $in: ids } }] }).select('name code subdomain status').lean();
  if (schools.length !== ids.length) throw new ApiError(403, 'Co truong ngoai pham vi');
  const objectIds = schools.map(item => item._id);
  const yearName = query.academicYear;
  if (yearName !== undefined && (typeof yearName !== 'string' || !yearName.trim() || yearName.length > 100)) throw new ApiError(400, 'Năm học không hợp lệ');
  if (query.semester !== undefined && !['1', '2'].includes(String(query.semester))) throw new ApiError(400, 'Học kỳ phải là 1 hoặc 2');
  const parseDate = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ApiError(400, 'Ngày phải theo YYYY-MM-DD');
    const date = new Date(value + 'T00:00:00+07:00');
    if (!Number.isFinite(date.getTime()) || new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10) !== value) throw new ApiError(400, 'Ngày không hợp lệ');
    return date;
  };
  const dates = {};
  if (query.fromDate !== undefined) dates.$gte = parseDate(query.fromDate);
  if (query.toDate !== undefined) dates.$lt = new Date(parseDate(query.toDate).getTime() + 86400000);
  if (dates.$gte && dates.$lt && dates.$gte >= dates.$lt) throw new ApiError(400, 'Khoảng ngày không hợp lệ');
  const years = yearName ? await require('../models/AcademicYear').find({ schoolId: { $in: objectIds }, name: yearName.trim() }).lean() : [];
  if (yearName && schools.some(school => !years.some(year => String(year.schoolId) === String(school._id)))) throw new ApiError(400, 'Mỗi trường được chọn phải có năm học này');
  const yearFilter = yearName ? { academicYearId: { $in: years.map(year => year._id) } } : {};
  const attendanceFilter = { schoolId: { $in: objectIds } };
  if (Object.keys(dates).length) attendanceFilter.date = dates;
  if (yearName) attendanceFilter.$or = years.map(year => ({ schoolId: year.schoolId, date: { $gte: year.startDate, $lte: year.endDate } }));
  const gradeFilter = query.semester ? { semester: Number(query.semester) } : {};
  const [users, classes, grades, fees, attendance] = await Promise.all([
    User.aggregate([{ $match: { schoolId: { $in: objectIds }, status: 'ACTIVE' } }, { $group: { _id: { schoolId: '$schoolId', role: '$role' }, count: { $sum: 1 } } }]),
    Class.aggregate([{ $match: { schoolId: { $in: objectIds }, ...yearFilter } }, { $group: { _id: '$schoolId', count: { $sum: 1 } } }]),
    Grade.aggregate([{ $match: { schoolId: { $in: objectIds }, average: { $ne: null }, ...yearFilter, ...gradeFilter } }, { $group: { _id: '$schoolId', average: { $avg: '$average' }, count: { $sum: 1 } } }]),
    FeeInvoice.aggregate([{ $match: { schoolId: { $in: objectIds }, ...yearFilter, ...(Object.keys(dates).length ? { dueDate: dates } : {}) } }, { $group: { _id: '$schoolId', billed: { $sum: '$amount' }, paid: { $sum: '$paidAmount' } } }]),
    Attendance.aggregate([{ $match: attendanceFilter }, { $unwind: '$records' }, { $group: { _id: { schoolId: '$schoolId', status: '$records.status' }, count: { $sum: 1 } } }]),
  ]);
  const by = (list, id) => list.find(item => String(item._id?.schoolId || item._id) === String(id));
  const countRoles = (id, roles) => users.filter(item => String(item._id.schoolId) === String(id) && roles.includes(item._id.role)).reduce((total, item) => total + item.count, 0);
  return schools.map(school => {
    const fee = by(fees, school._id); const grade = by(grades, school._id);
    const attendanceRows = attendance.filter(item => String(item._id.schoolId) === String(school._id));
    const attendanceRecords = attendanceRows.reduce((total, item) => total + item.count, 0);
    const presentCount = attendanceRows.filter(item => item._id.status === 'PRESENT').reduce((total, item) => total + item.count, 0);
    const absentCount = attendanceRows.filter(item => ['ABSENT_EXCUSED', 'ABSENT_UNEXCUSED'].includes(item._id.status)).reduce((total, item) => total + item.count, 0);
    return { school, students: countRoles(school._id, ['STUDENT']), teachers: countRoles(school._id, ['SUBJECT_TEACHER', 'HOMEROOM_TEACHER']), classes: by(classes, school._id)?.count || 0, gradeAverage: grade?.average ?? null, gradeSheets: grade?.count || 0, billedAmount: fee?.billed || 0, paidAmount: fee?.paid || 0, outstandingAmount: Math.max(0, (fee?.billed || 0) - (fee?.paid || 0)), attendanceRecords, presentCount, absentCount, lateCount: attendanceRecords - presentCount - absentCount, attendanceRate: attendanceRecords ? Number((presentCount / attendanceRecords * 100).toFixed(2)) : null };
  });
};

const columns = [
  ['Trường', row => row.school.name], ['Mã trường', row => row.school.code],
  ['Học sinh đang hoạt động', row => row.students], ['Giáo viên đang hoạt động', row => row.teachers],
  ['Lớp', row => row.classes], ['Điểm trung bình', row => row.gradeAverage ?? null],
  ['Số bảng điểm', row => row.gradeSheets], ['Tổng phải thu (VND)', row => row.billedAmount],
  ['Đã thu (VND)', row => row.paidAmount], ['Còn nợ (VND)', row => row.outstandingAmount],
  ['Lượt điểm danh', row => row.attendanceRecords], ['Có mặt', row => row.presentCount],
  ['Vắng', row => row.absentCount], ['Đi muộn', row => row.lateCount], ['Có mặt (%)', row => row.attendanceRate ?? null],
];
const description = query => [
  'Năm học: ' + (query.academicYear || 'Tất cả'),
  'Học kỳ (chỉ điểm): ' + (query.semester || 'Tất cả'),
  'Ngày điểm danh / hạn hóa đơn: ' + (query.fromDate || 'Không giới hạn') + ' đến ' + (query.toDate || 'Không giới hạn'),
  'Nhân sự: hiện tại. Điểm: trung bình các bảng điểm. Có mặt: PRESENT / tổng lượt, đi muộn tính riêng.',
  'Tiền đã thu là tổng hiện tại của hóa đơn được chọn, không phải dòng tiền trong kỳ.',
];
const createPdf = (rows, query = {}) => new Promise((resolve, reject) => {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);
  doc.font(require('node:path').join(__dirname, '../assets/fonts/NotoSans.ttf'));
  rows.forEach((row, index) => {
    if (index) doc.addPage();
    doc.fontSize(18).text('Báo cáo đối chiếu liên trường');
    doc.moveDown().fontSize(10);
    description(query).forEach(line => doc.text(line));
    doc.moveDown().fontSize(13).text(row.school.name + ' (' + row.school.code + ')');
    doc.moveDown().fontSize(11);
    columns.slice(2).forEach(([label, value]) => doc.text(label + ': ' + (value(row) == null ? 'Chưa có dữ liệu' : Number(value(row)).toLocaleString('vi-VN')), { paragraphGap: 6 }));
    doc.moveDown().fontSize(9).text('Trường ' + (index + 1) + '/' + rows.length);
  });
  doc.end();
});
const exportExcel = async (actor, query = {}) => {
  const rows = await compare(actor, query);
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([columns.map(([label]) => label), ...rows.map(row => columns.map(([, value]) => value(row)))]);
  sheet['!cols'] = columns.map((_, index) => ({ wch: index === 0 ? 40 : 24 }));
  XLSX.utils.book_append_sheet(workbook, sheet, 'DoiChieu');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(description(query).map(line => [line])), 'PhamVi');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};
const exportPdf = async (actor, query = {}) => createPdf(await compare(actor, query), query);
module.exports = { compare, exportExcel, exportPdf, createPdf };
