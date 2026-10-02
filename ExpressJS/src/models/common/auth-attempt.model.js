const mongoose = require('mongoose');

// Shared fixed-window counters: enforcement never depends on timely TTL cleanup.
const schema = new mongoose.Schema({
  _id: String,
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { versionKey: false });
module.exports = mongoose.model('AuthAttempt', schema);
