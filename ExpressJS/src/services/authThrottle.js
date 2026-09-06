const { createHash } = require('node:crypto');
const AuthAttempt = require('../models/AuthAttempt');
const ApiError = require('../utils/ApiError');
const WINDOW_MS = 10 * 60 * 1000;

async function consume(channel, identity, limit = 10, now = Date.now()) {
  const window = Math.floor(now / WINDOW_MS);
  const digest = createHash('sha256').update(String(identity)).digest('hex');
  const key = `${channel}:${digest}:${window}`;
  let row;
  try {
    row = await AuthAttempt.findOneAndUpdate({ _id: key }, {
      $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 1) * WINDOW_MS) },
    }, { upsert: true, new: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    row = await AuthAttempt.findOneAndUpdate({ _id: key }, { $inc: { count: 1 } }, { new: true });
  }
  if (!row || row.count > limit) throw new ApiError(429, 'Quá nhiều lần xác thực. Vui lòng thử lại sau tối đa 10 phút.');
  return key;
}
// Release only the current successful attempt, never erase concurrent failures.
const release = key => AuthAttempt.updateOne({ _id: key, count: { $gt: 0 } }, { $inc: { count: -1 } });
module.exports = { consume, release, WINDOW_MS };
