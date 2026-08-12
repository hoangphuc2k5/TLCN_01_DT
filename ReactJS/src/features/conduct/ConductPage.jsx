import { useEffect, useState } from 'react';
import { Button, Form, Input, Modal, Select, Table, Tag, message } from 'antd';
import { useSelector } from 'react-redux';
import {
  getAcademicYearsApi,
  getClassStudentsApi,
  getClassesApi,
  getConductApi,
  upsertConductApi,
} from '../../api';
import { ROLES } from '../../constants/roles';

const ratingLabel = {
  TOT: 'Tốt',
  KHA: 'Khá',
  TRUNG_BINH: 'Trung bình',
  YEU: 'Yếu',
};

const ConductPage = () => {
  const { user } = useSelector((s) => s.auth);
  const canManage = [ROLES.HOMEROOM_TEACHER, ROLES.SCHOOL_ADMIN].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [years, setYears] = useState([]);
  const [students, setStudents] = useState([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    const res = await getConductApi();
    if (res?.EC === 0) setRows(res.data || []);
  };

  useEffect(() => {
    (async () => {
      if (canManage) {
        const [c, y] = await Promise.all([getClassesApi(), getAcademicYearsApi()]);
        if (c?.EC === 0) setClasses(c.data || []);
        if (y?.EC === 0) setYears(y.data || []);
      }
      load();
    })();
  }, []);

  return (
    <div>
      {canManage && (
        <Button type="primary" style={{ marginBottom: 16 }} onClick={() => setOpen(true)}>
          Nhập hạnh kiểm
        </Button>
      )}
      <Table
        rowKey="_id"
        dataSource={rows}
        columns={[
          { title: 'Học sinh', render: (_, r) => r.studentId?.name },
          { title: 'Lớp', render: (_, r) => r.classId?.name },
          { title: 'Năm học', render: (_, r) => r.academicYearId?.name },
          { title: 'HK', dataIndex: 'semester' },
          {
            title: 'Xếp loại',
            dataIndex: 'rating',
            render: (v) => <Tag color="blue">{ratingLabel[v] || v}</Tag>,
          },
          { title: 'Nhận xét', dataIndex: 'comment' },
          { title: 'GVCN', render: (_, r) => r.recordedBy?.name },
        ]}
      />
      <Modal open={open} title="Hạnh kiểm" onCancel={() => setOpen(false)} onOk={() => form.submit()}>
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            const res = await upsertConductApi(v);
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpen(false);
              form.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="classId" label="Lớp">
            <Select
              options={classes.map((c) => ({ value: c._id, label: c.name }))}
              onChange={async (id) => {
                const res = await getClassStudentsApi(id);
                if (res?.EC === 0) setStudents(res.data || []);
              }}
            />
          </Form.Item>
          <Form.Item name="studentId" label="Học sinh" rules={[{ required: true }]}>
            <Select options={students.map((s) => ({ value: s._id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true }]}>
            <Select options={years.map((y) => ({ value: y._id, label: y.name }))} />
          </Form.Item>
          <Form.Item name="semester" label="Học kỳ" initialValue={1}>
            <Select
              options={[
                { value: 1, label: 'HK1' },
                { value: 2, label: 'HK2' },
              ]}
            />
          </Form.Item>
          <Form.Item name="rating" label="Xếp loại" rules={[{ required: true }]}>
            <Select
              options={Object.entries(ratingLabel).map(([value, label]) => ({ value, label }))}
            />
          </Form.Item>
          <Form.Item name="comment" label="Nhận xét">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ConductPage;
