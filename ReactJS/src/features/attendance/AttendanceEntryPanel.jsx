import { Alert, Button, DatePicker, Form, InputNumber, Select, Space, Table, Tag } from 'antd';
import dayjs from 'dayjs';

const statusOptions = [
  { value: 'PRESENT', label: 'Có mặt' },
  { value: 'LATE', label: 'Đi trễ' },
  { value: 'ABSENT_EXCUSED', label: 'Vắng có phép' },
  { value: 'ABSENT_UNEXCUSED', label: 'Vắng không phép' },
];

const AttendanceEntryPanel = ({ canTake, myTodaySlots, applySlot, form, classes, subjects, onClassChange, setSelectedDate, selectedDate, students, studentsLoading, getLeaveForStudent, markAllPresent, records, setRecords, canSubmitAttendance, submit }) => (
  <>
      {canTake && myTodaySlots.length > 0 && (
        <Alert
          style={{ marginBottom: 16 }}
          type="info"
          showIcon
          message={
            <Space wrap align="center">
              <span><strong>Tiết dạy hôm nay theo TKB:</strong></span>
              {myTodaySlots.map((slot, idx) => (
                <Button
                  key={idx}
                  size="small"
                  type="primary"
                  ghost
                  onClick={() => applySlot(slot)}
                >
                  Tiết {slot.period}: {slot.subjectName} ({slot.className})
                </Button>
              ))}
            </Space>
          }
        />
      )}

      {canTake && (
        <Form
          form={form}
          layout="vertical"
          className="attendance-form"
          onFinish={submit}
          initialValues={{ date: dayjs(), period: 1 }}
        >
          <Form.Item name="classId" label="Lớp" rules={[{ required: true, message: 'Chọn lớp' }]}>
            <Select
              placeholder="Lớp"
              allowClear
              style={{ width: '100%' }}
              options={classes.map((c) => ({ value: c._id, label: c.name }))}
              onChange={onClassChange}
            />
          </Form.Item>
          <Form.Item name="subjectId" label="Môn" rules={[{ required: true, message: 'Chọn môn' }]}>
            <Select
              allowClear
              placeholder="Môn"
              style={{ width: '100%' }}
              options={subjects.map((s) => ({ value: s._id, label: s.name }))}
            />
          </Form.Item>
          <Form.Item name="date" label="Ngày" rules={[{ required: true }]}>
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              onChange={(d) => {
                if (d) {
                  setSelectedDate(d);
                  const cId = form.getFieldValue('classId');
                  if (cId) onClassChange(cId, d);
                }
              }}
            />
          </Form.Item>
          <Form.Item name="period" label="Tiết">
            <InputNumber min={1} max={10} style={{ width: '100%' }} placeholder="Tiết" />
          </Form.Item>
          <Button aria-label="Lưu điểm danh" type="primary" htmlType="submit" disabled={!canSubmitAttendance} loading={studentsLoading}>
            Lưu điểm danh
          </Button>
        </Form>
      )}

      {canTake && students.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {students.some((st) => getLeaveForStudent(st._id, selectedDate)) && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message={`Phát hiện ${students.filter((st) => getLeaveForStudent(st._id, selectedDate)).length} học sinh có đơn xin nghỉ phép hợp lệ trong ngày. Hệ thống đã tự động chọn trạng thái "Có phép".`}
            />
          )}
          <Space style={{ marginBottom: 8, justifyContent: 'space-between', width: '100%' }}>
            <span><strong>Danh sách điểm danh ({students.length} học sinh)</strong></span>
            <Button size="small" onClick={markAllPresent}>
              Tất cả có mặt
            </Button>
          </Space>
          <Table
            rowKey="_id"
            pagination={false}
            dataSource={students}
            columns={[
              { title: 'Học sinh', dataIndex: 'name' },
              { title: 'Mã', dataIndex: 'code' },
              {
                title: 'Đơn xin nghỉ phép',
                render: (_, r) => {
                  const lv = getLeaveForStudent(r._id, selectedDate);
                  return lv ? (
                    <Tag color="cyan">
                      Đơn phép: {lv.reason} ({dayjs(lv.fromDate).format('DD/MM')} - {dayjs(lv.toDate).format('DD/MM')})
                    </Tag>
                  ) : (
                    '—'
                  );
                },
              },
              {
                title: 'Trạng thái',
                render: (_, r) => (
                  <Select
                    style={{ width: 180 }}
                    value={records[r._id]}
                    placeholder="Chưa điểm danh"
                    options={statusOptions}
                    onChange={(v) => setRecords((prev) => ({ ...prev, [r._id]: v }))}
                  />
                ),
              },
            ]}
          />
        </div>
      )}
  </>
);

export default AttendanceEntryPanel;
