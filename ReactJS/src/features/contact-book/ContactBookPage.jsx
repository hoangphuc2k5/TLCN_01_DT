import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import { useSelector } from 'react-redux';
import {
  createContactBookApi,
  getAcademicYearsApi,
  getClassStudentsApi,
  getClassesApi,
  getContactBooksApi,
  publishContactBookApi,
  replyContactBookApi,
} from '../../services/api.service';
import { can } from '../../utils/permissions';

const PERIOD_TYPE_LABELS = {
  WEEK: 'Theo tuần',
  MONTH: 'Theo tháng',
  TERM: 'Theo học kỳ',
};

export default function ContactBookPage() {
  const { user } = useSelector((s) => s.auth);
  const manage = can(user, 'contact_books', 'execute');
  const parent = user?.role === 'PARENT';

  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [students, setStudents] = useState([]);
  const [open, setOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [form] = Form.useForm();
  const [replyForm] = Form.useForm();

  const load = useCallback(async () => {
    const r = await getContactBooksApi();
    if (r?.EC === 0) setRows(r.data || []);
    else message.error(r?.EM || 'Không thể tải sổ liên lạc');
  }, []);

  useEffect(() => {
    (async () => {
      if (manage) {
        const [c, y] = await Promise.all([getClassesApi(), getAcademicYearsApi()]);
        setClasses(c?.data || []);
        setYears(y?.data || []);
      }
      await load();
    })();
  }, [load, manage]);

  const handleClassChange = async (classId) => {
    form.setFieldValue('studentId', undefined);
    if (!classId) {
      setStudents([]);
      return;
    }
    const res = await getClassStudentsApi(classId);
    if (res?.EC === 0) {
      setStudents(res.data || []);
    } else {
      setStudents([]);
    }
  };

  const columns = [
    {
      title: 'Kỳ',
      render: (_, r) => `${PERIOD_TYPE_LABELS[r.periodType] || r.periodType} (${r.periodKey})`,
    },
    { title: 'Học sinh', render: (_, r) => r.studentId?.name || '-' },
    { title: 'Lớp', render: (_, r) => r.classId?.name || '-' },
    { title: 'Học tập', dataIndex: 'academicSummary', ellipsis: true },
    { title: 'Chuyên cần', dataIndex: 'attendanceSummary', ellipsis: true },
    { title: 'Hạnh kiểm', dataIndex: 'conductSummary', ellipsis: true },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (v) => <Tag color={v === 'PUBLISHED' ? 'green' : 'gold'}>{v === 'PUBLISHED' ? 'Đã công bố' : 'Bản nháp'}</Tag>,
    },
    {
      title: 'Thao tác',
      render: (_, r) => (
        <Space>
          {manage && r.status === 'DRAFT' && (
            <Button
              size="small"
              type="primary"
              onClick={async () => {
                const x = await publishContactBookApi(r._id);
                if (x?.EC === 0) {
                  message.success('Đã công bố sổ liên lạc');
                  load();
                } else message.error(x?.EM);
              }}
            >
              Công bố
            </Button>
          )}
          {parent && r.status === 'PUBLISHED' && (
            <Button
              size="small"
              onClick={() => {
                replyForm.resetFields();
                setReplyTarget(r);
              }}
            >
              Phản hồi
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Sổ liên lạc điện tử định kỳ"
      extra={
        manage && (
          <Button
            type="primary"
            onClick={() => {
              form.resetFields();
              setStudents([]);
              setOpen(true);
            }}
          >
            Tạo sổ liên lạc
          </Button>
        )
      }
    >
      <Table rowKey="_id" dataSource={rows} columns={columns} />

      <Modal
        open={open}
        title="Tạo sổ liên lạc định kỳ"
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="Tạo sổ"
        cancelText="Hủy"
        width={640}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            const r = await createContactBookApi(v);
            if (r?.EC === 0) {
              message.success('Tạo sổ liên lạc thành công');
              setOpen(false);
              form.resetFields();
              load();
            } else message.error(r?.EM || 'Tạo sổ liên lạc thất bại');
          }}
        >
          <Form.Item name="classId" label="Lớp học" rules={[{ required: true, message: 'Vui lòng chọn lớp học' }]}>
            <Select
              placeholder="Chọn lớp"
              options={classes.map((x) => ({ value: x._id, label: x.name }))}
              onChange={handleClassChange}
            />
          </Form.Item>
          <Form.Item name="studentId" label="Học sinh" rules={[{ required: true, message: 'Vui lòng chọn học sinh' }]}>
            <Select
              placeholder={students.length ? 'Chọn học sinh' : 'Vui lòng chọn lớp trước'}
              options={students.map((s) => ({ value: s._id, label: `${s.name} (${s.code || 'HS'})` }))}
              disabled={!students.length}
            />
          </Form.Item>
          <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true, message: 'Vui lòng chọn năm học' }]}>
            <Select placeholder="Chọn năm học" options={years.map((x) => ({ value: x._id, label: x.name }))} />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="periodType" label="Loại kỳ" initialValue="MONTH" rules={[{ required: true }]}>
              <Select
                style={{ width: 160 }}
                options={[
                  { value: 'WEEK', label: 'Theo tuần' },
                  { value: 'MONTH', label: 'Theo tháng' },
                  { value: 'TERM', label: 'Theo học kỳ' },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="periodKey"
              label="Mã kỳ (VD: 2026-09 hoặc HK1)"
              rules={[{ required: true, message: 'Nhập mã kỳ' }]}
            >
              <Input placeholder="2026-09 hoặc Tuần 3" style={{ width: 220 }} />
            </Form.Item>
          </Space>
          <Form.Item name="academicSummary" label="Nhận xét học tập">
            <Input.TextArea rows={2} placeholder="Nhận xét kết quả học tập trong kỳ..." />
          </Form.Item>
          <Form.Item name="attendanceSummary" label="Chuyên cần / Điểm danh">
            <Input.TextArea rows={2} placeholder="Tình hình đi học, nghỉ học, đi muộn..." />
          </Form.Item>
          <Form.Item name="conductSummary" label="Hạnh kiểm & Nề nếp">
            <Input.TextArea rows={2} placeholder="Ý thức chấp hành nội quy, thái độ..." />
          </Form.Item>
          <Form.Item name="teacherNote" label="Lời nhắn gửi giáo viên">
            <Input.TextArea rows={2} placeholder="Dặn dò phụ huynh và học sinh..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={!!replyTarget}
        title="Phản hồi sổ liên lạc (Dành cho Phụ huynh)"
        onCancel={() => setReplyTarget(null)}
        onOk={() => replyForm.submit()}
        okText="Gửi phản hồi"
        cancelText="Hủy"
      >
        <Form
          form={replyForm}
          layout="vertical"
          onFinish={async (v) => {
            const r = await replyContactBookApi(replyTarget._id, v.parentReply);
            if (r?.EC === 0) {
              message.success('Gửi phản hồi thành công');
              setReplyTarget(null);
              load();
            } else message.error(r?.EM);
          }}
        >
          <Form.Item name="parentReply" label="Nội dung phản hồi" rules={[{ required: true, message: 'Nhập nội dung' }]}>
            <Input.TextArea rows={5} placeholder="Ý kiến phản hồi của phụ huynh tới giáo viên chủ nhiệm..." />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
