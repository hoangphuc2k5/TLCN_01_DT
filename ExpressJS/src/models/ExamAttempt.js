const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    answerKey: { type: String, default: '' },
    answerText: { type: String, default: '' },
    isCorrect: { type: Boolean, default: null },
    pointsAwarded: { type: Number, default: 0 },
  },
  { _id: false }
);

const examAttemptSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attemptNumber: { type: Number },
    answers: [answerSchema],
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    status: { type: String, enum: ['IN_PROGRESS', 'SUBMITTED', 'GRADED'], default: 'IN_PROGRESS' },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    autoSubmitted: { type: Boolean, default: false },
    submissionReason: { type: String, enum: ['MANUAL', 'TIMEOUT'], default: 'MANUAL' },
    questionOrder: [{ type: mongoose.Schema.Types.ObjectId }],
  },
  { timestamps: true }
);

examAttemptSchema.index({ examId: 1, studentId: 1 });
examAttemptSchema.index({ examId: 1, studentId: 1, attemptNumber: 1 }, { unique: true, partialFilterExpression: { attemptNumber: { $exists: true } } });

module.exports = mongoose.model('ExamAttempt', examAttemptSchema);
