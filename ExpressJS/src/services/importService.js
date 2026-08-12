const XLSX = require('xlsx');
const ApiError = require('../utils/ApiError');
const userService = require('./userService');
const gradeService = require('./gradeService');
const feeService = require('./feeService');
const attendanceService = require('./attendanceService');
const User = require('../models/User');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const AcademicYear = require('../models/AcademicYear');
const { ROLES } = require('../constants/roles');
const { GRADE_TYPES, ATTENDANCE_STATUS } = require('../constants/status');

const TEMPLATES = {
  users: {
    sheet: 'NguoiDung',
    filename: 'mau-import-nguoi-dung.xlsx',
    rows: [
      {
        email: 'hocsinh01@gmail.com',
        name: 'Nguyễn Văn A',
        role: 'STUDENT',
        code: 'HS001',
        phone: '0901000001',
        className: '8A',
      },
      {
        email: 'gvtoan@gmail.com',
        name: 'Trần Thị B',
        role: 'SUBJECT_TEACHER',
        code: 'GV001',
        phone: '0901000002',
        className: '',
      },
    ],
  },
  grades: {
    sheet: 'Diem',
    filename: 'mau-import-diem.xlsx',
    rows: [
      {
        studentCode: 'HS001',
        className: '8A',
        subjectCode: 'MATH',
        academicYear: '2025-2026',
        semester: 1,
        type: 'ORAL',
        score: 8.5,
        weight: 1,
      },
      {
        studentCode: 'HS001',
        className: '8A',
        subjectCode: 'MATH',
        academicYear: '2025-2026',
        semester: 1,
        type: 'MIDTERM',
        score: 7,
        weight: 2,
      },
    ],
  },
  fees: {
    sheet: 'HocPhi',
    filename: 'mau-import-hoc-phi.xlsx',
    rows: [
      {
        studentCode: 'HS001',
        academicYear: '2025-2026',
        title: 'Học phí học kỳ 1',
        amount: 2500000,
        dueDate: '2025-09-30',
        note: '',
      },
    ],
  },
  attendance: {
    sheet: 'DiemDanh',
    filename: 'mau-import-diem-danh.xlsx',
    rows: [
      {
        date: '2025-09-01',
        period: 1,
        className: '8A',
        studentCode: 'HS001',
        status: 'PRESENT',
        note: '',
      },
      {
        date: '2025-09-01',
        period: 1,
        className: '8A',
        studentCode: 'HS002',
        status: 'LATE',
        note: 'Đến muộn 10 phút',
      },
    ],
  },
};

const pick = (row, ...keys) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return row[key];
    }
    const found = Object.keys(row).find((k) => k.toLowerCase() === String(key).toLowerCase());
    if (found && row[found] !== undefined && String(row[found]).trim() !== '') {
      return row[found];
    }
  }
  return '';
};

const parseWorkbook = (buffer) => {
  if (!buffer?.length) throw new ApiError(400, 'File Excel trống');
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  if (!rows.length) throw new ApiError(400, 'Không có dòng dữ liệu trong file');
  return rows;
};

const buildTemplateBuffer = (type) => {
  const tpl = TEMPLATES[type];
  if (!tpl) throw new ApiError(400, 'Loại mẫu không hợp lệ');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(tpl.rows);
  XLSX.utils.book_append_sheet(wb, ws, tpl.sheet);
  return {
    buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }),
    filename: tpl.filename,
  };
};

const requireSchoolActor = (actor) => {
  if (!actor.schoolId) {
    throw new ApiError(403, 'Chỉ tài khoản thuộc trường mới được import dữ liệu');
  }
};

const findClassByName = async (schoolId, className) => {
  if (!className) return null;
  return Class.findOne({ schoolId, name: String(className).trim() });
};

const findStudentByCode = async (schoolId, code) => {
  if (!code) return null;
  return User.findOne({
    schoolId,
    code: String(code).trim(),
    role: ROLES.STUDENT,
  });
};

const findYearByName = async (schoolId, name) => {
  if (name) {
    const byName = await AcademicYear.findOne({ schoolId, name: String(name).trim() });
    if (byName) return byName;
  }
  const current = await AcademicYear.findOne({ schoolId, isCurrent: true });
  if (current) return current;
  return AcademicYear.findOne({ schoolId }).sort({ createdAt: -1 });
};

