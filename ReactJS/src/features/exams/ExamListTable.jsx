import { Button, Space, Table, Tag } from 'antd';

const ExamListTable = ({ exams, loading, isStudent, canPublish, onStartExam, onPublishExam }) => {
  const columns = [
    { title: 'Đề thi', dataIndex: 'title' },
    { title: 'Môn', render: (_, exam) => exam.subjectId?.name || '—' },
    { title: 'Lớp', render: (_, exam) => exam.classId?.name || '—' },
    { title: 'Số câu', render: (_, exam) => `${exam.questions?.length || 0} câu` },
    { title: 'Thời gian', render: (_, exam) => `${exam.durationMinutes || 45} phút` },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: status => (
        <Tag className={`exam-status-tag ${status === 'PUBLISHED' ? 'exam-status-tag--published' : 'exam-status-tag--draft'}`}>
          {status === 'PUBLISHED' ? 'Đã mở' : 'Bản nháp'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      render: (_, exam) => (
        <Space>
          {isStudent && exam.status === 'PUBLISHED' && (
            <Button size="small" type="primary" onClick={() => onStartExam(exam._id)}>Làm bài</Button>
          )}
          {canPublish && exam.status === 'DRAFT' && (
            <Button size="small" onClick={() => onPublishExam(exam)}>Mở đề</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Table
      rowKey="_id"
      loading={loading}
      dataSource={exams}
      columns={columns}
      pagination={{ pageSize: 10 }}
      scroll={{ x: 'max-content' }}
      locale={{ emptyText: 'Chưa có đề thi nào.' }}
    />
  );
};

export default ExamListTable;
