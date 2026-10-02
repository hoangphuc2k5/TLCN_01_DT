function createJobService(dependencies) {
  const persistence = dependencies.persistence;
  const { randomUUID } = require('node:crypto');
  const jobStatuses = ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'SKIPPED'];
  const ApiError = require("../../utils/common/http/api-error.util");
  const config = require("../../config/jobs/jobs.config");
  const { objectId, schoolScope } = dependencies.services["data-scope"];
  
  const scheduleDate = (value, now = new Date()) => {
    const date = value === undefined ? now : new Date(value);
    if (!Number.isFinite(date.getTime()) || date < now || date.getTime() - now.getTime() > 366 * 86400000) throw new ApiError(400, 'Lịch chạy phải từ hiện tại đến tối đa 366 ngày');
    return date;
  };
  const enqueue = async ({ schoolId = null, kind, resourceId, runAt = new Date(), label = '' }) => {
    if (!['NOTIFICATION_EMAIL', 'FILE_DELETE'].includes(kind)) throw new ApiError(400, 'Loại job không được hỗ trợ');
    if (!Number.isFinite(new Date(runAt).getTime())) throw new ApiError(400, 'runAt không hợp lệ');
    const key = { schoolId: schoolId ? objectId(schoolId) : null, kind, resourceId: objectId(resourceId) };
    try {
      return await persistence.enqueueFindOneAndUpdate(key, { $setOnInsert: { ...key, runAt, label: String(label).slice(0, 180), maxAttempts: config().maxAttempts } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    } catch (error) {
      if (error.code === 11000) return persistence.enqueueFindOne(key);
      throw error;
    }
  };
  // Persisted intent is scanned on every worker tick; no in-memory emit is required to enqueue it.
  const dispatch = async (now = new Date()) => {
    const notifications = await persistence.notificationsFind({ emailState: 'PENDING' }, { createdAt: 1 });
    for (const notification of notifications) {
      await enqueue({ schoolId: notification.schoolId, kind: 'NOTIFICATION_EMAIL', resourceId: notification._id, runAt: notification.emailRunAt || now, label: notification.title });
      await persistence.dispatchUpdateOne({ _id: notification._id, emailState: 'PENDING' }, { emailState: 'ENQUEUED' });
    }
    const files = await persistence.filesFind({ status: 'DELETING', deleteJobEnqueued: { $ne: true }, updatedAt: { $lte: new Date(now.getTime() - config().fileDeleteGraceMs) } }, { updatedAt: 1 });
    for (const asset of files) {
      await enqueue({ schoolId: asset.schoolId, kind: 'FILE_DELETE', resourceId: asset._id, label: asset.originalName });
      await persistence.dispatchUpdateOne2({ _id: asset._id, status: 'DELETING' }, { deleteJobEnqueued: true });
    }
    return { notifications: notifications.length, files: files.length };
  };
  const claim = async (now = new Date()) => {
    await persistence.claimUpdateMany({ status: 'RUNNING', lockedUntil: { $lte: now }, $expr: { $gte: ['$attempts', '$maxAttempts'] } }, { status: 'FAILED', finishedAt: now, lastError: 'LEASE_EXPIRED', lockToken: null, lockedUntil: null });
    return persistence.claimFindOneAndUpdate({ $expr: { $lt: ['$attempts', '$maxAttempts'] }, $or: [
      { status: 'QUEUED', runAt: { $lte: now } }, { status: 'RUNNING', lockedUntil: { $lte: now } },
    ] }, { $set: { status: 'RUNNING', lockToken: randomUUID(), lockedUntil: new Date(now.getTime() + config().leaseMs), startedAt: now },
      $inc: { attempts: 1, totalAttempts: 1 } }, { new: true, sort: { runAt: 1, _id: 1 } });
  };
  const ownership = (job, now) => ({ _id: job._id, status: 'RUNNING', lockToken: job.lockToken, lockedUntil: { $gt: now } });
  const heartbeat = async (job, now = new Date()) => (await persistence.heartbeatUpdateOne(ownership(job, now), { lockedUntil: new Date(now.getTime() + config().leaseMs) })).matchedCount === 1;
  const complete = async (job, result = {}, now = new Date()) => (await persistence.completeUpdateOne(ownership(job, now), {
    status: result.skipped ? 'SKIPPED' : 'SUCCEEDED', outcome: result.outcome || 'DONE', lastError: '', finishedAt: now, lockToken: null, lockedUntil: null,
  })).modifiedCount === 1;
  const fail = async (job, error, now = new Date()) => {
    const exhausted = job.attempts >= job.maxAttempts;
    const known = ['SMTP_UNCONFIGURED', 'SMTP_SEND_FAILED', 'FILE_DELETE_FAILED', 'HANDLER_UNAVAILABLE'];
    const code = known.includes(error?.code) ? error.code : 'JOB_EXECUTION_FAILED';
    return (await persistence.failUpdateOne(ownership(job, now), { status: exhausted ? 'FAILED' : 'QUEUED', lastError: code,
      runAt: new Date(now.getTime() + Math.min(config().retryMs * 2 ** (job.attempts - 1), 3600000)),
      finishedAt: exhausted ? now : null, lockToken: null, lockedUntil: null })).modifiedCount === 1;
  };
  const list = async (actor, query = {}) => {
    const filter = await schoolScope(actor);
    if (query.status) {
      if (!jobStatuses.includes(query.status)) throw new ApiError(400, 'Trạng thái job không hợp lệ');
      filter.status = query.status;
    }
    const page = Number(query.page || 1), limit = Number(query.limit || 25);
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new ApiError(400, 'Phân trang không hợp lệ');
    const [items, total] = await Promise.all([persistence.listFind(filter, { createdAt: -1 }, (page - 1) * limit, limit), persistence.listCountDocuments(filter)]);
    return { items, total, page, limit };
  };
  const change = async (actor, id, action, data = {}) => {
    const scope = { ...await schoolScope(actor), _id: objectId(id) };
    if (!await persistence.changeExists(scope)) throw new ApiError(404, 'Job ngoài phạm vi');
    const update = action === 'retry' ? { status: 'QUEUED', attempts: 0, lastError: '', outcome: '', finishedAt: null, runAt: scheduleDate(data.runAt) }
      : { status: 'CANCELLED', finishedAt: new Date(), outcome: 'CANCELLED_BY_OPERATOR' };
    const job = await persistence.jobFindOneAndUpdate({ ...scope, status: { $in: action === 'retry' ? ['FAILED', 'CANCELLED'] : ['QUEUED'] } }, update, { new: true });
    if (!job) throw new ApiError(409, 'Trạng thái job không cho phép thao tác này');
    return job;
  };
  return { enqueue, dispatch, claim, heartbeat, complete, fail, list, change, scheduleDate };
  
}

class JobService {
  constructor(dependencies) {
    Object.assign(this, createJobService(dependencies));
  }
}

module.exports = JobService;
