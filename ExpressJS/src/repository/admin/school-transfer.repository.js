class SchoolTransferRepository {
  constructor({ models }) { this.models = models; }
  school(id, session) { return this.models.school.findById(id).session(session || null); }
  schools() { return this.models.school.find({ status: 'ACTIVE' }).select('name code').sort({ name: 1 }).lean(); }
  student(id, session) { return this.models.user.findOne({ _id: id, role: 'STUDENT' }).session(session || null); }
  classroom(id, session) { return this.models.class.findById(id).session(session || null); }
  year(id, session) { return this.models['academic-year'].findById(id).session(session || null); }
  lockStudent(id, session) { return this.models.user.updateOne({ _id: id }, { $inc: { academicRevision: 1 } }, { session }); }
  create(data, session) { return this.models['school-transfer'].create([data], { session }).then(rows => rows[0]); }
  find(id, session) { return this.models['school-transfer'].findById(id).session(session || null); }
  list(filter) {
    return this.models['school-transfer'].find(filter).select('-handover').populate('fromSchoolId toSchoolId', 'name code clusterId').populate('toClassId', 'name').sort({ createdAt: -1 }).limit(200).lean();
  }
  grades(student, session) {
    return this.models.grade.find({ schoolId: student.schoolId, studentId: student._id })
      .select('academicYearId classId subjectId semester scores average transferHistory')
      .populate('subjectId', 'name code').populate('academicYearId', 'name').populate('classId', 'name').session(session).lean();
  }
  countStudents(filter, session) { return this.models.user.countDocuments({ ...filter, role: 'STUDENT', status: 'ACTIVE' }).session(session); }
  subscription(schoolId, session) {
    return this.models.subscription.findOne({ schoolId, status: 'ACTIVE', $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }).session(session);
  }
  moveStudent(student, target, school, session) {
    return this.models.user.updateOne({ _id: student._id, schoolId: student.schoolId, classId: student.classId, role: 'STUDENT', status: 'ACTIVE' }, {
      $set: { schoolId: school._id, clusterId: school.clusterId, classId: target._id },
      $inc: { academicRevision: 1, 'security.sessionVersion': 1 },
      $unset: { 'security.challenge': 1, 'security.setup': 1 },
    }, { session });
  }
}
module.exports = SchoolTransferRepository;
