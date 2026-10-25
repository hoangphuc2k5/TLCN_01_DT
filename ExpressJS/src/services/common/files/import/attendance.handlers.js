class ImportAttendanceHandlers {
  constructor(dependencies) {
    const context = dependencies.context;
    const { attendanceService, ATTENDANCE_STATUS, parseWorkbook, pick, requireSchoolActor, findClassByName, findStudentByCode } = context;
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
    Object.assign(this, { importAttendance });
  }
}

module.exports = ImportAttendanceHandlers;
