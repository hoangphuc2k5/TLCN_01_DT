import { Button, Card, Col, Row, Select, Space, Statistic, Table } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';

const GradeSummaryPanel = ({ summaryData, classes, summaryClassId, setSummaryClassId, summarySemester, setSummarySemester, canExport, onExport, getClassificationTag }) => {
  const summaryColumns = [
    { title: 'Học sinh', dataIndex: 'name', key: 'name', fixed: 'left', width: 160 },
    { title: 'Mã HS', dataIndex: 'code', key: 'code', width: 100 },
    ...summaryData.subjects.map((sub) => ({
      title: sub.name,
      key: String(sub.id),
      width: 100,
      render: (_, row) => row.scores[String(sub.id)] != null ? row.scores[String(sub.id)] : '—',
    })),
    {
      title: 'ĐTB Chung', dataIndex: 'gpa', key: 'gpa', width: 110,
      render: (value) => value != null ? <strong style={{ color: '#0f4c5c', fontSize: 15 }}>{value}</strong> : '—',
    },
    { title: 'Học lực', dataIndex: 'classification', key: 'classification', width: 120, render: getClassificationTag },
  ];

  return (
              <div>
                <Space wrap style={{ marginBottom: 16 }}>
                  <Select
                    placeholder="Chọn Lớp"
                    style={{ width: 180 }}
                    value={summaryClassId}
                    onChange={setSummaryClassId}
                    options={classes.map((c) => ({ value: c._id, label: c.name }))}
                  />
                  <Select
                    style={{ width: 140 }}
                    value={summarySemester}
                    onChange={setSummarySemester}
                    options={[
                      { value: 1, label: 'Học kỳ 1' },
                      { value: 2, label: 'Học kỳ 2' },
                    ]}
                  />
                  {canExport && (
                    <Button
                      icon={<FileExcelOutlined />}
                      onClick={onExport}
                    >
                      Xuất bảng điểm lớp (Excel)
                    </Button>
                  )}
                </Space>

                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={6}>
                    <Card size="small">
                      <Statistic title="Học sinh Giỏi" value={summaryData.stats.excellent} valueStyle={{ color: '#2e7d32' }} />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small">
                      <Statistic title="Học sinh Khá" value={summaryData.stats.good} valueStyle={{ color: '#1565c0' }} />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small">
                      <Statistic title="Học sinh Trung bình" value={summaryData.stats.average} valueStyle={{ color: '#e65100' }} />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small">
                      <Statistic title="Học sinh Yếu" value={summaryData.stats.weak} valueStyle={{ color: '#c62828' }} />
                    </Card>
                  </Col>
                </Row>

                <Table
                  rowKey="id"
                  dataSource={summaryData.students}
                  columns={summaryColumns}
                  scroll={{ x: 'max-content' }}
                  pagination={{ pageSize: 20 }}
                />
              </div>
  );
};

export default GradeSummaryPanel;
