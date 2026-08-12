const mongoose = require('mongoose');
const { ANNOUNCEMENT_SCOPE } = require('../constants/status');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    scope: {
      type: String,
      enum: Object.values(ANNOUNCEMENT_SCOPE),
      default: ANNOUNCEMENT_SCOPE.SCHOOL,
    },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
    clusterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cluster', default: null },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetRoles: [{ type: String }],
    isPinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

announcementSchema.index({ schoolId: 1, createdAt: -1 });
announcementSchema.index({ clusterId: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
