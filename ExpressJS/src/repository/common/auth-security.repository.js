const ApiError = require("../../utils/common/api-error.util");
const revisionFilter = user => ({
  _id: user._id,
  $expr: { $eq: [{ $ifNull: ['$security.revision', 0] }, user.security?.revision || 0] },
});
// A single document is the consistency boundary for factors, challenges and versions.
// Optimistic concurrency prevents a stale password check or OTP from changing newer state.
class AuthSecurityRepository {
  constructor({ models }) { this.User = models.user; }
  load(id) { return this.User.findById(id).select('+password +security'); }
  foundFindOne(filter) { return this.User.findOne(filter).select('+security'); }
  async update(user, fields, extraFilter = {}) {
    const updated = await this.User.findOneAndUpdate({ ...revisionFilter(user), ...extraFilter }, {
      $set: fields, $inc: { 'security.revision': 1 },
    }, { new: true, runValidators: true }).select('+password +security');
    if (!updated) throw new ApiError(409, 'Thông tin xác thực vừa thay đổi. Vui lòng thử lại.');
    return updated;
  }
}
module.exports = AuthSecurityRepository;
