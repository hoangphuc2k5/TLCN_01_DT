function createImportService(dependencies) {
  const persistence = dependencies.persistence;
  const XLSX = require('xlsx');
  const ApiError = require("../../../utils/common/http/api-error.util");
  const userService = dependencies.services["user"];
  const gradeService = dependencies.services["grade"];
  const feeService = dependencies.services["fee"];
  const attendanceService = dependencies.services["attendance"];
  const examService = dependencies.services["exam"];
  const { ROLES } = require("../../../config/constants/roles.config");
  const { GRADE_TYPES, ATTENDANCE_STATUS } = require("../../../config/constants/status.config");
  
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
          password: '',
        },
        {
          email: 'gvtoan@gmail.com',
          name: 'Trần Thị B',
          role: 'SUBJECT_TEACHER',
          code: 'GV001',
          phone: '0901000002',
          className: '',
          password: '',
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
    exams: {
      sheet: 'CauHoiDeThi',
      filename: 'mau-import-de-thi.xlsx',
      rows: [
        {
          stt: 1,
          type: 'MCQ',
          prompt: 'Thủ đô của Việt Nam là thành phố nào?',
          optionA: 'Hà Nội',
          optionB: 'TP. Hồ Chí Minh',
          optionC: 'Đà Nẵng',
          optionD: 'Hải Phòng',
          correctKey: 'A',
          points: 1,
        },
        {
          stt: 2,
          type: 'MCQ',
          prompt: 'Số Pi xấp xỉ bằng bao nhiêu?',
          optionA: '3.12',
          optionB: '3.14',
          optionC: '3.16',
          optionD: '3.18',
          correctKey: 'B',
          points: 1,
        },
        {
          stt: 3,
          type: 'ESSAY',
          prompt: 'Nêu cảm nghĩ của em về ngày đầu tiên đi học.',
          optionA: '',
          optionB: '',
          optionC: '',
          optionD: '',
          correctKey: '',
          points: 2,
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
    return persistence.findClassByNameFindOne({ schoolId, name: String(className).trim() });
  };
  
  const findStudentByCode = async (schoolId, code) => {
    if (!code) return null;
    return persistence.findStudentByCodeFindOne({
      schoolId,
      code: String(code).trim(),
      role: ROLES.STUDENT,
    });
  };
  
  const findYearByName = async (schoolId, name) => {
    if (name) {
      const byName = await persistence.byNameFindOne({ schoolId, name: String(name).trim() });
      if (byName) return byName;
    }
    const current = await persistence.currentFindOne({ schoolId, isCurrent: true });
    if (current) return current;
    return persistence.findYearByNameFindOne({ schoolId }, { createdAt: -1 });
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
        const passwordRaw = String(pick(row, 'password', 'Password', 'MatKhau') || '');
        const password =
          passwordRaw ||
          undefined;
        if (!password && process.env.ALLOW_PASSWORD_LOGIN !== 'false') throw new Error('Thiếu mật khẩu riêng cho tài khoản (ít nhất 15 ký tự).');
  
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
          (await persistence.subjectFindOne({ schoolId: actor.schoolId, code: subjectCode })) ||
          (await persistence.subjectFindOne2({ schoolId: actor.schoolId, name: subjectCode }));
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

  const parseExamQuestions = (buffer) => {
    const rows = parseWorkbook(buffer);
    const questions = [];
    const errors = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const line = i + 2;
      try {
        const prompt = String(pick(row, 'prompt', 'CauHoi', 'NoiDung', 'question', 'noi_dung') || '').trim();
        if (!prompt) {
          const hasAny = Object.values(row).some((val) => String(val).trim() !== '');
          if (!hasAny) continue;
          throw new Error('Thiếu nội dung câu hỏi (prompt)');
        }

        const typeRaw = String(pick(row, 'type', 'Loai', 'LoaiCau') || '').toUpperCase().trim();
        const optA = String(pick(row, 'optionA', 'A', 'DapAnA') || '').trim();
        const optB = String(pick(row, 'optionB', 'B', 'DapAnB') || '').trim();
        const optC = String(pick(row, 'optionC', 'C', 'DapAnC') || '').trim();
        const optD = String(pick(row, 'optionD', 'D', 'DapAnD') || '').trim();
        const correctRaw = String(pick(row, 'correctKey', 'DapAnDung', 'correct', 'DapAn') || '').toUpperCase().trim();
        const pointsRaw = pick(row, 'points', 'Diem', 'point');

        const isEssay = typeRaw === 'ESSAY' || typeRaw === 'TULUAN' || typeRaw === 'TU_LUAN' || (!optA && !optB && !typeRaw);

        if (isEssay) {
          const points = Number(pointsRaw) > 0 ? Number(pointsRaw) : 2;
          questions.push({
            type: 'ESSAY',
            prompt,
            options: [],
            correctKey: '',
            points,
          });
        } else {
          const options = [];
          if (optA) options.push({ key: 'A', text: optA });
          if (optB) options.push({ key: 'B', text: optB });
          if (optC) options.push({ key: 'C', text: optC });
          if (optD) options.push({ key: 'D', text: optD });

          if (options.length < 2) {
            throw new Error('Câu hỏi trắc nghiệm phải có ít nhất 2 phương án lựa chọn (A, B)');
          }

          const correctKey = correctRaw || 'A';
          if (!options.some((o) => o.key === correctKey)) {
            throw new Error(`Đáp án đúng "${correctKey}" không khớp với các lựa chọn`);
          }

          const points = Number(pointsRaw) > 0 ? Number(pointsRaw) : 1;
          questions.push({
            type: 'MCQ',
            prompt,
            options,
            correctKey,
            points,
          });
        }
      } catch (err) {
        errors.push({ line, message: err.message || String(err) });
      }
    }

    if (!questions.length && errors.length) {
      throw new ApiError(400, `Không thể đọc câu hỏi: ${errors[0].message}`);
    }

    return {
      total: questions.length,
      questions,
      errors,
    };
  };

  const importExam = async (actor, buffer, meta = {}) => {
    requireSchoolActor(actor);
    const parsed = parseExamQuestions(buffer);
    if (!parsed.questions.length) {
      throw new ApiError(400, 'Không tìm thấy câu hỏi hợp lệ trong file');
    }

    let classId = meta.classId || null;
    let subjectId = meta.subjectId || null;

    if (!classId && meta.className) {
      const cls = await findClassByName(actor.schoolId, meta.className);
      if (cls) classId = cls._id;
    }
    if (!subjectId && meta.subjectCode) {
      const subj =
        (await persistence.subjectFindOne({ schoolId: actor.schoolId, code: meta.subjectCode })) ||
        (await persistence.subjectFindOne2({ schoolId: actor.schoolId, name: meta.subjectCode }));
      if (subj) subjectId = subj._id;
    }

    const title = meta.title || 'Đề thi import từ Excel';
    const durationMinutes = Number(meta.durationMinutes) || 45;

    const exam = await examService.createExam(actor, {
      title,
      classId,
      subjectId,
      durationMinutes,
      questions: parsed.questions,
      status: 'DRAFT',
    });

    return {
      exam,
      success: parsed.questions.length,
      failed: parsed.errors.length,
      errors: parsed.errors,
    };
  };

  return {
    TEMPLATES,
    buildTemplateBuffer,
    importUsers,
    importGrades,
    importFees,
    importAttendance,
    parseExamQuestions,
    importExam,
  };
  
}

class ImportService {
  constructor(dependencies) {
    Object.assign(this, createImportService(dependencies));
  }
}

module.exports = ImportService;
