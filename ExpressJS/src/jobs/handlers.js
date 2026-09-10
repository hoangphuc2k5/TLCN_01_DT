const Notification = require('../models/Notification');
const User = require('../models/User');
const Role = require('../models/Role');
const School = require('../models/School');
const FileAsset = require('../models/FileAsset');
const mail = require('../services/mailService');
const files = require('../services/fileService');
const failure = code => Object.assign(new Error(code), { code });

module.exports = {
  NOTIFICATION_EMAIL: async job => {
    const notification = await Notification.findOne({ _id: job.resourceId, schoolId: job.schoolId, emailState: { $in: ['PENDING', 'ENQUEUED'] } });
    if (!notification) return { skipped: true, outcome: 'NOTIFICATION_REMOVED' };
    const user = await User.findById(notification.userId);
    if (!user || user.status !== 'ACTIVE') return { skipped: true, outcome: 'RECIPIENT_INACTIVE' };
    const role = await Role.findOne({ code: user.role, status: 'ACTIVE' });
    if (!role || !require('../services/roleService').visibleRole(user, role)) return { skipped: true, outcome: 'RECIPIENT_INACTIVE' };
    if (String(user.schoolId) !== String(notification.schoolId) && !['SUPER_ADMIN', 'CLUSTER_ADMIN'].includes(user.role)) return { skipped: true, outcome: 'RECIPIENT_SCOPE_CHANGED' };
    if (user.role === 'CLUSTER_ADMIN' && notification.schoolId && !await School.exists({ _id: notification.schoolId, clusterId: user.clusterId })) return { skipped: true, outcome: 'RECIPIENT_SCOPE_CHANGED' };
    try {
      const result = await mail.notifyUserByEmail(user, { title: notification.title, message: notification.message, messageId: `<job-${job._id}@school-ms.local>` });
      if (result.skipped && result.reason === 'unconfigured') throw failure('SMTP_UNCONFIGURED');
      return { skipped: result.skipped, outcome: result.skipped ? 'RECIPIENT_NOT_DELIVERABLE' : 'EMAIL_SENT' };
    } catch (error) { throw failure(error.code === 'SMTP_UNCONFIGURED' ? error.code : 'SMTP_SEND_FAILED'); }
  },
  FILE_DELETE: async job => {
    const asset = await FileAsset.findOne({ _id: job.resourceId, schoolId: job.schoolId });
    if (!asset) return { outcome: 'FILE_ALREADY_REMOVED' };
    if (asset.status !== 'DELETING') return { skipped: true, outcome: 'FILE_NOT_DELETING' };
    try { await files.purgeAsset(asset); return { outcome: 'FILE_REMOVED' }; }
    catch { throw failure('FILE_DELETE_FAILED'); }
  },
};
