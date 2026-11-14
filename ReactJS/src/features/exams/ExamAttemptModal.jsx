import { Checkbox, Input, Modal, Radio, Typography } from 'antd';

const ExamAttemptModal = ({ taking, setTaking, setAttemptId, setDeadlineAt, submit, submitting, remainingSeconds, formatRemaining, answers, setAnswers }) => {
  const sections = taking?.sections?.length
    ? [...taking.sections].sort((a, b) => a.order - b.order).map(section => ({
      ...section,
      questions: (taking.questions || []).filter(question => question.sectionKey === section.key),
    }))
    : [{ key: 'default', title: '', instructions: '', questions: taking?.questions || [] }];
  const unsectioned = taking?.sections?.length
    ? (taking.questions || []).filter(question => !taking.sections.some(section => section.key === question.sectionKey))
    : [];
  if (unsectioned.length) sections.push({ key: 'unsectioned', title: 'Câu hỏi khác', instructions: '', questions: unsectioned });

  const updateAnswer = (questionId, patch) => setAnswers(previous => ({
    ...previous,
    [questionId]: { ...previous[questionId], ...patch },
  }));

  return (
    <Modal
      open={Boolean(taking)}
      title={taking?.title}
      onCancel={() => {
        setTaking(null);
        setAttemptId(null);
        setDeadlineAt(null);
      }}
      onOk={submit}
      confirmLoading={submitting}
      okText="Nộp bài"
      width={760}
    >
      <div
        style={{
          marginBottom: 16,
          fontWeight: 600,
          color: remainingSeconds != null && remainingSeconds <= 60 ? '#cf1322' : undefined,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        Thời gian còn lại: {formatRemaining(remainingSeconds)}
      </div>
      {sections.map(section => (
        <section key={section.key} aria-label={section.title || 'Câu hỏi'} className="exam-attempt-section">
          {section.title && <Typography.Title level={5}>{section.title}</Typography.Title>}
          {section.instructions && <Typography.Paragraph type="secondary">{section.instructions}</Typography.Paragraph>}
          {section.questions.map((question, index) => (
            <div key={question._id} className="exam-attempt-question">
              <div className="exam-attempt-question__prompt">
                <strong>Câu {index + 1}. ({question.points}đ)</strong> {question.prompt}
              </div>
              {question.type === 'MCQ' && (
                <Radio.Group
                  style={{ marginTop: 8 }}
                  onChange={event => updateAnswer(question._id, { answerKey: event.target.value })}
                  value={answers[question._id]?.answerKey}
                >
                  {(question.options || []).map(option => <Radio key={option.key} value={option.key} className="exam-attempt-choice">{option.key}. {option.text}</Radio>)}
                </Radio.Group>
              )}
              {question.type === 'MCQ_MULTI' && (
                <Checkbox.Group
                  style={{ marginTop: 8, display: 'grid', gap: 8 }}
                  onChange={answerKeys => updateAnswer(question._id, { answerKeys })}
                  value={answers[question._id]?.answerKeys || []}
                >
                  {(question.options || []).map(option => <Checkbox key={option.key} value={option.key}>{option.key}. {option.text}</Checkbox>)}
                </Checkbox.Group>
              )}
              {question.type === 'TRUE_FALSE_4' && (
                <div className="exam-attempt-true-false">
                  {(question.statements || []).map((statement, statementIndex) => (
                    <div className="exam-attempt-true-false__row" key={`${question._id}-${statementIndex}`}>
                      <span><strong>{String.fromCharCode(97 + statementIndex)}.</strong> {statement.text}</span>
                      <Radio.Group
                        aria-label={`Câu ${index + 1}, ý ${String.fromCharCode(97 + statementIndex)}`}
                        onChange={event => {
                          const answerFlags = [...(answers[question._id]?.answerFlags || [])];
                          answerFlags[statementIndex] = event.target.value;
                          updateAnswer(question._id, { answerFlags });
                        }}
                        value={answers[question._id]?.answerFlags?.[statementIndex]}
                      >
                        <Radio value>Đúng</Radio>
                        <Radio value={false}>Sai</Radio>
                      </Radio.Group>
                    </div>
                  ))}
                </div>
              )}
              {(question.type === 'SHORT_ANSWER' || question.type === 'ESSAY') && (
                <Input.TextArea
                  aria-label={`Trả lời câu ${index + 1}`}
                  style={{ marginTop: 8 }}
                  rows={question.type === 'ESSAY' ? 5 : 2}
                  value={answers[question._id]?.answerText || ''}
                  onChange={event => updateAnswer(question._id, { answerText: event.target.value })}
                  maxLength={20000}
                  showCount
                />
              )}
            </div>
          ))}
        </section>
      ))}
    </Modal>
  );
};

export default ExamAttemptModal;