const importUsers = async (actor, buffer) => {
  requireSchoolActor(actor);
  const rows = parseWorkbook(buffer);
  const result = { success: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const line = i + 2;
    try {
      const email = String(pick(row, 'email', 'Email', 'Gmail')).toLowerCase().trim();
      const name = String(pick(row, 'name', 'Name', 'HoTen', 'Họ tên')).trim();
      const role = String(pick(row, 'role', 'Role', 'VaiTro') || ROLES.STUDENT)
        .toUpperCase()
        .trim();
      const code = String(pick(row, 'code', 'Code', 'Ma') || '').trim();
      const phone = String(pick(row, 'phone', 'Phone', 'SDT') || '').trim();
      const className = String(pick(row, 'className', 'Lop', 'class') || '').trim();
      const passwordRaw = String(pick(row, 'password', 'Password', 'MatKhau') || '').trim();
      const password =
        passwordRaw ||
        (process.env.ALLOW_PASSWORD_LOGIN === 'false' ? undefined : 'Password@123');

      if (!Object.values(ROLES).includes(role) || role === ROLES.SUPER_ADMIN) {
        throw new Error(`Role không hợp lệ: ${role}`);
      }

      let classId;
      if (className) {
        const cls = await findClassByName(actor.schoolId, className);
        if (!cls) throw new Error(`Không tìm thấy lớp ${className}`);
        classId = cls._id;
      }

      await userService.createUser(actor, {
        email,
        name,
        role,
        code,
        phone,
        classId,
        password,
      });
      result.success += 1;
    } catch (err) {
      result.failed += 1;
      result.errors.push({ line, message: err.message || String(err) });
    }
  }

  return result;
};

const importGrades = async (actor, buffer) => {
  requireSchoolActor(actor);
  const rows = parseWorkbook(buffer);
  const groups = new Map();
  const result = { success: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const line = i + 2;
    try {
      const studentCode = String(pick(row, 'studentCode', 'MaHS', 'code')).trim();
      const className = String(pick(row, 'className', 'Lop')).trim();
      const subjectCode = String(pick(row, 'subjectCode', 'Mon', 'MaMon')).trim();
      const yearName = String(pick(row, 'academicYear', 'NamHoc')).trim();
      const semester = Number(pick(row, 'semester', 'HocKy') || 1);
      const type = String(pick(row, 'type', 'LoaiDiem') || GRADE_TYPES.ORAL)
        .toUpperCase()
        .trim();
      const score = Number(pick(row, 'score', 'Diem'));
      const weight = Number(pick(row, 'weight', 'HeSo') || 1);

      if (!studentCode || !className || !subjectCode || Number.isNaN(score)) {
        throw new Error('Thiếu studentCode/className/subjectCode/score');
      }
      if (!Object.values(GRADE_TYPES).includes(type)) {
        throw new Error(`Loại điểm không hợp lệ: ${type}`);
      }

      const student = await findStudentByCode(actor.schoolId, studentCode);
      if (!student) throw new Error(`Không tìm thấy HS mã ${studentCode}`);
      const cls = await findClassByName(actor.schoolId, className);
      if (!cls) throw new Error(`Không tìm thấy lớp ${className}`);
      const subject =
        (await Subject.findOne({ schoolId: actor.schoolId, code: subjectCode })) ||
        (await Subject.findOne({ schoolId: actor.schoolId, name: subjectCode }));
      if (!subject) throw new Error(`Không tìm thấy môn ${subjectCode}`);
      const year = await findYearByName(actor.schoolId, yearName);
      if (!year) throw new Error('Không tìm thấy năm học');

      const key = `${student._id}|${cls._id}|${subject._id}|${year._id}|${semester}`;
      if (!groups.has(key)) {
        groups.set(key, {
          academicYearId: year._id,
          classId: cls._id,
          subjectId: subject._id,
          studentId: student._id,
          semester,
          scores: [],
          lines: [],
        });
      }
      groups.get(key).scores.push({ type, score, weight });
      groups.get(key).lines.push(line);
    } catch (err) {
      result.failed += 1;
      result.errors.push({ line, message: err.message || String(err) });
    }
  }

  for (const group of groups.values()) {
    try {
      await gradeService.upsertGrade(actor, {
        academicYearId: group.academicYearId,
        classId: group.classId,
        subjectId: group.subjectId,
        studentId: group.studentId,
        semester: group.semester,
        scores: group.scores,
      });
      result.success += group.scores.length;
    } catch (err) {
      result.failed += group.scores.length;
      result.errors.push({
        line: group.lines[0],
        message: err.message || String(err),
      });
    }
  }

  return result;
};

