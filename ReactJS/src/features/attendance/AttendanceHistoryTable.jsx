import { Space, Table, Tag } from 'antd';
import dayjs from 'dayjs';

const AttendanceHistoryTable = ({ rows, statusTags }) => (
  <>
      <Space style={{ marginBottom: 8 }}>
        <strong>Lịch sử điểm danh</strong>
      </Space>
      <Table
        rowKey="_id"
        dataSource={rows}
        scroll={{ x: 'max-content' }}
        columns={[
          {
            title: 'Ngày',
            dataIndex: 'date',
            render: (v) => dayjs(v).format('DD/MM/YYYY'),
          },
          { title: 'Tiết', dataIndex: 'period' },
          { title: 'Lớp', render: (_, r) => r.classId?.name },
          { title: 'Môn', render: (_, r) => r.subjectId?.name || '—' },
          { title: 'GV', render: (_, r) => r.teacherId?.name },
          {
            title: 'Sĩ số ghi nhận',
            render: (_, r) => r.records?.length || 0,
          },
        ]}
        expandable={{
          expandedRowRender: (r) => (
            <Table
              size="small"
              pagination={false}
              scroll={{ x: 'max-content' }}
              rowKey={(x) => x.studentId?._id || x.studentId}
              dataSource={r.records || []}
              columns={[
                { title: 'Học sinh', render: (_, x) => x.studentId?.name || x.studentId },
                {
                  title: 'Trạng thái',
                  dataIndex: 'status',
                  render: (v) => {
                    const item = statusTags[v];
                    return item ? <Tag color={item.color}>{item.label}</Tag> : (v || '—');
                  },
                },
                { title: 'Ghi chú', dataIndex: 'note', render: (v) => v || '—' },
              ]}
            />
          ),
        }}
      />
  </>
);

export default AttendanceHistoryTable;
