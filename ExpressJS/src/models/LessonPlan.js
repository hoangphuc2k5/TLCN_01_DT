const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  durationMinutes: { type: Number, required: true, min: 1, max: 240 },
  teacherActivities: { type: String, default: '', maxlength: 5000 },
  studentActivities: { type: String, default: '', maxlength: 5000 },
  assessment: { type: String, default: '', maxlength: 2000 },
}, { _id: false });

const reviewSchema = new mongoose.Schema({
  revision: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['APPROVED', 'REJECTED'], required: true },
  note: { type: String, default: '', maxlength: 5000 },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewedAt: { type: Date, required: true },
}, { _id: false });

const lessonPlanSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  lessonDate: { type: Date, default: null },
  durationMinutes: { type: Number, min: 1, max: 300, default: 45 },
  objectives: { type: String, default: '', maxlength: 5000 },
  preparation: { type: String, default: '', maxlength: 5000 },
  content: { type: String, default: '', maxlength: 20000 },
  activities: {
    type: [activitySchema],
    default: [],
    validate: { validator: value => value.length <= 20, message: 'Giáo án có tối đa 20 hoạt động' },
  },
  status: { type: String, enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'], default: 'DRAFT' },
  revision: { type: Number, min: 0, default: 0 },
  submittedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  reviewNote: { type: String, default: '', maxlength: 5000 },
  reviews: { type: [reviewSchema], default: [] },
}, { timestamps: true });

lessonPlanSchema.index({ schoolId: 1, status: 1, submittedAt: -1 });
lessonPlanSchema.index({ schoolId: 1, teacherId: 1, academicYearId: 1, createdAt: -1 });

module.exports = mongoose.model('LessonPlan', lessonPlanSchema);
