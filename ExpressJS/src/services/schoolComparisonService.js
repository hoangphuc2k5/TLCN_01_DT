const ApiError = require('../utils/ApiError');
const School = require('../models/School'); const User = require('../models/User'); const Class = require('../models/Class'); const Grade = require('../models/Grade'); const FeeInvoice = require('../models/FeeInvoice');
const { schoolScope, objectId } = require('./dataScope');

const compare = async (actor, query = {}) => {
  const raw = Array.isArray(query.schoolIds) ? query.schoolIds : String(query.schoolIds || '').split(',').filter(Boolean);
  const ids = [...new Set(raw.map(value => String(objectId(value, 'schoolId'))))];
  if (ids.length < 2 || ids.length > 20) throw new ApiError(400, 'Can it nhat 2 va toi da 20 truong');
  const scope = await schoolScope(actor); const schoolScopeFilter = scope.schoolId ? { _id: scope.schoolId } : scope.clusterId ? { clusterId: scope.clusterId } : {}; const schools = await School.find({ ...schoolScopeFilter, _id: { $in: ids } }).select('name code subdomain status').lean();
  if (schools.length !== ids.length) throw new ApiError(403, 'Co truong ngoai pham vi');
  const objectIds = schools.map(item => item._id);
  const [users, classes, grades, fees] = await Promise.all([
    User.aggregate([{ $match: { schoolId: { $in: objectIds }, status: 'ACTIVE' } }, { $group: { _id: { schoolId: '$schoolId', role: '$role' }, count: { $sum: 1 } } }]),
    Class.aggregate([{ $match: { schoolId: { $in: objectIds } } }, { $group: { _id: '$schoolId', count: { $sum: 1 } } }]),
    Grade.aggregate([{ $match: { schoolId: { $in: objectIds }, average: { $ne: null } } }, { $group: { _id: '$schoolId', average: { $avg: '$average' }, count: { $sum: 1 } } }]),
    FeeInvoice.aggregate([{ $match: { schoolId: { $in: objectIds } } }, { $group: { _id: '$schoolId', billed: { $sum: '$amount' }, paid: { $sum: '$paidAmount' } } }]),
  ]);
  const by = (list, id) => list.find(item => String(item._id?.schoolId || item._id) === String(id));
  const countRoles = (id, roles) => users.filter(item => String(item._id.schoolId) === String(id) && roles.includes(item._id.role)).reduce((total, item) => total + item.count, 0);
  return schools.map(school => { const fee = by(fees, school._id); const grade = by(grades, school._id); return { school, students: countRoles(school._id, ['STUDENT']), teachers: countRoles(school._id, ['SUBJECT_TEACHER', 'HOMEROOM_TEACHER']), classes: by(classes, school._id)?.count || 0, gradeAverage: grade?.average || null, gradeSheets: grade?.count || 0, billedAmount: fee?.billed || 0, paidAmount: fee?.paid || 0, outstandingAmount: Math.max(0, (fee?.billed || 0) - (fee?.paid || 0)) }; });
};
module.exports = { compare };
