const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const Class = require('../models/Class');
const Year = require('../models/AcademicYear');
const Grade = require('../models/Grade');
const transaction = require('./scheduleTransaction');

// Carry only the selected semester forward. Other semesters remain attached to their original class.
const transfer = async (actor, existing, update, metadata) => {
  if (!update.classId || String(update.schoolId) !== String(existing.schoolId)) throw new ApiError(400, 'Chuyển lớp cần lớp đích trong cùng trường; chuyển trường cần quy trình riêng');
  const reason = typeof metadata.transferReason === 'string' ? metadata.transferReason.trim() : '';
  if (!reason || reason.length > 1000 || ![1, 2].includes(metadata.transferSemester)) throw new ApiError(400, 'Cần lý do chuyển lớp và học kỳ 1 hoặc 2');
  return transaction(existing.schoolId, async session => {
    await User.updateOne({ _id: existing._id }, { $inc: { academicRevision: 1 } }, { session });
    const student = await User.findOne({ _id: existing._id, role: 'STUDENT', schoolId: existing.schoolId, classId: existing.classId }).session(session);
    if (!student) throw new ApiError(409, 'Lớp của học sinh vừa thay đổi; tải lại trước khi chuyển');
    const target = await Class.findOne({ _id: update.classId, schoolId: student.schoolId, status: 'ACTIVE' }).session(session);
    if (!target) throw new ApiError(400, 'Lớp đích không hoạt động trong trường');
    const previous = student.classId ? await Class.findById(student.classId).session(session) : null;
    const year = await Year.findOne({ _id: target.academicYearId, schoolId: student.schoolId }).session(session);
    if (!year) throw new ApiError(400, 'Năm học của lớp đích không hợp lệ');
    if (await User.countDocuments({ classId: target._id, schoolId: student.schoolId, role: 'STUDENT', status: 'ACTIVE' }).session(session) >= target.maxStudents) throw new ApiError(409, 'Lớp đích đã đủ sĩ số');
    const now = new Date();
    const history = { fromClassId: student.classId, toClassId: target._id, fromClassName: previous?.name || '', toClassName: target.name, academicYearId: year._id, academicYearName: year.name, semester: metadata.transferSemester, reason, effectiveAt: now, changedBy: actor._id };
    const grades = await Grade.find({ schoolId: student.schoolId, studentId: student._id, academicYearId: year._id, semester: metadata.transferSemester }).session(session);
    for (const grade of grades) {
      if (String(grade.classId) === String(target._id)) continue;
      const oldClass = await Class.findById(grade.classId).session(session);
      grade.transferHistory.push({ classId: grade.classId, className: oldClass?.name || '', transferredAt: now, scores: grade.scores, average: grade.average });
      grade.classId = target._id;
      await grade.save({ session });
    }
    return User.findOneAndUpdate({ _id: student._id, classId: student.classId }, { $set: update, $push: { classHistory: history } }, { new: true, runValidators: true, session });
  });
};
module.exports = { transfer };
