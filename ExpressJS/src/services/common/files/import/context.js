const XLSX = require('xlsx');
const ApiError = require('../../../../utils/common/http/api-error.util');
const { ROLES } = require('../../../../config/constants/roles.config');
const { GRADE_TYPES, ATTENDANCE_STATUS } = require('../../../../config/constants/status.config');

class ImportContext {
  constructor(dependencies) {
    const persistence = dependencies.persistence;
    const userService = dependencies.services.user;
    const gradeService = dependencies.services.grade;
    const feeService = dependencies.services.fee;
    const attendanceService = dependencies.services.attendance;
    const examService = dependencies.services.exam;

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

    Object.assign(this, {
      persistence, XLSX, ApiError, userService, gradeService, feeService,
      attendanceService, examService, ROLES, GRADE_TYPES, ATTENDANCE_STATUS,
      TEMPLATES, pick, parseWorkbook, buildTemplateBuffer, requireSchoolActor,
      findClassByName, findStudentByCode, findYearByName,
    });
  }
}

module.exports = ImportContext;
