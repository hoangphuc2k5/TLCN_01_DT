const ApiError = require('../utils/ApiError');
const { gradeRepo } = require('../repositories');
const { getGradeStrategy } = require('../patterns/gradeStrategy');
const { ROLES } = require('../constants/roles');
const { buildExportScope } = require('./exportScopeService');

const listGrades = async (actor, query = {}) => {
  const { filter } = await buildExportScope(actor, 'grades', query);

  return gradeRepo.find(filter, {
    populate: 'studentId subjectId classId teacherId',
    limit: 200,
  });
};

const upsertGrade = async (actor, data) => {
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
  const average = calc.calculateAverage(scores);
  const classification = calc.classify(average);

  const filter = {
    schoolId: actor.schoolId,
    academicYearId,
    classId,
    subjectId,
    studentId,
    semester,
  };

  const existing = await gradeRepo.findOne(filter);
  if (existing) {
    return gradeRepo.updateById(existing._id, {
      scores,
      average,
      classification,
      teacherId: actor._id,
    });
  }

  return gradeRepo.create({
    ...filter,
    teacherId: actor._id,
    scores,
    average,
    classification,
  });
};

const addScore = async (actor, gradeId, scoreItem) => {
  const grade = await gradeRepo.findById(gradeId);
  if (!grade) throw new ApiError(404, 'Không tìm thấy bảng điểm');
  if (actor.role !== ROLES.SUPER_ADMIN && String(grade.schoolId) !== String(actor.schoolId)) {
    throw new ApiError(403, 'Ngoài phạm vi');
  }
  grade.scores.push(scoreItem);
  const calc = getGradeStrategy('weighted');
  grade.average = calc.calculateAverage(grade.scores);
  grade.classification = calc.classify(grade.average);
  await grade.save();
  return grade;
};

module.exports = { listGrades, upsertGrade, addScore };
