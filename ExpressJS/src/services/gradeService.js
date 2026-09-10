const ApiError = require('../utils/ApiError');
const { gradeRepo } = require('../repositories');
const { getGradeStrategy } = require('../patterns/gradeStrategy');
const { ROLES } = require('../constants/roles');
const { buildExportScope } = require('./exportScopeService');
const { academicReferences } = require('./writeScope');
const mongoose = require('mongoose');
const User = require('../models/User');
const withStudentLock = async (studentId, work) => {
  try {
    return await mongoose.connection.transaction(async session => {
      const result = await User.updateOne({ _id: studentId }, { $inc: { academicRevision: 1 } }, { session });
      if (!result.matchedCount) throw new ApiError(404, 'Không tìm thấy học sinh');
      return work(session);
    });
  } catch (error) {
    if (error.code === 20 || error.codeName === 'IllegalOperation') throw new ApiError(503, 'Cập nhật điểm cần MongoDB replica set để bảo toàn dữ liệu khi chuyển lớp');
    throw error;
  }
};

const listGrades = async (actor, query = {}) => {
  const { filter } = await buildExportScope(actor, 'grades', query);

  return gradeRepo.find(filter, {
    populate: 'studentId subjectId classId teacherId',
    limit: 200,
  });
};

const writeGrade = async (actor, data, session) => {
  const {
    academicYearId,
    classId,
    subjectId,
    studentId,
    semester = 1,
    scores,
    strategy = 'weighted',
  } = data;

  if (!academicYearId || !classId || !subjectId || !studentId || !scores?.length) {
    throw new ApiError(400, 'Thiếu thông tin điểm');
  }

  const calc = getGradeStrategy(strategy);
  const cls = await academicReferences(actor, data, { historicalStudent: true });
  const average = calc.calculateAverage(scores);
  const classification = calc.classify(average);

  const filter = {
    schoolId: cls.schoolId,
    academicYearId,
    classId,
    subjectId,
    studentId,
    semester,
  };

  const existing = await gradeRepo.model.findOne(filter).session(session);
  if (existing) {
    const updated = await gradeRepo.model.findOneAndUpdate({ _id: existing._id, classId: cls._id }, {
      scores,
      average,
      classification,
      teacherId: actor._id,
    }, { new: true, runValidators: true, session });
    if (!updated) throw new ApiError(409, 'Bảng điểm vừa chuyển lớp; tải lại trước khi sửa');
    return updated;
  }

  const { classId: ignoredClass, ...identity } = filter;
  if (await gradeRepo.model.findOne(identity).session(session)) throw new ApiError(409, 'Bảng điểm môn/học kỳ đang thuộc lớp khác; mở bảng điểm tại lớp đã tiếp nhận');
  const student = await User.findById(studentId).session(session);
  const lastTransfer = [...(student.classHistory || [])].reverse().find(item => String(item.academicYearId) === String(academicYearId) && item.semester === Number(semester));
  if (lastTransfer && String(lastTransfer.toClassId) !== String(cls._id)) throw new ApiError(409, 'Học kỳ đã được bàn giao sang lớp mới');

  const [created] = await gradeRepo.model.create([{
    ...filter,
    teacherId: actor._id,
    scores,
    average,
    classification,
  }], { session });
  return created;
};

const upsertGrade = async (actor, data) => {
  await academicReferences(actor, data, { historicalStudent: true });
  return withStudentLock(data.studentId, session => writeGrade(actor, data, session));
};

const addScore = async (actor, gradeId, scoreItem) => {
  const initial = await gradeRepo.findById(gradeId);
  if (!initial) throw new ApiError(404, 'Không tìm thấy bảng điểm');
  await academicReferences(actor, initial, { historicalStudent: true });
  return withStudentLock(initial.studentId, session => appendScore(actor, gradeId, scoreItem, session));
};
const appendScore = async (actor, gradeId, scoreItem, session) => {
  const grade = await gradeRepo.model.findById(gradeId).session(session);
  if (!grade) throw new ApiError(404, 'Không tìm thấy bảng điểm');
  await academicReferences(actor, grade, { historicalStudent: true });
  if (actor.role !== ROLES.SUPER_ADMIN && String(grade.schoolId) !== String(actor.schoolId)) {
    throw new ApiError(403, 'Ngoài phạm vi');
  }
  grade.scores.push(scoreItem);
  const calc = getGradeStrategy('weighted');
  grade.average = calc.calculateAverage(grade.scores);
  grade.classification = calc.classify(grade.average);
  const updated = await gradeRepo.model.findOneAndUpdate({ _id: grade._id, classId: grade.classId, updatedAt: grade.updatedAt }, {
    $set: { scores: grade.scores, average: grade.average, classification: grade.classification },
  }, { new: true, runValidators: true, session });
  if (!updated) throw new ApiError(409, 'Bảng điểm vừa thay đổi; tải lại trước khi thêm điểm');
  return updated;
};

module.exports = { listGrades, upsertGrade, addScore };
