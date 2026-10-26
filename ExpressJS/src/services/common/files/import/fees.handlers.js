class ImportFeeHandlers {
  constructor(dependencies) {
    const context = dependencies.context;
    const { feeService, parseWorkbook, pick, requireSchoolActor, findStudentByCode, findYearByName } = context;
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
    Object.assign(this, { importFees });
  }
}

module.exports = ImportFeeHandlers;
