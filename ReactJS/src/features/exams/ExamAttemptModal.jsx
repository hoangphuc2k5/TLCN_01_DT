import { Input, Modal, Radio } from 'antd';

const ExamAttemptModal = ({ taking, setTaking, setAttemptId, setDeadlineAt, submit, submitting, remainingSeconds, formatRemaining, answers, setAnswers }) => (
  <Modal
        open={!!taking}
        title={taking?.title}
        onCancel={() => {
          setTaking(null);
          setAttemptId(null);
          setDeadlineAt(null);
        }}
        onOk={submit}
        confirmLoading={submitting}
        okText="Nộp bài"
        width={720}
      >
        <div
          style={{
            marginBottom: 16,
            fontWeight: 600,
            color: remainingSeconds != null && remainingSeconds <= 60 ? '#cf1322' : undefined,
          }}
        >
          Thời gian còn lại: {formatRemaining(remainingSeconds)}
        </div>
        {(taking?.questions || []).map((q, idx) => (
          <div key={q._id} style={{ marginBottom: 16 }}>
            <div>
              <strong>
                Câu {idx + 1}. ({q.points}đ)
              </strong>{' '}
              {q.prompt}
            </div>
            {q.type === 'MCQ' ? (
              <Radio.Group
                style={{ marginTop: 8 }}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [q._id]: { answerKey: e.target.value },
                  }))
                }
                value={answers[q._id]?.answerKey}
              >
                {(q.options || []).map((o) => (
                  <Radio key={o.key} value={o.key} style={{ display: 'block' }}>
                    {o.key}. {o.text}
                  </Radio>
                ))}
              </Radio.Group>
            ) : (
              <Input.TextArea
                style={{ marginTop: 8 }}
                rows={3}
                value={answers[q._id]?.answerText || ''}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [q._id]: { answerText: e.target.value },
                  }))
                }
              />
            )}
          </div>
        ))}
      </Modal>
);

export default ExamAttemptModal;
