const eventBus = require('../patterns/eventBus');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { ROLES } = require('../constants/roles');
const { ATTENDANCE_STATUS } = require('../constants/status');
const { notifyUserByEmail } = require('../services/mailService');

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
              meta: { classId, studentId: item.studentId, status: item.status },
            });
            await notifyUserByEmail(parent, { title, message }).catch(() => {});
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
          meta: { announcementId: announcement._id },
        }))
      );
      const users = await User.find({ _id: { $in: recipients } }).select('email name');
      await Promise.all(
        users.slice(0, 50).map((u) =>
          notifyUserByEmail(u, {
            title: announcement.title,
            message: announcement.content.slice(0, 300),
          }).catch(() => {})
        )
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
        meta: { leaveId: leave._id, status: leave.status },
      });
      const requester = await User.findById(requesterId).select('email name');
      if (requester) await notifyUserByEmail(requester, { title, message }).catch(() => {});
    } catch (err) {
      console.error('[eventBus] leave.reviewed', err.message);
    }
  });

  console.log('Event listeners registered (Observer + Gmail mail)');
};

module.exports = registerEventListeners;