const importFees = async (actor, buffer) => {
  requireSchoolActor(actor);
  const rows = parseWorkbook(buffer);
  const result = { success: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const line = i + 2;
    try {
      const studentCode = String(pick(row, 'studentCode', 'MaHS')).trim();
      const yearName = String(pick(row, 'academicYear', 'NamHoc')).trim();
      const title = String(pick(row, 'title', 'NoiDung', 'TieuDe')).trim();
      const amount = Number(pick(row, 'amount', 'SoTien'));
      const dueDate = pick(row, 'dueDate', 'Han');
      const note = String(pick(row, 'note', 'GhiChu') || '').trim();

      const student = await findStudentByCode(actor.schoolId, studentCode);
      if (!student) throw new Error(`Không tìm thấy HS mã ${studentCode}`);
      const year = await findYearByName(actor.schoolId, yearName);
      if (!year) throw new Error('Không tìm thấy năm học');
      if (!title || Number.isNaN(amount) || !dueDate) {
        throw new Error('Thiếu title/amount/dueDate');
      }

      await feeService.createInvoice(actor, {
        studentId: student._id,
        academicYearId: year._id,
        title,
        amount,
        dueDate: new Date(dueDate),
        note,
      });
      result.success += 1;
    } catch (err) {
      result.failed += 1;
      result.errors.push({ line, message: err.message || String(err) });
    }
  }

  return result;
};

const importAttendance = async (actor, buffer) => {
  requireSchoolActor(actor);
  const rows = parseWorkbook(buffer);
  const groups = new Map();
  const result = { success: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const line = i + 2;
    try {
      const dateRaw = pick(row, 'date', 'Ngay');
      const period = Number(pick(row, 'period', 'Tiet') || 1);
      const className = String(pick(row, 'className', 'Lop')).trim();
      const studentCode = String(pick(row, 'studentCode', 'MaHS')).trim();
      const status = String(pick(row, 'status', 'TrangThai') || ATTENDANCE_STATUS.PRESENT)
        .toUpperCase()
        .trim();
      const note = String(pick(row, 'note', 'GhiChu') || '').trim();

      if (!dateRaw || !className || !studentCode) {
        throw new Error('Thiếu date/className/studentCode');
      }
      if (!Object.values(ATTENDANCE_STATUS).includes(status)) {
        throw new Error(`Trạng thái không hợp lệ: ${status}`);
      }

      const cls = await findClassByName(actor.schoolId, className);
      if (!cls) throw new Error(`Không tìm thấy lớp ${className}`);
      const student = await findStudentByCode(actor.schoolId, studentCode);
      if (!student) throw new Error(`Không tìm thấy HS mã ${studentCode}`);

      const date = new Date(dateRaw);
      const key = `${cls._id}|${date.toISOString().slice(0, 10)}|${period}`;
      if (!groups.has(key)) {
        groups.set(key, {
          classId: cls._id,
          date,
          period,
          records: [],
          lines: [],
        });
      }
      groups.get(key).records.push({ studentId: student._id, status, note });
      groups.get(key).lines.push(line);
    } catch (err) {
      result.failed += 1;
      result.errors.push({ line, message: err.message || String(err) });
    }
  }

  for (const group of groups.values()) {
    try {
      await attendanceService.recordAttendance(actor, {
        classId: group.classId,
        date: group.date,
        period: group.period,
        records: group.records,
      });
      result.success += group.records.length;
    } catch (err) {
      result.failed += group.records.length;
      result.errors.push({
        line: group.lines[0],
        message: err.message || String(err),
      });
    }
  }

  return result;
};

module.exports = {
  TEMPLATES,
  buildTemplateBuffer,
  importUsers,
  importGrades,
  importFees,
  importAttendance,
};
