const {
  AlignmentType, BorderStyle, Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType,
} = require('docx');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const School = require('../models/School');
const Grade = require('../models/Grade');
const ConductRecord = require('../models/ConductRecord');
const RewardDisciplineRecord = require('../models/RewardDisciplineRecord');
const { schoolScope, personalStudentIds, objectId } = require('./dataScope');

const ascii = value => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^\x20-\x7e]/g, '?');
const dateText = value => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
};

const assertStudentAccess = async (actor, studentId) => {
  const id = objectId(studentId, 'studentId');
  const scope = await schoolScope(actor);
  const personal = await personalStudentIds(actor);
  if (personal !== null && !personal.some(item => String(item) === String(id))) throw new ApiError(404, 'Không tìm thấy học sinh trong phạm vi');
  const student = await User.findOne({ ...scope, _id: id, role: 'STUDENT' })
    .select('name code schoolId classId dateOfBirth gender')
    .populate({ path: 'classId', select: 'name gradeLevel room academicYearId', populate: { path: 'academicYearId', select: 'name' } })
    .lean();
  if (!student) throw new ApiError(404, 'Không tìm thấy học sinh trong phạm vi');
  return student;
};

const getTranscript = async (actor, studentId) => {
  const student = await assertStudentAccess(actor, studentId);
  const [school, grades, conduct, records] = await Promise.all([
    School.findById(student.schoolId).select('name code address phone email').lean(),
    Grade.find({ schoolId: student.schoolId, studentId: student._id })
      .populate('subjectId', 'name code').populate('academicYearId', 'name').populate('classId', 'name gradeLevel')
      .sort({ academicYearId: 1, semester: 1, subjectId: 1 }).lean(),
    ConductRecord.find({ schoolId: student.schoolId, studentId: student._id })
      .populate('academicYearId', 'name').populate('classId', 'name gradeLevel').sort({ academicYearId: 1, semester: 1 }).lean(),
    RewardDisciplineRecord.find({ schoolId: student.schoolId, studentId: student._id, status: 'APPROVED' })
      .populate('academicYearId', 'name').populate('classId', 'name gradeLevel').sort({ awardedAt: 1 }).lean(),
  ]);
  return {
    school: school || {}, student,
    grades: grades.map(item => ({
      subject: item.subjectId?.name || item.subjectId?.code || 'Chưa xác định', subjectCode: item.subjectId?.code || '',
      year: item.academicYearId?.name || '', className: item.classId?.name || '', semester: item.semester,
      scores: (item.scores || []).map(score => ({ type: score.type, score: score.score, weight: score.weight, note: score.note || '' })),
      average: item.average, classification: item.classification || '',
    })),
    conduct: conduct.map(item => ({
      year: item.academicYearId?.name || '', className: item.classId?.name || '', semester: item.semester,
      rating: item.rating, comment: item.comment || '',
    })),
    records: records.map(item => ({
      year: item.academicYearId?.name || '', className: item.classId?.name || '', type: item.type,
      title: item.title, description: item.description || '', points: item.points, awardedAt: item.awardedAt,
    })),
    generatedAt: new Date(),
  };
};

const scoreText = scores => scores.length
  ? scores.map(score => `${score.type}: ${score.score} (x${score.weight})${score.note ? ` - ${score.note}` : ''}`).join('; ')
  : '-';
const linesFor = transcript => {
  const { school, student, grades, conduct, records, generatedAt } = transcript;
  const lines = [
    `${school.name || 'TRUONG HOC'}${school.code ? ` (${school.code})` : ''}`,
    school.address || '',
    'HOC BA DIEN TU / BANG KET QUA HOC TAP',
    `Hoc sinh: ${student.name}    Ma: ${student.code || 'N/A'}`,
    `Ngay sinh: ${dateText(student.dateOfBirth) || 'N/A'}    Gioi tinh: ${student.gender || 'N/A'}`,
    `Lop hien tai: ${student.classId?.name || 'N/A'}    Khoi: ${student.classId?.gradeLevel || 'N/A'}    Nam hoc: ${student.classId?.academicYearId?.name || 'N/A'}`,
    '', 'KET QUA HOC TAP', 'Nam hoc | Hoc ky | Lop | Mon hoc | Diem thanh phan | Trung binh | Xep loai',
  ];
  if (!grades.length) lines.push('(Chua co diem)');
  grades.forEach(item => lines.push(`${item.year} | ${item.semester} | ${item.className} | ${item.subject} | ${scoreText(item.scores)} | ${item.average ?? '-'} | ${item.classification || '-'}`));
  lines.push('', 'REN LUYEN / HANH KIEM', 'Nam hoc | Hoc ky | Lop | Xep loai | Nhan xet');
  if (!conduct.length) lines.push('(Chua co du lieu ren luyen)');
  conduct.forEach(item => lines.push(`${item.year} | ${item.semester} | ${item.className} | ${item.rating} | ${item.comment || '-'}`));
  lines.push('', 'KHEN THUONG - KY LUAT', 'Nam hoc | Ngay | Loai | Noi dung | Diem');
  if (!records.length) lines.push('(Khong co ban ghi da duyet)');
  records.forEach(item => lines.push(`${item.year} | ${dateText(item.awardedAt)} | ${item.type} | ${item.title}${item.description ? ` - ${item.description}` : ''} | ${item.points}`));
  lines.push('', `Ngay xuat: ${dateText(generatedAt)}`, 'Nguoi lap bieu                         Hieu truong', '(Ky va ghi ro ho ten)                 (Ky, dong dau)');
  return lines.filter((line, index, all) => line || all[index - 1]);
};

