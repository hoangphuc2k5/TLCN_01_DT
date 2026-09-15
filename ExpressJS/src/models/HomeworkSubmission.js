const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  homeworkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Homework', required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answerText: { type: String, default: '', trim: true, maxlength: 20000 },
  submissionMode: { type: String, enum: ['WEB', 'FILE', 'MIXED'], default: 'WEB' },
  attachmentIds: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FileAsset' }],
    default: [],
    validate: { validator: value => value.length <= 5, message: 'Bài nộp có tối đa 5 file' },
  },
  submittedAt: { type: Date, required: true, default: Date.now },
  late: { type: Boolean, default: false },
  status: { type: String, enum: ['UPLOADING', 'SUBMITTED', 'GRADED'], default: 'SUBMITTED' },
  score: { type: Number, min: 0, default: null },
  feedback: { type: String, default: '', maxlength: 10000 },
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  gradedAt: { type: Date, default: null },
}, { timestamps: true });

submissionSchema.index({ homeworkId: 1, studentId: 1 }, { unique: true });
submissionSchema.index({ schoolId: 1, studentId: 1, submittedAt: -1 });

module.exports = mongoose.model('HomeworkSubmission', submissionSchema);
