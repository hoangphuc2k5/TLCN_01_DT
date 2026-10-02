const eventBus = require("./event-bus.config");
const container = require("../container");
const systemRepository = container.repositories.system;
const logger = container.logger;
const { ROLES } = require("../constants/roles.config");
const { ATTENDANCE_STATUS } = require("../constants/status.config");

const registerEventListeners = () => {
  eventBus.on('attendance.recorded', async ({ schoolId, classId, records, date }) => {
    try {
      const absent = (records || []).filter(
        (r) =>
          r.status === ATTENDANCE_STATUS.ABSENT_UNEXCUSED ||
          r.status === ATTENDANCE_STATUS.LATE
      );
      for (const item of absent) {
        const parents = await systemRepository.findUsers({
          role: ROLES.PARENT,
          parentOf: item.studentId,
          schoolId,
        });
        const student = await systemRepository.findUserById(item.studentId, 'name');
        const title = 'Cảnh báo chuyên cần';
        const message = `${student?.name || 'Học sinh'} bị ghi nhận ${item.status} ngày ${new Date(date).toLocaleDateString('vi-VN')}`;
        await Promise.all(
          parents.map(async (parent) => {
            await systemRepository.createNotification({
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
      logger.error('[eventBus] attendance.recorded', err.message);
    }
  });

  eventBus.on('announcement.created', async ({ announcement, recipients }) => {
    try {
      if (!recipients?.length) return;
      await systemRepository.insertNotifications(
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
      logger.error('[eventBus] announcement.created', err.message);
    }
  });

  eventBus.on('leave.reviewed', async ({ leave, requesterId }) => {
    try {
      const title = 'Kết quả duyệt đơn';
      const message = `Đơn của bạn đã được ${leave.status === 'CANCELLED' ? 'hủy lịch bù' : leave.status === 'APPROVED' ? 'duyệt' : 'từ chối'}.`;
      await systemRepository.createNotification({
        userId: requesterId,
        schoolId: leave.schoolId,
        title,
        message,
        type: 'LEAVE',
        emailState: 'PENDING',
        meta: { leaveId: leave._id, status: leave.status },
      });
    } catch (err) {
      logger.error('[eventBus] leave.reviewed', err.message);
    }
  });

  logger.info('Event listeners registered (Observer + durable email intent)');
};

module.exports = registerEventListeners;
