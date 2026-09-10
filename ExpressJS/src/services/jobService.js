const { randomUUID } = require('node:crypto');
const Job = require('../models/Job');
const Notification = require('../models/Notification');
const FileAsset = require('../models/FileAsset');
const ApiError = require('../utils/ApiError');
const config = require('../config/jobs');
const { objectId, schoolScope } = require('./dataScope');

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
    return await Job.findOneAndUpdate(key, { $setOnInsert: { ...key, runAt, label: String(label).slice(0, 180), maxAttempts: config().maxAttempts } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  } catch (error) {
    if (error.code === 11000) return Job.findOne(key);
    throw error;
  }
};
// Persisted intent is scanned on every worker tick; no in-memory emit is required to enqueue it.
const dispatch = async (now = new Date()) => {
  const notifications = await Notification.find({ emailState: 'PENDING' }).select('+emailRunAt').sort({ createdAt: 1 }).limit(100);
  for (const notification of notifications) {
    await enqueue({ schoolId: notification.schoolId, kind: 'NOTIFICATION_EMAIL', resourceId: notification._id, runAt: notification.emailRunAt || now, label: notification.title });
    await Notification.updateOne({ _id: notification._id, emailState: 'PENDING' }, { emailState: 'ENQUEUED' });
  }
  const files = await FileAsset.find({ status: 'DELETING', deleteJobEnqueued: { $ne: true }, updatedAt: { $lte: new Date(now.getTime() - config().fileDeleteGraceMs) } }).sort({ updatedAt: 1 }).limit(100);
  for (const asset of files) {
    await enqueue({ schoolId: asset.schoolId, kind: 'FILE_DELETE', resourceId: asset._id, label: asset.originalName });
    await FileAsset.updateOne({ _id: asset._id, status: 'DELETING' }, { deleteJobEnqueued: true });
  }
  return { notifications: notifications.length, files: files.length };
};
const claim = async (now = new Date()) => {
  await Job.updateMany({ status: 'RUNNING', lockedUntil: { $lte: now }, $expr: { $gte: ['$attempts', '$maxAttempts'] } },
    { status: 'FAILED', finishedAt: now, lastError: 'LEASE_EXPIRED', lockToken: null, lockedUntil: null });
  return Job.findOneAndUpdate({ $expr: { $lt: ['$attempts', '$maxAttempts'] }, $or: [
    { status: 'QUEUED', runAt: { $lte: now } }, { status: 'RUNNING', lockedUntil: { $lte: now } },
  ] }, { $set: { status: 'RUNNING', lockToken: randomUUID(), lockedUntil: new Date(now.getTime() + config().leaseMs), startedAt: now },
    $inc: { attempts: 1, totalAttempts: 1 } }, { new: true, sort: { runAt: 1, _id: 1 } }).select('+lockToken');
};
const ownership = (job, now) => ({ _id: job._id, status: 'RUNNING', lockToken: job.lockToken, lockedUntil: { $gt: now } });
const heartbeat = async (job, now = new Date()) => (await Job.updateOne(ownership(job, now),
  { lockedUntil: new Date(now.getTime() + config().leaseMs) })).matchedCount === 1;
const complete = async (job, result = {}, now = new Date()) => (await Job.updateOne(ownership(job, now), {
  status: result.skipped ? 'SKIPPED' : 'SUCCEEDED', outcome: result.outcome || 'DONE', lastError: '', finishedAt: now, lockToken: null, lockedUntil: null,
})).modifiedCount === 1;
const fail = async (job, error, now = new Date()) => {
  const exhausted = job.attempts >= job.maxAttempts;
  const known = ['SMTP_UNCONFIGURED', 'SMTP_SEND_FAILED', 'FILE_DELETE_FAILED', 'HANDLER_UNAVAILABLE'];
  const code = known.includes(error?.code) ? error.code : 'JOB_EXECUTION_FAILED';
  return (await Job.updateOne(ownership(job, now), { status: exhausted ? 'FAILED' : 'QUEUED', lastError: code,
    runAt: new Date(now.getTime() + Math.min(config().retryMs * 2 ** (job.attempts - 1), 3600000)),
    finishedAt: exhausted ? now : null, lockToken: null, lockedUntil: null })).modifiedCount === 1;
};
const list = async (actor, query = {}) => {
  const filter = await schoolScope(actor);
  if (query.status) {
    if (!Job.STATUSES.includes(query.status)) throw new ApiError(400, 'Trạng thái job không hợp lệ');
    filter.status = query.status;
  }
  const page = Number(query.page || 1), limit = Number(query.limit || 25);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new ApiError(400, 'Phân trang không hợp lệ');
  const [items, total] = await Promise.all([Job.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Job.countDocuments(filter)]);
  return { items, total, page, limit };
};
const change = async (actor, id, action, data = {}) => {
  const scope = { ...await schoolScope(actor), _id: objectId(id) };
  if (!await Job.exists(scope)) throw new ApiError(404, 'Job ngoài phạm vi');
  const update = action === 'retry' ? { status: 'QUEUED', attempts: 0, lastError: '', outcome: '', finishedAt: null, runAt: scheduleDate(data.runAt) }
    : { status: 'CANCELLED', finishedAt: new Date(), outcome: 'CANCELLED_BY_OPERATOR' };
  const job = await Job.findOneAndUpdate({ ...scope, status: { $in: action === 'retry' ? ['FAILED', 'CANCELLED'] : ['QUEUED'] } }, update, { new: true });
  if (!job) throw new ApiError(409, 'Trạng thái job không cho phép thao tác này');
  return job;
};
module.exports = { enqueue, dispatch, claim, heartbeat, complete, fail, list, change, scheduleDate };
