import { Button, Select, Space, Table, message } from 'antd';
import ImportExcelButton from '../../components/ImportExcelButton';

const GradebookPanel = ({ canEnter, canExportGrades, onOpenEntry, onImportDone, onExport, classes, subjects, displayRows, getClassificationTag, filterClass, setFilterClass, filterSubject, setFilterSubject, filterSemester, setFilterSemester }) => (
  <>

                {(canEnter || canExportGrades) && (
                  <Space style={{ marginBottom: 16 }} wrap>
                    {canEnter && (
                      <Button type="primary" onClick={onOpenEntry}>
                        Nhập / cập nhật điểm
                      </Button>
                    )}
                    {canEnter && <ImportExcelButton type="grades" onDone={onImportDone} />}
                    {canExportGrades && (
                      <Button
                        onClick={async () => {
                          try {
                            await onExport();
                          } catch {
                            message.error('Xuất Excel thất bại');
                          }
                        }}
                      >
                        Xuất Excel
                      </Button>
                    )}
                  </Space>
                )}

                <Space wrap style={{ marginBottom: 16 }}>
                  <Select
                    allowClear
                    placeholder="Lọc theo Lớp"
                    style={{ width: 160 }}
                    value={filterClass}
                    onChange={setFilterClass}
                    options={classes.map((c) => ({ value: c._id, label: c.name }))}
                  />
                  <Select
                    allowClear
                    placeholder="Lọc theo Môn"
                    style={{ width: 160 }}
                    value={filterSubject}
                    onChange={setFilterSubject}
                    options={subjects.map((s) => ({ value: s._id, label: s.name }))}
                  />
                  <Select
                    allowClear
                    placeholder="Lọc theo Học kỳ"
                    style={{ width: 140 }}
                    value={filterSemester}
                    onChange={setFilterSemester}
                    options={[
                      { value: 1, label: 'Học kỳ 1' },
                      { value: 2, label: 'Học kỳ 2' },
                    ]}
                  />
                  {(filterClass || filterSubject || filterSemester) && (
                    <Button
                      onClick={() => {
                        setFilterClass(null);
                        setFilterSubject(null);
                        setFilterSemester(null);
                      }}
                    >
                      Xóa bộ lọc
                    </Button>
                  )}
                </Space>

                <Table
                  rowKey="_id"
                  dataSource={displayRows}
                  columns={[
                    { title: 'Học sinh', render: (_, r) => r.studentId?.name },
                    { title: 'Lớp', render: (_, r) => r.classId?.name },
                    { title: 'Môn', render: (_, r) => r.subjectId?.name },
                    { title: 'HK', dataIndex: 'semester' },
                    { title: 'ĐTB', dataIndex: 'average' },
                    { title: 'Xếp loại', dataIndex: 'classification', render: (v) => getClassificationTag(v) },
                    {
                      title: 'Chi tiết',
                      render: (_, r) =>
                        (r.scores || []).map((s) => `${s.type}:${s.score}`).join(' | '),
                    },
                  ]}
                />
  </>
);

export default GradebookPanel;
