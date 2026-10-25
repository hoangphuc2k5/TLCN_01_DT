import { Form, Input, Modal, Select, message } from 'antd';
import { createClassActivityApi } from '../../services/api/administration.api';
import { createParentMeetingApi, rsvpParentMeetingApi } from '../../services/api/studentLife.api';

const ClassLifeDialogs = ({ activityOpen, setActivityOpen, activityForm, selectClass, selectYear, load, meetingOpen, setMeetingOpen, meetingForm, rsvpTarget, setRsvpTarget, rsvpForm }) => (
  <>
      {/* Modal tạo hoạt động lớp */}
      <Modal
        open={activityOpen}
        title="Tạo hoạt động lớp mới"
        onCancel={() => setActivityOpen(false)}
        onOk={() => activityForm.submit()}
        okText="Tạo hoạt động"
        cancelText="Hủy"
      >
        <Form
          form={activityForm}
          layout="vertical"
          onFinish={async (v) => {
            const r = await createClassActivityApi({
              ...v,
              scheduledAt: new Date(v.scheduledAt).toISOString(),
            });
            if (r?.EC === 0) {
              message.success('Tạo hoạt động thành công');
              setActivityOpen(false);
              activityForm.resetFields();
              load();
            } else message.error(r?.EM);
          }}
        >
          <Form.Item name="classId" label="Lớp học" rules={[{ required: true, message: 'Chọn lớp' }]}>
            {selectClass}
          </Form.Item>
          <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true, message: 'Chọn năm học' }]}>
            {selectYear}
          </Form.Item>
          <Form.Item name="title" label="Tiêu đề hoạt động" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
            <Input placeholder="VD: Sinh hoạt cuối tuần, Tham quan dã ngoại..." />
          </Form.Item>
          <Form.Item name="scheduledAt" label="Thời gian diễn ra" rules={[{ required: true, message: 'Chọn thời gian' }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="agenda" label="Kế hoạch / Nội dung chi tiết">
            <Input.TextArea rows={3} placeholder="Mô tả nội dung chương trình..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal lên lịch họp phụ huynh */}
      <Modal
        open={meetingOpen}
        title="Lên lịch họp phụ huynh"
        onCancel={() => setMeetingOpen(false)}
        onOk={() => meetingForm.submit()}
        okText="Lên lịch họp"
        cancelText="Hủy"
      >
        <Form
          form={meetingForm}
          layout="vertical"
          onFinish={async (v) => {
            const r = await createParentMeetingApi({
              ...v,
              scheduledAt: new Date(v.scheduledAt).toISOString(),
            });
            if (r?.EC === 0) {
              message.success('Lên lịch họp thành công');
              setMeetingOpen(false);
              meetingForm.resetFields();
              load();
            } else message.error(r?.EM);
          }}
        >
          <Form.Item name="classId" label="Lớp học" rules={[{ required: true, message: 'Chọn lớp' }]}>
            {selectClass}
          </Form.Item>
          <Form.Item name="academicYearId" label="Năm học" rules={[{ required: true, message: 'Chọn năm học' }]}>
            {selectYear}
          </Form.Item>
          <Form.Item name="title" label="Tiêu đề cuộc họp" rules={[{ required: true, message: 'Nhập tiêu đề' }]}>
            <Input placeholder="VD: Họp phụ huynh đầu năm học..." />
          </Form.Item>
          <Form.Item name="scheduledAt" label="Thời gian bắt đầu" rules={[{ required: true, message: 'Chọn thời gian' }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="meetingUrl" label="Đường link họp trực tuyến (Google Meet, Zoom, MS Teams...)">
            <Input placeholder="https://meet.google.com/..." />
          </Form.Item>
          <Form.Item name="agenda" label="Nội dung chương trình họp">
            <Input.TextArea rows={3} placeholder="Các nội dung chính cần thảo luận..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal phản hồi họp phụ huynh (RSVP) */}
      <Modal
        open={!!rsvpTarget}
        title="Phản hồi tham gia họp phụ huynh"
        onCancel={() => setRsvpTarget(null)}
        onOk={() => rsvpForm.submit()}
        okText="Gửi phản hồi"
        cancelText="Hủy"
      >
        <Form
          form={rsvpForm}
          layout="vertical"
          onFinish={async (v) => {
            const r = await rsvpParentMeetingApi(rsvpTarget._id, v);
            if (r?.EC === 0) {
              message.success('Đã gửi phản hồi tham gia họp');
              setRsvpTarget(null);
              load();
            } else message.error(r?.EM);
          }}
        >
          <Form.Item name="status" label="Xác nhận tham gia" initialValue="GOING" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'GOING', label: 'Sẽ tham gia cuộc họp' },
                { value: 'MAYBE', label: 'Có thể tham gia (chưa chắc chắn)' },
                { value: 'DECLINED', label: 'Không thể tham gia (bận việc đột xuất)' },
              ]}
            />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú / Lý do (nếu có)">
            <Input.TextArea rows={3} placeholder="Để lại lời nhắn cho giáo viên chủ nhiệm..." />
          </Form.Item>
        </Form>
      </Modal>
  </>
);

export default ClassLifeDialogs;