const pdfEscape = value => ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const wrap = (value, width = 92) => {
  const words = ascii(value).split(/\s+/); const lines = []; let current = '';
  for (const word of words) {
    if (!word) continue;
    if (!current || current.length + word.length + 1 <= width) current += `${current ? ' ' : ''}${word}`;
    else { lines.push(current); current = word; }
  }
  if (current || !words.some(Boolean)) lines.push(current);
  return lines;
};
const createPdf = transcript => {
  const printable = linesFor(transcript).flatMap(line => wrap(line));
  const chunks = []; for (let index = 0; index < printable.length; index += 44) chunks.push(printable.slice(index, index + 44));
  if (!chunks.length) chunks.push([]);
  const fontId = 3 + chunks.length * 2;
  const pageIds = chunks.map((_, index) => 3 + index * 2);
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`,
  ];
  chunks.forEach((lines, pageIndex) => {
    const pageId = pageIds[pageIndex]; const contentId = pageId + 1;
    let content = 'BT\n/F1 9 Tf\n42 800 Td\n';
    [...lines, `Trang ${pageIndex + 1}/${chunks.length}`].forEach((line, index) => { if (index) content += '0 -16 Td\n'; content += `(${pdfEscape(line)}) Tj\n`; });
    content += 'ET\n';
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}endstream`);
  });
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const offsets = [0];
  objects.forEach((object, index) => { offsets[index + 1] = Buffer.byteLength(pdf, 'binary'); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf, 'binary'); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'binary');
};

const cell = (value, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(value ?? ''), bold })] })] });
const table = (headers, rows, widths) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: widths,
  borders: { top: { style: BorderStyle.SINGLE, size: 1, color: 'D9D9D9' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D9D9D9' }, left: { style: BorderStyle.SINGLE, size: 1, color: 'D9D9D9' }, right: { style: BorderStyle.SINGLE, size: 1, color: 'D9D9D9' }, insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'D9D9D9' }, insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'D9D9D9' } },
  rows: [new TableRow({ tableHeader: true, children: headers.map(header => cell(header, true)) }), ...rows.map(row => new TableRow({ children: row.map(value => cell(value)) }))],
});
const heading = text => new Paragraph({ children: [new TextRun({ text, bold: true, color: '000000', size: 24 })], spacing: { before: 280, after: 120 } });
const createDocx = async transcript => {
  const { school, student, grades, conduct, records, generatedAt } = transcript;
  const children = [
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: school.name || 'TRƯỜNG HỌC', bold: true, size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'HỌC BẠ ĐIỆN TỬ / BẢNG KẾT QUẢ HỌC TẬP', bold: true, size: 30 })] }),
    new Paragraph({ text: `Mã trường: ${school.code || '-'}     Địa chỉ: ${school.address || '-'}     Điện thoại: ${school.phone || '-'}` }),
    heading('Thông tin học sinh'),
    table(['Họ và tên', 'Mã học sinh', 'Ngày sinh', 'Giới tính'], [[student.name, student.code || '-', dateText(student.dateOfBirth) || '-', student.gender || '-']], [3200, 1600, 1800, 1400]),
    new Paragraph({ text: `Lớp hiện tại: ${student.classId?.name || '-'}     Khối: ${student.classId?.gradeLevel || '-'}     Năm học: ${student.classId?.academicYearId?.name || '-'}`, spacing: { before: 120 } }),
    heading('Kết quả học tập'),
    table(['Năm học', 'HK', 'Lớp', 'Môn học', 'Điểm thành phần', 'TB', 'Xếp loại'], grades.length ? grades.map(item => [item.year, item.semester, item.className, item.subject, scoreText(item.scores), item.average ?? '-', item.classification || '-']) : [['-', '-', '-', 'Chưa có điểm', '-', '-', '-']], [1400, 500, 900, 1600, 3000, 700, 1000]),
    heading('Rèn luyện / hạnh kiểm'),
    table(['Năm học', 'HK', 'Lớp', 'Xếp loại', 'Nhận xét'], conduct.length ? conduct.map(item => [item.year, item.semester, item.className, item.rating, item.comment || '-']) : [['-', '-', '-', '-', 'Chưa có dữ liệu']], [1600, 600, 1000, 1300, 4000]),
    heading('Khen thưởng – kỷ luật đã duyệt'),
    table(['Năm học', 'Ngày', 'Loại', 'Nội dung', 'Điểm'], records.length ? records.map(item => [item.year, dateText(item.awardedAt), item.type, `${item.title}${item.description ? ` — ${item.description}` : ''}`, item.points]) : [['-', '-', '-', 'Không có bản ghi', '-']], [1400, 1200, 1200, 4500, 700]),
    new Paragraph({ text: `Ngày xuất: ${dateText(generatedAt)}`, alignment: AlignmentType.RIGHT, spacing: { before: 320 } }),
    table(['Người lập biểu', 'Hiệu trưởng'], [['(Ký và ghi rõ họ tên)', '(Ký, đóng dấu)']], [5000, 5000]),
  ];
  const document = new Document({
    creator: 'EDUMOET', title: `Học bạ điện tử - ${student.name}`, description: 'Bảng kết quả học tập điện tử',
    sections: [{ properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }],
  });
  return Packer.toBuffer(document);
};

const createCertificate = async (actor, studentId, format = 'pdf') => {
  const normalized = String(format).toLowerCase();
  if (!['pdf', 'doc', 'docx'].includes(normalized)) throw new ApiError(400, 'Định dạng chỉ hỗ trợ PDF hoặc DOCX');
  const transcript = await getTranscript(actor, studentId);
  if (normalized === 'pdf') return { buffer: createPdf(transcript), mimeType: 'application/pdf', extension: 'pdf', transcript };
  return { buffer: await createDocx(transcript), mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: 'docx', transcript };
};

module.exports = { createCertificate, getTranscript, createPdf, createDocx, linesFor };
