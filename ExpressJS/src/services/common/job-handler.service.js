function createJobHandlerService(dependencies) {
  const systemRepository = dependencies.repositories.system;
  const mail = dependencies.services.mail;
  const files = dependencies.services.file;
  const roleService = dependencies.services.role;
  const failure = code => Object.assign(new Error(code), { code });

  const NOTIFICATION_EMAIL = async job => {
    const notification = await systemRepository.findNotification({
      _id: job.resourceId,
      schoolId: job.schoolId,
      emailState: { $in: ['PENDING', 'ENQUEUED'] },
    });
    if (!notification) return { skipped: true, outcome: 'NOTIFICATION_REMOVED' };
    const user = await systemRepository.findUserById(notification.userId);
    if (!user || user.status !== 'ACTIVE') return { skipped: true, outcome: 'RECIPIENT_INACTIVE' };
    const role = await systemRepository.findRole({ code: user.role, status: 'ACTIVE' });
    if (!role || !roleService.visibleRole(user, role)) {
      return { skipped: true, outcome: 'RECIPIENT_INACTIVE' };
    }
    if (
      String(user.schoolId) !== String(notification.schoolId)
      && !['SUPER_ADMIN', 'CLUSTER_ADMIN'].includes(user.role)
    ) {
      return { skipped: true, outcome: 'RECIPIENT_SCOPE_CHANGED' };
    }
    if (
      user.role === 'CLUSTER_ADMIN'
      && notification.schoolId
      && !await systemRepository.schoolExists({
        _id: notification.schoolId,
        clusterId: user.clusterId,
      })
    ) {
      return { skipped: true, outcome: 'RECIPIENT_SCOPE_CHANGED' };
    }
    try {
      const result = await mail.notifyUserByEmail(user, {
        title: notification.title,
        message: notification.message,
        messageId: `<job-${job._id}@school-ms.local>`,
      });
      if (result.skipped && result.reason === 'unconfigured') throw failure('SMTP_UNCONFIGURED');
      return {
        skipped: result.skipped,
        outcome: result.skipped ? 'RECIPIENT_NOT_DELIVERABLE' : 'EMAIL_SENT',
      };
    } catch (error) {
      throw failure(error.code === 'SMTP_UNCONFIGURED' ? error.code : 'SMTP_SEND_FAILED');
    }
  };

  const FILE_DELETE = async job => {
    const asset = await systemRepository.findFileAsset({
      _id: job.resourceId,
      schoolId: job.schoolId,
    });
    if (!asset) return { outcome: 'FILE_ALREADY_REMOVED' };
    if (asset.status !== 'DELETING') return { skipped: true, outcome: 'FILE_NOT_DELETING' };
    try {
      await files.purgeAsset(asset);
      return { outcome: 'FILE_REMOVED' };
    } catch {
      throw failure('FILE_DELETE_FAILED');
    }
  };

  return { NOTIFICATION_EMAIL, FILE_DELETE };
}

class JobHandlerService {
  constructor(dependencies) {
    Object.assign(this, createJobHandlerService(dependencies));
  }
}

module.exports = JobHandlerService;
