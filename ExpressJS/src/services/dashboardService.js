const DashboardFactory = require('../patterns/dashboardFactory');
const { notificationRepo } = require('../repositories');
const ApiError = require('../utils/ApiError');

const getDashboard = async (user) => {
  const builder = DashboardFactory.create(user.role);
  return builder.build(user);
};

const listNotifications = async (user) => {
  return notificationRepo.find(
    { userId: user._id },
    { sort: { createdAt: -1 }, limit: 50 }
  );
};

const markRead = async (user, id) => {
  const n = await notificationRepo.findById(id);
  if (!n) throw new ApiError(404, 'Không tìm thấy thông báo');
  if (String(n.userId) !== String(user._id)) throw new ApiError(403, 'Không có quyền');
  return notificationRepo.updateById(id, { isRead: true });
};

const markAllRead = async (user) => {
  await require('../models/Notification').updateMany(
    { userId: user._id, isRead: false },
    { isRead: true }
  );
  return true;
};

module.exports = { getDashboard, listNotifications, markRead, markAllRead };
