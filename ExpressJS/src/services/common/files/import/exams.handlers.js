class ImportExamHandlers {
  constructor(dependencies) {
    const context = dependencies.context;
    const { persistence, ApiError, examService, parseWorkbook, pick, requireSchoolActor, findClassByName } = context;
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
    Object.assign(this, { parseExamQuestions, importExam });
  }
}

module.exports = ImportExamHandlers;
