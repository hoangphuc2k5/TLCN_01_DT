import { Form, InputNumber, Modal, Select, Space, message } from 'antd';
import { getClassStudentsApi, upsertGradeApi } from '../../services/api.service';

const GradeEntryModal = ({ open, setOpen, form, years, classes, students, setStudents, subjects, load }) => (
      <Modal
        open={open}
        title="Nhập điểm"
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        width={640}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            const scores = [
              { type: 'ORAL', score: v.oral, weight: 1 },
              { type: 'QUIZ_15', score: v.quiz, weight: 1 },
              { type: 'MIDTERM', score: v.midterm, weight: 2 },
              { type: 'FINAL', score: v.final, weight: 3 },
            ].filter((s) => s.score != null);
            const res = await upsertGradeApi({
              academicYearId: v.academicYearId,
              classId: v.classId,
              subjectId: v.subjectId,
              studentId: v.studentId,
              semester: v.semester || 1,
              scores,
              strategy: 'weighted',
            });
            if (res?.EC === 0) {
              message.success(res.EM);
              setOpen(false);
              form.resetFields();
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true }]}>
            <Select options={years.map((y) => ({ value: y._id, label: y.name }))} />
          </Form.Item>
          <Form.Item name="classId" label="Lớp" rules={[{ required: true }]}>
            <Select
              options={classes.map((c) => ({ value: c._id, label: c.name }))}
              onChange={async (id) => {
                form.setFieldValue('studentId', undefined);
                setStudents([]);
                const res = await getClassStudentsApi(id);
                if (res?.EC === 0) setStudents(res.data || []);
              }}
            />
          </Form.Item>
          <Form.Item name="studentId" label="Học sinh" rules={[{ required: true }]}>
            <Select options={students.map((s) => ({ value: s._id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="subjectId" label="Môn" rules={[{ required: true }]}>
            <Select options={subjects.map((s) => ({ value: s._id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="semester" label="Học kỳ" initialValue={1}>
            <Select
              options={[
                { value: 1, label: 'HK1' },
                { value: 2, label: 'HK2' },
              ]}
            />
          </Form.Item>
          <Space wrap>
            <Form.Item name="oral" label="Miệng">
              <InputNumber min={0} max={10} step={0.1} />
            </Form.Item>
            <Form.Item name="quiz" label="15 phút">
              <InputNumber min={0} max={10} step={0.1} />
            </Form.Item>
            <Form.Item name="midterm" label="Giữa kỳ">
              <InputNumber min={0} max={10} step={0.1} />
            </Form.Item>
            <Form.Item name="final" label="Cuối kỳ">
              <InputNumber min={0} max={10} step={0.1} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
);

export default GradeEntryModal;
