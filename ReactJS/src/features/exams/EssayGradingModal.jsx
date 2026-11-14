import { Button, InputNumber, Modal, Space, Typography } from 'antd';

const EssayGradingModal = ({ open, attempt, exam, grades, setGrades, saving, onCancel, onSubmit }) => {
  const answers = new Map((attempt?.answers || []).map(answer => [String(answer.questionId), answer]));
  const essayQuestions = (exam?.questions || []).filter(question => question.type === 'ESSAY');

  return (
    <Modal
      open={open}
      title={`Chấm tự luận${attempt?.studentId?.name ? ` · ${attempt.studentId.name}` : ''}`}
      onCancel={onCancel}
      width={760}
      footer={[
        <Button key="cancel" onClick={onCancel}>Đóng</Button>,
        <Button key="submit" type="primary" loading={saving} disabled={!essayQuestions.length} onClick={onSubmit}>Lưu điểm</Button>,
      ]}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {essayQuestions.map((question, index) => {
          const answer = answers.get(String(question._id));
          return (
            <div key={question._id}>
              <Typography.Text strong>Câu {index + 1} · {question.points} điểm</Typography.Text>
              <Typography.Paragraph>{question.prompt}</Typography.Paragraph>
              <Typography.Paragraph style={{ background: '#f7f8fa', borderRadius: 6, padding: 12, whiteSpace: 'pre-wrap' }}>
                {answer?.answerText || 'Học sinh không trả lời câu này.'}
              </Typography.Paragraph>
              <Space>
                <Typography.Text>Điểm câu:</Typography.Text>
                <InputNumber
                  aria-label={`Điểm tự luận câu ${index + 1}`}
                  min={0}
                  max={question.points}
                  step={0.25}
                  value={grades[String(question._id)] ?? answer?.pointsAwarded ?? 0}
                  onChange={value => setGrades(current => ({ ...current, [String(question._id)]: Number(value) || 0 }))}
                />
              </Space>
            </div>
          );
        })}
        {!essayQuestions.length && <Typography.Text type="secondary">Đề này không có câu tự luận.</Typography.Text>}
      </Space>
    </Modal>
  );
};

export default EssayGradingModal;
