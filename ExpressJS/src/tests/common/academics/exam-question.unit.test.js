const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  gradeAnswers,
  normalizeShortAnswer,
  validateExamQuestions,
  validatePublishTotal,
} = require('../../../utils/common/academics/exam-question.util');

const questionId = value => value;

test('grades four-part true/false answers using the THPT score bands', () => {
  const exam = {
    questions: [{
      _id: questionId('tf'),
      type: 'TRUE_FALSE_4',
      points: 2,
      statements: [true, false, true, false].map((correctAnswer, index) => ({ text: `Statement ${index}`, correctAnswer })),
    }],
  };
  const answers = [0, 1, 2, 3, 4].map(correctCount => ({
    questionId: 'tf',
    answerFlags: [true, false, true, false].map((answer, index) => index < correctCount ? answer : !answer),
  }));
  const expected = [0, 0.2, 0.5, 1, 2];

  answers.forEach((answer, index) => {
    const result = gradeAnswers(exam, [answer]);
    assert.equal(result.score, expected[index]);
    assert.equal(result.graded[0].pointsAwarded, expected[index]);
  });
});

test('grades multi-select all-or-nothing and normalized short answers', () => {
  const exam = { questions: [
    { _id: 'multi', type: 'MCQ_MULTI', points: 1.5, correctKeys: ['A', 'C'] },
    { _id: 'short', type: 'SHORT_ANSWER', points: 0.5, acceptedAnswers: ['Hà Nội'] },
  ] };
  const exact = gradeAnswers(exam, [
    { questionId: 'multi', answerKeys: ['C', 'A', 'A'] },
    { questionId: 'short', answerText: '  HÀ   NỘI ' },
  ]);
  const extraChoice = gradeAnswers(exam, [{ questionId: 'multi', answerKeys: ['A', 'B', 'C'] }]);

  assert.equal(exact.score, 2);
  assert.equal(exact.pendingManualGrading, 0);
  assert.equal(extraChoice.score, 0);
  assert.equal(normalizeShortAnswer('  HÀ   NỘI '), normalizeShortAnswer('Hà Nội'));
});

test('allows custom totals but requires THPT published exams to total ten points', () => {
  const questions = [{ points: 3 }, { points: 2.5 }];
  assert.equal(validatePublishTotal({ template: 'CUSTOM' }, questions), null);
  assert.match(validatePublishTotal({ template: 'THPT_2025' }, questions), /10/);
  assert.equal(validatePublishTotal({ template: 'THPT_2025' }, [...questions, { points: 4.5 }]), null);
});

test('validates answer formats and enforces section type locks', () => {
  const section = [{ key: 'part-1', title: 'Phần I', questionType: 'MCQ' }];
  const question = { type: 'TRUE_FALSE_4', prompt: 'Chọn đúng sai', points: 1, sectionKey: 'part-1', statements: [] };
  assert.match(validateExamQuestions([question], section), /dạng câu hỏi của phần thi/);
});
