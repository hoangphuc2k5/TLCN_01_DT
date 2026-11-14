const QUESTION_TYPES = Object.freeze({
  MCQ: 'MCQ',
  ESSAY: 'ESSAY',
  TRUE_FALSE_4: 'TRUE_FALSE_4',
  MCQ_MULTI: 'MCQ_MULTI',
  SHORT_ANSWER: 'SHORT_ANSWER',
});

const THPT_TRUE_FALSE_FACTORS = Object.freeze([0, 0.1, 0.25, 0.5, 1]);

const roundScore = value => Math.round((value + Number.EPSILON) * 100) / 100;

const normalizeShortAnswer = value => String(value ?? '')
  .normalize('NFC')
  .trim()
  .replace(/\s+/gu, ' ')
  .toLocaleLowerCase('vi-VN');

const validateExamSections = sections => {
  if (sections === undefined) return null;
  if (!Array.isArray(sections)) return 'Phần thi phải là danh sách';
  const keys = new Set();
  for (const section of sections) {
    if (!section || typeof section.key !== 'string' || !section.key.trim() || keys.has(section.key)) {
      return 'Mã phần thi bị thiếu hoặc trùng';
    }
    if (typeof section.title !== 'string' || !section.title.trim()) return 'Tên phần thi không được để trống';
    if (section.questionType && !Object.values(QUESTION_TYPES).includes(section.questionType)) {
      return 'Loại câu hỏi của phần thi không hợp lệ';
    }
    keys.add(section.key);
  }
  return null;
};

const validateExamQuestions = (questions, sections = []) => {
  if (!Array.isArray(questions)) return 'Danh sách câu hỏi không hợp lệ';
  const sectionByKey = new Map((sections || []).map(section => [section.key, section]));
  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    const label = `Câu ${index + 1}`;
    const type = question?.type || QUESTION_TYPES.MCQ;
    if (!question || !Object.values(QUESTION_TYPES).includes(type)) return `${label}: dạng câu hỏi không hợp lệ`;
    if (typeof question.prompt !== 'string' || !question.prompt.trim()) return `${label}: nội dung không được để trống`;
    if (typeof question.points !== 'number' || !Number.isFinite(question.points) || question.points <= 0 || question.points > 10) {
      return `${label}: điểm phải lớn hơn 0 và không vượt quá 10`;
    }
    const sectionKey = question.sectionKey || '';
    if (sectionKey && !sectionByKey.has(sectionKey)) return `${label}: phần thi không tồn tại`;
    const requiredType = sectionByKey.get(sectionKey)?.questionType;
    if (requiredType && requiredType !== type) return `${label}: không đúng dạng câu hỏi của phần thi`;

    if (type === QUESTION_TYPES.MCQ || type === QUESTION_TYPES.MCQ_MULTI) {
      const options = question.options;
      if (!Array.isArray(options) || options.length < 2) return `${label}: cần ít nhất 2 lựa chọn`;
      const keys = options.map(option => option?.key);
      if (keys.some(key => typeof key !== 'string' || !key) || new Set(keys).size !== keys.length || options.some(option => !String(option?.text || '').trim())) {
        return `${label}: lựa chọn bị thiếu hoặc trùng`;
      }
      if (type === QUESTION_TYPES.MCQ && !keys.includes(question.correctKey)) return `${label}: đáp án đúng không thuộc các lựa chọn`;
      if (type === QUESTION_TYPES.MCQ_MULTI) {
        const correctKeys = question.correctKeys;
        if (!Array.isArray(correctKeys) || !correctKeys.length || new Set(correctKeys).size !== correctKeys.length || correctKeys.some(key => !keys.includes(key))) {
          return `${label}: phải chọn ít nhất một đáp án đúng hợp lệ`;
        }
      }
    }

    if (type === QUESTION_TYPES.TRUE_FALSE_4) {
      if (!Array.isArray(question.statements) || question.statements.length !== 4 || question.statements.some(statement => !String(statement?.text || '').trim() || typeof statement.correctAnswer !== 'boolean')) {
        return `${label}: câu Đúng/Sai cần đủ 4 ý và đáp án cho từng ý`;
      }
    }

    if (type === QUESTION_TYPES.SHORT_ANSWER && (!Array.isArray(question.acceptedAnswers) || !question.acceptedAnswers.some(answer => typeof answer === 'string' && answer.trim()))) {
      return `${label}: cần ít nhất một đáp án được chấp nhận`;
    }
  }
  return null;
};

const validatePublishTotal = (exam, questions = exam.questions || []) => {
  if (exam.template !== 'THPT_2025') return null;
  const total = questions.reduce((sum, question) => sum + Number(question.points || 0), 0);
  return Math.abs(total - 10) < 0.001 ? null : 'Mẫu THPT yêu cầu tổng điểm tối đa bằng 10';
};

const gradeAnswers = (exam, answers) => {
  let score = 0;
  let pendingManualGrading = 0;
  const questions = exam.questions || [];
  const graded = answers.map(answer => {
    const question = questions.find(item => String(item._id) === String(answer.questionId));
    if (!question) return { ...answer, isCorrect: null, pointsAwarded: 0 };
    const points = Number(question.points || 1);
    let isCorrect = null;
    let pointsAwarded = 0;

    if (question.type === QUESTION_TYPES.MCQ) {
      isCorrect = Boolean(answer.answerKey) && answer.answerKey === question.correctKey;
      pointsAwarded = isCorrect ? points : 0;
    } else if (question.type === QUESTION_TYPES.MCQ_MULTI) {
      const expected = [...(question.correctKeys || [])].sort();
      const selected = [...new Set(answer.answerKeys || [])].sort();
      isCorrect = expected.length === selected.length && expected.every((key, index) => key === selected[index]);
      pointsAwarded = isCorrect ? points : 0;
    } else if (question.type === QUESTION_TYPES.TRUE_FALSE_4) {
      const flags = Array.isArray(answer.answerFlags) ? answer.answerFlags : [];
      const correctCount = question.statements.reduce((count, statement, index) => count + (flags[index] === statement.correctAnswer ? 1 : 0), 0);
      const factor = THPT_TRUE_FALSE_FACTORS[correctCount];
      isCorrect = correctCount === question.statements.length;
      pointsAwarded = roundScore(points * factor);
    } else if (question.type === QUESTION_TYPES.SHORT_ANSWER) {
      const normalized = normalizeShortAnswer(answer.answerText);
      isCorrect = Boolean(normalized) && (question.acceptedAnswers || []).some(expected => normalizeShortAnswer(expected) === normalized);
      pointsAwarded = isCorrect ? points : 0;
    } else if (question.type === QUESTION_TYPES.ESSAY) {
      if (String(answer.answerText || '').trim()) pendingManualGrading += 1;
      else isCorrect = false;
    }

    score += pointsAwarded;
    return { ...answer, isCorrect, pointsAwarded };
  });
  return { graded, score: roundScore(score), pendingManualGrading };
};

module.exports = {
  QUESTION_TYPES,
  THPT_TRUE_FALSE_FACTORS,
  normalizeShortAnswer,
  validateExamSections,
  validateExamQuestions,
  validatePublishTotal,
  gradeAnswers,
  roundScore,
};
