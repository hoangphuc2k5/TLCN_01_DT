const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const load = id => User.findById(id).select('+password +security');
const revisionFilter = user => ({
  _id: user._id,
  $expr: { $eq: [{ $ifNull: ['$security.revision', 0] }, user.security?.revision || 0] },
});
// A single document is the consistency boundary for factors, challenges and versions.
// Optimistic concurrency prevents a stale password check or OTP from changing newer state.
async function update(user, fields, extraFilter = {}) {
  const updated = await User.findOneAndUpdate({ ...revisionFilter(user), ...extraFilter }, {
    $set: fields, $inc: { 'security.revision': 1 },
  }, { new: true, runValidators: true }).select('+password +security');
  if (!updated) throw new ApiError(409, 'Thông tin xác thực vừa thay đổi. Vui lòng thử lại.');
  return updated;
}
module.exports = { load, update };
