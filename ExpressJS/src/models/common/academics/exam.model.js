const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const statementSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    correctAnswer: { type: Boolean, required: true },
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, maxlength: 60 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    instructions: { type: String, default: '', trim: true, maxlength: 2000 },
    questionType: { type: String, enum: ['MCQ', 'ESSAY', 'TRUE_FALSE_4', 'MCQ_MULTI', 'SHORT_ANSWER'], default: null },
    order: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['MCQ', 'ESSAY', 'TRUE_FALSE_4', 'MCQ_MULTI', 'SHORT_ANSWER'], default: 'MCQ' },
    prompt: { type: String, required: true },
    options: [optionSchema],
    correctKey: { type: String, default: '' },
    correctKeys: { type: [String], default: [] },
    statements: { type: [statementSchema], default: [] },
    acceptedAnswers: { type: [String], default: [] },
    sectionKey: { type: String, default: '', trim: true, maxlength: 60 },
    order: { type: Number, default: 0, min: 0 },
    points: { type: Number, default: 1 },
  },
  { _id: true }
);

const examSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    title: { type: String, required: true },
    template: { type: String, enum: ['CUSTOM', 'THPT_2025'], default: 'CUSTOM' },
    sections: { type: [sectionSchema], default: [] },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startAt: { type: Date, default: null },
    endAt: { type: Date, default: null },
    durationMinutes: { type: Number, default: 45, min: 1, max: 1440 },
    maxAttempts: { type: Number, default: 1, min: 1, max: 10 },
    shuffleQuestions: { type: Boolean, default: false },
    showResults: { type: Boolean, default: true },
    questions: [questionSchema],
    status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'CLOSED'], default: 'DRAFT' },
  },
  { timestamps: true }
);

examSchema.index({ schoolId: 1, classId: 1, status: 1 });

module.exports = mongoose.model('Exam', examSchema);
