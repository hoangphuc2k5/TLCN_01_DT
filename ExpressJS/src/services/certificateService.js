const ApiError = require('../utils/ApiError');
const User = require('../models/User');
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
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const assertStudentAccess = async (actor, studentId) => {
  const id = objectId(studentId, 'studentId');
  const scope = await schoolScope(actor);
  const personal = await personalStudentIds(actor);
  if (personal !== null && !personal.some(item => String(item) === String(id))) {
    throw new ApiError(404, 'Khong tim thay hoc sinh trong pham vi');
  }
  const student = await User.findOne({ ...scope, _id: id, role: 'STUDENT' })
    .select('name code schoolId classId dateOfBirth gender')
    .populate('classId', 'name gradeLevel')
    .lean();
  if (!student) throw new ApiError(404, 'Khong tim thay hoc sinh trong pham vi');
  return student;
};

const getTranscript = async (actor, studentId) => {
  const student = await assertStudentAccess(actor, studentId);
  const [grades, conduct, records] = await Promise.all([
    Grade.find({ schoolId: student.schoolId, studentId: student._id })
      .populate('subjectId', 'name code')
      .populate('academicYearId', 'name')
      .sort({ academicYearId: 1, semester: 1, subjectId: 1 })
      .lean(),
    ConductRecord.find({ schoolId: student.schoolId, studentId: student._id })
      .populate('academicYearId', 'name').sort({ academicYearId: 1, semester: 1 }).lean(),
    RewardDisciplineRecord.find({ schoolId: student.schoolId, studentId: student._id, status: 'APPROVED' })
      .sort({ awardedAt: 1 }).lean(),
  ]);
  return {
    student,
    grades: grades.map(item => ({
      subject: item.subjectId?.name || item.subjectId?.code || 'Unknown subject',
      year: item.academicYearId?.name || '', semester: item.semester,
      average: item.average, classification: item.classification || '',
    })),
    conduct: conduct.map(item => ({ year: item.academicYearId?.name || '', semester: item.semester, rating: item.rating, comment: item.comment || '' })),
    records: records.map(item => ({ type: item.type, title: item.title, points: item.points, awardedAt: item.awardedAt })),
    generatedAt: new Date(),
  };
};

const linesFor = transcript => {
  const { student, grades, conduct, records, generatedAt } = transcript;
  const lines = [
    'EDUMOET - ELECTRONIC STUDENT TRANSCRIPT',
    `Student: ${student.name} (${student.code || 'N/A'})`,
    `Class: ${student.classId?.name || 'N/A'}   Grade: ${student.classId?.gradeLevel || 'N/A'}`,
    `Date of birth: ${dateText(student.dateOfBirth)}   Generated: ${dateText(generatedAt)}`,
    '', 'GRADES', 'Year | Semester | Subject | Average | Classification',
  ];
  if (!grades.length) lines.push('(No grades recorded)');
  grades.forEach(item => lines.push(`${item.year} | ${item.semester} | ${item.subject} | ${item.average ?? '-'} | ${item.classification || '-'}`));
  lines.push('', 'CONDUCT');
  if (!conduct.length) lines.push('(No conduct records)');
  conduct.forEach(item => lines.push(`${item.year} | Semester ${item.semester} | ${item.rating}${item.comment ? ` | ${item.comment}` : ''}`));
  lines.push('', `Approved rewards/discipline: ${records.length}`);
  records.forEach(item => lines.push(`${item.type} | ${item.title} | points ${item.points}`));
  return lines;
};

const pdfEscape = value => ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

// A deliberately small, dependency-free PDF writer. The generated document is a
// standards-compliant single-page PDF containing the transcript text.
const createPdf = transcript => {
  const lines = linesFor(transcript).slice(0, 42);
  let content = 'BT\n/F1 10 Tf\n50 790 Td\n';
  lines.forEach((line, index) => { if (index) content += '0 -17 Td\n'; content += `(${pdfEscape(line)}) Tj\n`; });
  content += 'ET\n';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}endstream`,
  ];
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [0];
  objects.forEach((object, index) => { offsets[index + 1] = Buffer.byteLength(pdf, 'binary'); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf, 'binary');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'binary');
};

const rtfEscape = value => {
  let out = '';
  for (const char of String(value ?? '')) {
    const code = char.codePointAt(0);
    if (code >= 32 && code <= 126 && !'\\{}'.includes(char)) out += char;
    else if (char === '\\') out += '\\\\';
    else if (char === '{') out += '\\{';
    else if (char === '}') out += '\\}';
    else { const signed = code > 32767 ? code - 65536 : code; out += `\\u${signed}?`; }
  }
  return out;
};

const createRtf = transcript => {
  const body = linesFor(transcript).map(line => `${rtfEscape(line)}\\par`).join('\n');
  return Buffer.from(`{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\viewkind4\\f0\\fs20 ${body}}`, 'ascii');
};

const createCertificate = async (actor, studentId, format = 'pdf') => {
  const normalized = String(format).toLowerCase();
  if (!['pdf', 'doc', 'docx', 'rtf'].includes(normalized)) throw new ApiError(400, 'Dinh dang chi ho tro PDF hoac Word');
  const transcript = await getTranscript(actor, studentId);
  if (normalized === 'pdf') return { buffer: createPdf(transcript), mimeType: 'application/pdf', extension: 'pdf', transcript };
  return { buffer: createRtf(transcript), mimeType: 'application/rtf', extension: normalized === 'rtf' ? 'rtf' : 'doc', transcript };
};

module.exports = { createCertificate, getTranscript, createPdf, createRtf };
