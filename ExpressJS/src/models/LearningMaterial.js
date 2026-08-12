const mongoose = require('mongoose');

const learningMaterialSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    title: { type: String, required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fileUrl: { type: String, default: '' },
    fileType: { type: String, default: 'LINK' },
    topic: { type: String, default: '' },
    description: { type: String, default: '' },
    isShared: { type: Boolean, default: true },
  },
  { timestamps: true }
);

learningMaterialSchema.index({ schoolId: 1, subjectId: 1 });

module.exports = mongoose.model('LearningMaterial', learningMaterialSchema);
