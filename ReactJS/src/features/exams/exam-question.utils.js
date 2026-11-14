export const defaultQuestionPoints = (type) => ({
  MCQ: 0.25,
  MCQ_MULTI: 1,
  TRUE_FALSE_4: 1,
  SHORT_ANSWER: 0.25,
  ESSAY: 2,
}[type] ?? 1);

export const assignQuestionsToSections = (questions, sections, startOrder = 0) =>
  questions.map((question, index) => ({
    ...question,
    sectionKey: sections.find(section => !section.questionType || section.questionType === question.type)?.key || '',
    order: startOrder + index,
  }));

export const buildAttemptAnswers = (questions, answers) =>
  questions.map(question => ({
    questionId: question._id,
    answerKey: answers[question._id]?.answerKey || '',
    answerKeys: answers[question._id]?.answerKeys || [],
    answerFlags: answers[question._id]?.answerFlags || [],
    answerText: answers[question._id]?.answerText || '',
  }));
