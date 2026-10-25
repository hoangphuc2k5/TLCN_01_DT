class ImportGradeHandlers {
  constructor(dependencies) {
    const context = dependencies.context;
    const { persistence, gradeService, GRADE_TYPES, parseWorkbook, pick, requireSchoolActor, findClassByName, findStudentByCode, findYearByName } = context;
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
    Object.assign(this, { importGrades });
  }
}

module.exports = ImportGradeHandlers;
