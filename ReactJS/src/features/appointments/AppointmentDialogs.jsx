import { Form, Input, InputNumber, Modal, Select, Space, message } from 'antd';
import { createAppointmentApi, submitSurveyApi } from '../../services/api/scheduling.api';

const AppointmentDialogs = ({ open, setOpen, form, students, teachers, load, survey, setSurvey, surveyForm }) => (
  <>
      {/* Modal đặt lịch hẹn */}
      <Modal
        open={open}
        title="Đặt lịch hẹn trao đổi với giáo viên"
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="Gửi yêu cầu đặt lịch"
        cancelText="Hủy"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (v) => {
            const res = await createAppointmentApi(v);
            if (res?.EC === 0) {
              setOpen(false);
              message.success('Đã gửi yêu cầu đặt lịch hẹn');
              load();
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="studentId" label="Học sinh (con/em)" rules={[{ required: true, message: 'Chọn học sinh' }]}>
            <Select
              placeholder="Chọn học sinh"
              options={students.map((s) => ({ value: s._id, label: `${s.name} (${s.code || 'HS'})` }))}
            />
          </Form.Item>
          <Form.Item name="teacherId" label="Giáo viên cần gặp" rules={[{ required: true, message: 'Chọn giáo viên' }]}>
            <Select
              placeholder="Chọn giáo viên"
              options={teachers.map((t) => ({ value: t._id, label: `${t.name} (${t.email})` }))}
            />
          </Form.Item>
          <Form.Item name="scheduledAt" label="Thời gian hẹn" rules={[{ required: true, message: 'Chọn thời gian' }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Space style={{ width: '100%' }}>
            <Form.Item name="durationMinutes" label="Thời lượng (phút)" initialValue={30} style={{ minWidth: 160 }}>
              <InputNumber min={15} max={120} step={15} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="mode" label="Hình thức gặp" initialValue="ONLINE" style={{ minWidth: 160 }}>
              <Select
                options={[
                  { value: 'ONLINE', label: 'Trực tuyến (Online)' },
                  { value: 'OFFLINE', label: 'Gặp trực tiếp tại trường' },
                ]}
              />
            </Form.Item>
          </Space>
          <Form.Item name="reason" label="Lý do / Nội dung cần trao đổi" rules={[{ required: true, message: 'Nhập lý do' }]}>
            <Input.TextArea rows={3} maxLength={1000} placeholder="Trình bày vắn tắt nội dung phụ huynh muốn trao đổi với giáo viên..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal khảo sát hài lòng */}
      <Modal
        open={!!survey}
        title="Khảo sát mức độ hài lòng buổi trao đổi"
        onCancel={() => setSurvey(null)}
        onOk={() => surveyForm.submit()}
        okText="Gửi đánh giá"
        cancelText="Hủy"
      >
        <Form
          form={surveyForm}
          layout="vertical"
          onFinish={async (v) => {
            const res = await submitSurveyApi(survey._id, v);
            if (res?.EC === 0) {
              setSurvey(null);
              message.success('Đã gửi đánh giá khảo sát. Cảm ơn bạn!');
            } else message.error(res?.EM);
          }}
        >
          <Form.Item name="rating" label="Đánh giá mức độ hài lòng (1 - 5 sao)" rules={[{ required: true }]}>
            <InputNumber min={1} max={5} style={{ width: '100%' }} placeholder="Cho điểm từ 1 đến 5" />
          </Form.Item>
          <Form.Item name="comment" label="Nhận xét / Ý kiến đóng góp">
            <Input.TextArea rows={4} maxLength={2000} placeholder="Nhận xét về thái độ, nội dung buổi làm việc..." />
          </Form.Item>
        </Form>
      </Modal>
  </>
);

export default AppointmentDialogs;
