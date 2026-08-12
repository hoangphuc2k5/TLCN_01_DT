import { useEffect, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, message } from 'antd';
import { useSelector } from 'react-redux';
import {
  approveTimetableApi,
  getAcademicYearsApi,
  getClassesApi,
  getSubjectsApi,
  getTimetablesApi,
  getUsersApi,
  upsertTimetableApi,
} from '../../api';
import { ROLES } from '../../constants/roles';

const dayLabels = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 7: 'CN' };

const TimetablePage = () => {
  const { user } = useSelector((s) => s.auth);
  const canEdit = [ROLES.ACADEMIC_AFFAIRS, ROLES.SCHOOL_ADMIN].includes(user?.role);
  const canApprove = user?.role === ROLES.SCHOOL_ADMIN;
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [years, setYears] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState([]);
  const [form] = Form.useForm();
  const [slotForm] = Form.useForm();

  const load = async () => {
    const res = await getTimetablesApi();
    if (res?.EC === 0) setRows(res.data || []);
  };

  useEffect(() => {
    (async () => {
      const [c, s, y, t] = await Promise.all([
        getClassesApi(),
        getSubjectsApi(),
        getAcademicYearsApi(),
        getUsersApi({ role: ROLES.SUBJECT_TEACHER }),
      ]);
      if (c?.EC === 0) setClasses(c.data || []);
      if (s?.EC === 0) setSubjects(s.data || []);
      if (y?.EC === 0) setYears(y.data || []);
      if (t?.EC === 0) setTeachers(t.data || []);
      load();
    })();
  }, []);

  return (
    <div>
      {canEdit && (
        <Button
          type="primary"
          style={{ marginBottom: 16 }}
          onClick={() => {
            setSlots([]);
            form.resetFields();
            setOpen(true);
          }}
        >
          Lập / cập nhật TKB
        </Button>
      )}
      <Table
        rowKey="_id"
        dataSource={rows}
        columns={[
          { title: 'Lớp', render: (_, r) => r.classId?.name },
          { title: 'Năm học', render: (_, r) => r.academicYearId?.name },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (v) => <Tag color={v === 'APPROVED' ? 'green' : 'default'}>{v}</Tag>,
          },
          { title: 'Số tiết', render: (_, r) => r.slots?.length || 0 },
          canApprove
            ? {
                title: 'Duyệt',
                render: (_, r) =>
                  r.status !== 'APPROVED' ? (
                    <Button
                      size="small"
                      type="primary"
                      onClick={async () => {
                        const res = await approveTimetableApi(r._id);
                        if (res?.EC === 0) {
                          message.success(res.EM);
                          load();
                        } else message.error(res?.EM);
                      }}
                    >
                      Duyệt
                    </Button>
                  ) : null,
              }
            : {},
        ].filter((c) => c.title)}
        expandable={{
          expandedRowRender: (r) => (
            <Table
              size="small"
              pagination={false}
              rowKey={(_, i) => i}
              dataSource={r.slots || []}
              columns={[
                { title: 'Thứ', dataIndex: 'dayOfWeek', render: (v) => dayLabels[v] || v },
                { title: 'Tiết', dataIndex: 'period' },
                { title: 'Môn', render: (_, s) => s.subjectId?.name },
                { title: 'GV', render: (_, s) => s.teacherId?.name },
                { title: 'Phòng', dataIndex: 'room' },
              ]}
            />
          ),
        }}
      />

      <Modal
        open={open}
        title="Lập thời khóa biểu"
        width={720}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            const res = await upsertTimetableApi({
              ...v,
              slots,
              status: 'DRAFT',
            });
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpen(false);
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true }]}>
            <Select options={years.map((y) => ({ value: y._id, label: y.name }))} />
          </Form.Item>
          <Form.Item name="classId" label="Lớp" rules={[{ required: true }]}>
            <Select options={classes.map((c) => ({ value: c._id, label: c.name }))} />
          </Form.Item>
        </Form>

        <Form
          form={slotForm}
          layout="inline"
          style={{ marginBottom: 12, gap: 8, flexWrap: 'wrap' }}
          onFinish={(v) => {
            setSlots((prev) => [...prev, v]);
            slotForm.resetFields();
          }}
        >
          <Form.Item name="dayOfWeek" rules={[{ required: true }]}>
            <Select
              placeholder="Thứ"
              style={{ width: 90 }}
              options={Object.entries(dayLabels).map(([k, v]) => ({ value: Number(k), label: v }))}
            />
          </Form.Item>
          <Form.Item name="period" rules={[{ required: true }]}>
            <InputNumber min={1} max={10} placeholder="Tiết" />
          </Form.Item>
          <Form.Item name="subjectId" rules={[{ required: true }]}>
            <Select
              placeholder="Môn"
              style={{ width: 120 }}
              options={subjects.map((s) => ({ value: s._id, label: s.name }))}
            />
          </Form.Item>
          <Form.Item name="teacherId" rules={[{ required: true }]}>
            <Select
              placeholder="GV"
              style={{ width: 140 }}
              options={teachers.map((t) => ({ value: t._id, label: t.name }))}
            />
          </Form.Item>
          <Form.Item name="room">
            <Input placeholder="Phòng" style={{ width: 90 }} />
          </Form.Item>
          <Button htmlType="submit">Thêm tiết</Button>
        </Form>

        <Table
          size="small"
          pagination={false}
          rowKey={(_, i) => i}
          dataSource={slots}
          columns={[
            { title: 'Thứ', dataIndex: 'dayOfWeek', render: (v) => dayLabels[v] },
            { title: 'Tiết', dataIndex: 'period' },
            {
              title: 'Môn',
              dataIndex: 'subjectId',
              render: (v) => subjects.find((s) => s._id === v)?.name,
            },
            {
              title: 'GV',
              dataIndex: 'teacherId',
              render: (v) => teachers.find((t) => t._id === v)?.name,
            },
            { title: 'Phòng', dataIndex: 'room' },
            {
              title: '',
              render: (_, __, idx) => (
                <Button size="small" danger onClick={() => setSlots((p) => p.filter((_, i) => i !== idx))}>
                  Xóa
                </Button>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default TimetablePage;
