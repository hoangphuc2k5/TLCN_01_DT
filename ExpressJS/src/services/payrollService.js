const ApiError = require('../utils/ApiError');
const PayrollRecord = require('../models/PayrollRecord');
const User = require('../models/User');
const { schoolScope, objectId } = require('./dataScope');
const { reference, targetSchool } = require('./writeScope');

const list = async (actor, query = {}) => {
  const filter = await schoolScope(actor);
  if (query.period) filter.period = String(query.period);
  if (query.status) filter.status = String(query.status).toUpperCase();
  return PayrollRecord.find(filter).populate('employeeId', 'name email role code').populate('approvedBy', 'name').sort({ period: -1, createdAt: -1 }).limit(300);
};

const create = async (actor, data = {}) => {
  if (!data.employeeId || !data.period || data.baseSalary == null) throw new ApiError(400, 'Thieu employeeId/period/baseSalary');
  const baseSalary = Number(data.baseSalary); const allowances = Number(data.allowances || 0); const deductions = Number(data.deductions || 0);
  if (![baseSalary, allowances, deductions].every(Number.isFinite) || baseSalary < 0 || allowances < 0 || deductions < 0 || baseSalary + allowances < deductions) throw new ApiError(400, 'So tien luong khong hop le');
  const period = String(data.period);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new ApiError(400, 'period phai co dang YYYY-MM');
  const schoolId = await targetSchool(actor, data.schoolId);
  const employee = await reference(User, data.employeeId, schoolId);
  if (['STUDENT', 'PARENT'].includes(employee.role)) throw new ApiError(400, 'Nhan vien khong hop le');
  const status = data.status ? String(data.status).toUpperCase() : 'DRAFT';
  if (!['DRAFT', 'APPROVED'].includes(status)) throw new ApiError(400, 'status khong hop le');
  return PayrollRecord.create({ schoolId, employeeId: employee._id, period, baseSalary, allowances, deductions, netAmount: baseSalary + allowances - deductions, status, approvedBy: status === 'APPROVED' ? actor._id : null, createdBy: actor._id, note: data.note || '' });
};

const updateStatus = async (actor, id, status) => {
  const record = await PayrollRecord.findOne({ ...await schoolScope(actor), _id: objectId(id) });
  if (!record) throw new ApiError(404, 'Khong tim thay bang luong');
  const next = String(status || '').toUpperCase();
  if (!['APPROVED', 'PAID'].includes(next)) throw new ApiError(400, 'status khong hop le');
  if (next === 'APPROVED' && record.status !== 'DRAFT') throw new ApiError(409, 'Chi duyet bang luong nhap');
  if (next === 'PAID' && record.status !== 'APPROVED') throw new ApiError(409, 'Bang luong phai duoc duyet truoc');
  record.status = next; if (next === 'APPROVED') record.approvedBy = actor._id; if (next === 'PAID') record.paidAt = new Date();
  await record.save(); return record;
};

module.exports = { list, create, updateStatus };
