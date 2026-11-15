import { Button, InputNumber, Space, Table, Tag, Typography } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

const QUESTION_TYPE_LABELS = {
  MCQ: 'Trắc nghiệm',
  MCQ_MULTI: 'Nhiều đáp án',
  TRUE_FALSE_4: 'Đúng/Sai 4 ý',
  SHORT_ANSWER: 'Trả lời ngắn',
  ESSAY: 'Tự luận',
};

const ExamQuestionList = ({ draft }) => {
  const {
    questions, setQuestions, sections, template, mcqCount, essayCount, totalPoints,
    removeQuestion, updateQuestion,
  } = draft;

  const columns = [
    { title: 'STT', width: 50, render: (_, __, index) => index + 1 },
    {
      title: 'Loại',
      width: 150,
      dataIndex: 'type',
      render: type => <Tag color={type === 'ESSAY' ? 'orange' : type === 'TRUE_FALSE_4' ? 'purple' : 'blue'}>{QUESTION_TYPE_LABELS[type] || type}</Tag>,
    },
    { title: 'Phần', width: 190, render: (_, question) => sections.find(section => section.key === question.sectionKey)?.title || '—' },
    {
      title: 'Nội dung & đáp án',
      render: (_, question) => (
        <div>
          <strong>{question.prompt}</strong>
          {(question.type === 'MCQ' || question.type === 'MCQ_MULTI') && (
            <Space wrap size="small" style={{ marginTop: 4 }}>
              {(question.options || []).map(option => {
                const isCorrect = option.key === question.correctKey || (question.correctKeys || []).includes(option.key);
                return (
                  <Tag key={option.key} color={isCorrect ? 'green' : undefined} style={{ fontWeight: isCorrect ? 600 : 400 }}>
                    {option.key}. {option.text} {isCorrect && '✓'}
                  </Tag>
                );
              })}
            </Space>
          )}
          {question.type === 'TRUE_FALSE_4' && (question.statements || []).map((statement, index) => (
            <div key={`${question._tempId}-${index}`}>
              {String.fromCharCode(97 + index)}. {statement.text} — {statement.correctAnswer ? 'Đúng' : 'Sai'}
            </div>
          ))}
          {question.type === 'SHORT_ANSWER' && (
            <Typography.Text type="secondary">Đáp án: {(question.acceptedAnswers || []).join(', ')}</Typography.Text>
          )}
        </div>
      ),
    },
    {
      title: 'Điểm',
      width: 90,
      dataIndex: 'points',
      render: (points, question) => (
        <InputNumber
          aria-label={`Điểm câu hỏi ${question.prompt}`}
          min={0.1}
          max={10}
          step={0.05}
          value={points}
          onChange={value => updateQuestion(question._tempId, { points: Number(value) || 0 })}
          style={{ width: 82 }}
        />
      ),
    },
    {
      title: '',
      width: 50,
      render: (_, question) => (
        <Button type="text" danger aria-label={`Xóa câu ${question.prompt}`} icon={<DeleteOutlined />} onClick={() => removeQuestion(question._tempId)} />
      ),
    },
  ];

  const formattedTotal = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(totalPoints);

  return (
    <section aria-labelledby="exam-question-list-title">
      <div className="exam-question-list__header">
        <Typography.Text id="exam-question-list-title" strong>
          Danh sách câu hỏi trong đề ({questions.length} câu: {mcqCount} trắc nghiệm, {essayCount} tự luận — Tổng điểm: {formattedTotal}đ{template === 'THPT_2025' ? ' / 10' : ''})
        </Typography.Text>
        {questions.length > 0 && <Button danger onClick={() => setQuestions([])}>Xóa tất cả</Button>}
      </div>
      <Table
        size="small"
        rowKey={question => question._tempId || question.prompt}
        dataSource={questions}
        pagination={{ pageSize: 5 }}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: 'Chưa có câu hỏi nào. Hãy tải file Excel hoặc dán văn bản ở trên.' }}
        columns={columns}
      />
    </section>
  );
};

export default ExamQuestionList;
