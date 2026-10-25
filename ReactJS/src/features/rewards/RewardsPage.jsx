import { useCallback, useEffect, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd';
import { useSelector } from 'react-redux';
import {
  createRewardApi,
  getAcademicYearsApi,
  getClassStudentsApi,
  getClassesApi,
  getRewardsApi,
  reviewRewardApi,
} from '../../services/api.service';
import { can } from '../../utils/permissions';

const STATUS_LABELS = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

const RewardsPage = () => {
  const { user } = useSelector((s) => s.auth);
  const canManage = can(user, 'rewards', 'create') && can(user, 'rewards', 'update');
  const canReview = can(user, 'rewards', 'execute');

  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [students, setStudents] = useState([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    const r = await getRewardsApi();
    if (r?.EC === 0) setRows(r.data || []);
  }, []);

  useEffect(() => {
    (async () => {
      if (canManage) {
        const [c, y] = await Promise.all([getClassesApi(), getAcademicYearsApi()]);
        if (c?.EC === 0) setClasses(c.data || []);
        if (y?.EC === 0) setYears(y.data || []);
      }
      load();
    })();
  }, [canManage, load]);

  return (
    <div>
      {canManage && (
        <Button
          type="primary"
          onClick={() => {
            form.resetFields();
            setStudents([]);
            setOpen(true);
          }}
        >
          Tạo khen thưởng / kỷ luật
        </Button>
      )}
      <Table
        rowKey="_id"
        style={{ marginTop: 16 }}
        dataSource={rows}
        columns={[
          { title: 'Học sinh', render: (_, r) => r.studentId?.name || '-' },
          {
            title: 'Phân loại',
            dataIndex: 'type',
            render: (v) => (
              <Tag color={v === 'REWARD' ? 'green' : 'red'}>
                {v === 'REWARD' ? 'Khen thưởng' : 'Kỷ luật'}
              </Tag>
            ),
          },
          { title: 'Tiêu đề', dataIndex: 'title' },
          {
            title: 'Điểm rèn luyện',
            dataIndex: 'points',
            render: (pts) => (
              <span style={{ fontWeight: 600, color: pts > 0 ? '#389e0d' : pts < 0 ? '#cf1322' : undefined }}>
                {pts > 0 ? `+${pts}` : pts}
              </span>
            ),
          },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (v) => (
              <Tag color={v === 'APPROVED' ? 'green' : v === 'REJECTED' ? 'red' : 'gold'}>
                {STATUS_LABELS[v] || v}
              </Tag>
            ),
          },
          {
            title: 'Thao tác',
            render: (_, r) =>
              canReview && r.status === 'PENDING' ? (
                <Space>
                  <Button
                    size="small"
                    type="primary"
                    onClick={async () => {
                      const x = await reviewRewardApi(r._id, { status: 'APPROVED' });
                      if (x?.EC === 0) {
                        message.success('Đã duyệt khen thưởng/kỷ luật');
                        load();
                      } else message.error(x?.EM);
                    }}
                  >
                    Duyệt
                  </Button>
                  <Button
                    size="small"
                    danger
                    onClick={async () => {
                      const x = await reviewRewardApi(r._id, { status: 'REJECTED' });
                      if (x?.EC === 0) {
                        message.success('Đã từ chối');
                        load();
                      } else message.error(x?.EM);
                    }}
                  >
                    Từ chối
                  </Button>
                </Space>
              ) : null,
          },
        ].filter((c) => c.title)}
      />

      <Modal
        open={open}
        title="Ghi nhận Khen thưởng / Kỷ luật"
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="Lưu ghi nhận"
        cancelText="Hủy"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            const r = await createRewardApi(v);
            if (r?.EC === 0) {
              setOpen(false);
              load();
              message.success('Đã tạo bản ghi khen thưởng / kỷ luật');
            } else message.error(r?.EM || 'Thao tác thất bại');
          }}
        >
          <Form.Item name="classId" label="Lớp học" rules={[{ required: true, message: 'Chọn lớp' }]}>
            <Select
              placeholder="Chọn lớp"
              options={classes.map((c) => ({ value: c._id, label: c.name }))}
              onChange={async (id) => {
                form.setFieldValue('studentId', undefined);
                const r = await getClassStudentsApi(id);
                if (r?.EC === 0) setStudents(r.data || []);
                else setStudents([]);
              }}
            />
          </Form.Item>
          <Form.Item name="studentId" label="Học sinh" rules={[{ required: true, message: 'Chọn học sinh' }]}>
            <Select
              placeholder={students.length ? 'Chọn học sinh' : 'Vui lòng chọn lớp trước'}
              options={students.map((s) => ({ value: s._id, label: `${s.name} (${s.code || 'HS'})` }))}
              disabled={!students.length}
            />
          </Form.Item>
          <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true, message: 'Chọn năm học' }]}>
            <Select placeholder="Chọn năm học" options={years.map((y) => ({ value: y._id, label: y.name }))} />
          </Form.Item>
          <Form.Item name="type" label="Hình thức" rules={[{ required: true }]} initialValue="REWARD">
            <Select
              options={[
                { value: 'REWARD', label: 'Khen thưởng (Thành tích, gương người tốt việc tốt)' },
                { value: 'DISCIPLINE', label: 'Kỷ luật (Vi phạm nội quy trường lớp)' },
              ]}
            />
          </Form.Item>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
            <Input maxLength={200} placeholder="VD: Đạt giải Nhất thi học sinh giỏi cấp Huyện..." />
          </Form.Item>
          <Form.Item name="description" label="Mô tả chi tiết">
            <Input.TextArea rows={3} maxLength={2000} placeholder="Chi tiết sự việc, căn cứ khen thưởng/kỷ luật..." />
          </Form.Item>
          <Form.Item name="points" label="Điểm rèn luyện (+ / -)" initialValue={5}>
            <InputNumber min={-100} max={100} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RewardsPage;
