const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['MCQ', 'ESSAY'], default: 'MCQ' },
    prompt: { type: String, required: true },
    options: [optionSchema],
    correctKey: { type: String, default: '' },
    points: { type: Number, default: 1 },
  },
  { _id: true }
);

const examSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    title: { type: String, required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    durationMinutes: { type: Number, default: 45 },
    maxAttempts: { type: Number, default: 1 },
    shuffleQuestions: { type: Boolean, default: false },
    showResults: { type: Boolean, default: true },
    questions: [questionSchema],
    status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'CLOSED'], default: 'DRAFT' },
  },
  { timestamps: true }
);

examSchema.index({ schoolId: 1, classId: 1, status: 1 });

module.exports = mongoose.model('Exam', examSchema);
