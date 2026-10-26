import { Form, Input, InputNumber, Modal, Select, message } from 'antd';
import { createAcademicYearApi, createAssignmentApi, createClassApi, createSubjectApi } from '../../services/api.service';

const ClassAdminDialogs = ({ openClass, setOpenClass, classForm, years, load, openSubject, setOpenSubject, subjectForm, openAssign, setOpenAssign, assignForm, teachers, classes, subjects, openYear, setOpenYear, yearForm }) => (
  <>
      <Modal open={openClass} title="Thêm lớp" onCancel={() => setOpenClass(false)} onOk={() => classForm.submit()}>
        <Form
          form={classForm}
          layout="vertical"
          onFinish={async (v) => {
            const res = await createClassApi(v);
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpenClass(false);
              classForm.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="name" label="Tên lớp" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="gradeLevel" label="Khối" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} max={12} />
          </Form.Item>
          <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true }]}>
            <Select options={years.map((y) => ({ value: y._id, label: y.name }))} />
          </Form.Item>
          <Form.Item name="room" label="Phòng">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={openSubject} title="Thêm môn" onCancel={() => setOpenSubject(false)} onOk={() => subjectForm.submit()}>
        <Form
          form={subjectForm}
          layout="vertical"
          onFinish={async (v) => {
            const res = await createSubjectApi(v);
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpenSubject(false);
              subjectForm.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="code" label="Mã môn" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Tên môn" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={openAssign} title="Phân công" onCancel={() => setOpenAssign(false)} onOk={() => assignForm.submit()}>
        <Form
          form={assignForm}
          layout="vertical"
          onFinish={async (v) => {
            const res = await createAssignmentApi(v);
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpenAssign(false);
              assignForm.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="teacherId" label="Giáo viên" rules={[{ required: true }]}>
            <Select options={teachers.map((t) => ({ value: t._id, label: t.name }))} />
          </Form.Item>
          <Form.Item name="classId" label="Lớp" rules={[{ required: true }]}>
            <Select options={classes.map((c) => ({ value: c._id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="subjectId" label="Môn" rules={[{ required: true }]}>
            <Select options={subjects.map((s) => ({ value: s._id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true }]}>
            <Select options={years.map((y) => ({ value: y._id, label: y.name }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={openYear} title="Thêm năm học" onCancel={() => setOpenYear(false)} onOk={() => yearForm.submit()}>
        <Form
          form={yearForm}
          layout="vertical"
          onFinish={async (v) => {
            const res = await createAcademicYearApi({ ...v, isCurrent: true });
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpenYear(false);
              yearForm.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="name" label="Tên năm học" rules={[{ required: true }]}>
            <Input placeholder="2025-2026" />
          </Form.Item>
          <Form.Item name="startDate" label="Ngày bắt đầu" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="endDate" label="Ngày kết thúc" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>
  </>
);

export default ClassAdminDialogs;
