const eventBus = require('../patterns/eventBus');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { ROLES } = require('../constants/roles');
const { ATTENDANCE_STATUS } = require('../constants/status');

const registerEventListeners = () => {
  eventBus.on('attendance.recorded', async ({ schoolId, classId, records, date }) => {
    try {
      const absent = (records || []).filter(
        (r) =>
          r.status === ATTENDANCE_STATUS.ABSENT_UNEXCUSED ||
          r.status === ATTENDANCE_STATUS.LATE
      );
      for (const item of absent) {
        const parents = await User.find({
          role: ROLES.PARENT,
          parentOf: item.studentId,
          schoolId,
        });
        const student = await User.findById(item.studentId).select('name');
        const title = 'Cảnh báo chuyên cần';
        const message = `${student?.name || 'Học sinh'} bị ghi nhận ${item.status} ngày ${new Date(date).toLocaleDateString('vi-VN')}`;
        await Promise.all(
          parents.map(async (parent) => {
            await Notification.create({
              userId: parent._id,
              schoolId,
              title,
              message,
              type: 'ATTENDANCE',
              emailState: 'PENDING',
              meta: { classId, studentId: item.studentId, status: item.status },
            });
          })
        );
      }
    } catch (err) {
      console.error('[eventBus] attendance.recorded', err.message);
    }
  });

  eventBus.on('announcement.created', async ({ announcement, recipients }) => {
    try {
      if (!recipients?.length) return;
      await Notification.insertMany(
        recipients.map((userId) => ({
          userId,
          schoolId: announcement.schoolId,
          title: announcement.title,
          message: announcement.content.slice(0, 200),
          type: 'ANNOUNCEMENT',
          emailState: 'PENDING',
          meta: { announcementId: announcement._id },
        }))
      );
    } catch (err) {
      console.error('[eventBus] announcement.created', err.message);
    }
  });

  eventBus.on('leave.reviewed', async ({ leave, requesterId }) => {
    try {
      const title = 'Kết quả duyệt đơn';
      const message = `Đơn của bạn đã được ${leave.status === 'APPROVED' ? 'duyệt' : 'từ chối'}.`;
      await Notification.create({
        userId: requesterId,
        schoolId: leave.schoolId,
        title,
        message,
        type: 'LEAVE',
        emailState: 'PENDING',
        meta: { leaveId: leave._id, status: leave.status },
      });
    } catch (err) {
      console.error('[eventBus] leave.reviewed', err.message);
    }
  });

  console.log('Event listeners registered (Observer + durable email intent)');
};

module.exports = registerEventListeners;
