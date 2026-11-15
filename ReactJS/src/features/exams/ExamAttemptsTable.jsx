import { Button, Table } from 'antd';

const ExamAttemptsTable = ({ attempts, loading, canGrade, onGradeAttempt }) => {
  const columns = [
    { title: 'Đề', render: (_, attempt) => attempt.examId?.title || '—' },
    { title: 'Học sinh', render: (_, attempt) => attempt.studentId?.name || '—' },
    {
      title: 'Điểm',
      render: (_, attempt) => (
        attempt.pendingManualGrading
          ? 'Chờ chấm tự luận'
          : attempt.score == null
            ? 'Chưa công bố'
            : `${attempt.score}/${attempt.maxScore}${attempt.scoreOutOfTen != null ? ` · ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(attempt.scoreOutOfTen)}/10` : ''}`
      ),
    },
    { title: 'Trạng thái', dataIndex: 'status' },
    {
      title: 'Thao tác',
      render: (_, attempt) => canGrade && (attempt.pendingManualGrading > 0 || attempt.status === 'GRADED')
        ? <Button size="small" onClick={() => onGradeAttempt(attempt)}>{attempt.status === 'GRADED' ? 'Xem / sửa điểm' : 'Chấm tự luận'}</Button>
        : null,
    },
  ];

  return (
    <Table
      rowKey="_id"
      loading={loading}
      dataSource={attempts}
      columns={columns}
      pagination={{ pageSize: 10 }}
      scroll={{ x: 'max-content' }}
      locale={{ emptyText: 'Chưa có bài làm nào.' }}
    />
  );
};

export default ExamAttemptsTable;
