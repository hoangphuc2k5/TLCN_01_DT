const ApiError = require('../utils/ApiError');
const Subscription = require('../models/Subscription');
const SubscriptionInvoice = require('../models/SubscriptionInvoice');
const { ROLES } = require('../constants/roles');

const PLAN_DEFAULTS = {
  FREE: { maxStudents: 100, maxTeachers: 20, storageGb: 5, amount: 0 },
  BASIC: { maxStudents: 500, maxTeachers: 50, storageGb: 20, amount: 2000000 },
  PREMIUM: { maxStudents: 2000, maxTeachers: 200, storageGb: 100, amount: 5000000 },
};

const listSubscriptions = async (actor, query = {}) => {
  const filter = {};
  if (actor.role === ROLES.SUPER_ADMIN) {
    if (query.schoolId) filter.schoolId = query.schoolId;
  } else if (actor.role === ROLES.CLUSTER_ADMIN) {
    const School = require('../models/School');
    const schools = await School.find({ clusterId: actor.clusterId }).select('_id');
    filter.schoolId = { $in: schools.map((s) => s._id) };
  } else if (actor.schoolId) {
    filter.schoolId = actor.schoolId;
  }
  return Subscription.find(filter).populate('schoolId', 'name code').sort({ updatedAt: -1 });
};

const upsertSubscription = async (actor, data) => {
  if (actor.role !== ROLES.SUPER_ADMIN) throw new ApiError(403, 'Chỉ Super Admin');
  if (!data.schoolId || !data.plan) throw new ApiError(400, 'Thiếu schoolId/plan');
  const defaults = PLAN_DEFAULTS[data.plan] || PLAN_DEFAULTS.FREE;
  const payload = {
    schoolId: data.schoolId,
    plan: data.plan,
    maxStudents: data.maxStudents ?? defaults.maxStudents,
    maxTeachers: data.maxTeachers ?? defaults.maxTeachers,
    storageGb: data.storageGb ?? defaults.storageGb,
    features: data.features || [],
    expiresAt: data.expiresAt || null,
    status: data.status || 'ACTIVE',
  };
  return Subscription.findOneAndUpdate({ schoolId: data.schoolId }, payload, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  }).populate('schoolId', 'name code');
};

const createInvoice = async (actor, data) => {
  if (actor.role !== ROLES.SUPER_ADMIN) throw new ApiError(403, 'Chỉ Super Admin');
  const sub = await Subscription.findById(data.subscriptionId);
  if (!sub) throw new ApiError(404, 'Không tìm thấy subscription');
  const defaults = PLAN_DEFAULTS[sub.plan] || PLAN_DEFAULTS.FREE;
  return SubscriptionInvoice.create({
    schoolId: sub.schoolId,
    subscriptionId: sub._id,
    plan: sub.plan,
    amount: data.amount ?? defaults.amount,
    periodStart: data.periodStart || new Date(),
    periodEnd: data.periodEnd || new Date(Date.now() + 365 * 24 * 3600 * 1000),
    status: 'UNPAID',
    note: data.note || '',
  });
};

const markInvoicePaid = async (actor, id) => {
  if (actor.role !== ROLES.SUPER_ADMIN) throw new ApiError(403, 'Chỉ Super Admin');
  const inv = await SubscriptionInvoice.findByIdAndUpdate(
    id,
    { status: 'PAID', paidAt: new Date() },
    { new: true }
  );
  if (!inv) throw new ApiError(404, 'Không tìm thấy hóa đơn');
  await Subscription.findByIdAndUpdate(inv.subscriptionId, {
    expiresAt: inv.periodEnd,
    status: 'ACTIVE',
  });
  return inv;
};

const listInvoices = async (actor, query = {}) => {
  const filter = {};
  if (actor.role !== ROLES.SUPER_ADMIN && actor.schoolId) filter.schoolId = actor.schoolId;
  if (query.schoolId) filter.schoolId = query.schoolId;
  return SubscriptionInvoice.find(filter)
    .populate('schoolId', 'name code')
    .sort({ createdAt: -1 })
    .limit(100);
};

module.exports = {
  listSubscriptions,
  upsertSubscription,
  createInvoice,
  markInvoicePaid,
  listInvoices,
  PLAN_DEFAULTS,
};
