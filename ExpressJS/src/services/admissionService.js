const crypto = require('node:crypto');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const Admission = require('../models/AdmissionApplication');
const School = require('../models/School');
const { ROLES } = require('../constants/roles');
const { objectId, schoolScope } = require('./dataScope');

const resolveSchool = async data => {
  if (data.schoolId) {
    if (!mongoose.isObjectIdOrHexString(data.schoolId)) throw new ApiError(400, 'schoolId không hợp lệ');
    const school = await School.findById(data.schoolId).select('_id');
    if (school) return school;
  }
  const code = String(data.schoolCode || data.subdomain || '').trim();
  if (!code) throw new ApiError(400, 'Cần schoolId hoặc schoolCode');
  const school = await School.findOne({ $or: [{ code: code.toUpperCase() }, { subdomain: code.toLowerCase() }] }).select('_id');
  if (!school) throw new ApiError(404, 'Không tìm thấy trường tuyển sinh');
  return school;
};

const trackingCode = () => `ADM-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

const createPublic = async (data = {}) => {
  const school = await resolveSchool(data);
  const required = ['applicantName', 'dateOfBirth', 'guardianName', 'guardianPhone', 'requestedGrade'];
  if (required.some(key => data[key] === undefined || data[key] === '')) throw new ApiError(400, 'Thiếu thông tin bắt buộc hồ sơ');
  const dateOfBirth = new Date(data.dateOfBirth);
  const requestedGrade = Number(data.requestedGrade);
  if (Number.isNaN(dateOfBirth.getTime()) || dateOfBirth > new Date()) throw new ApiError(400, 'Ngày sinh không hợp lệ');
  if (!Number.isInteger(requestedGrade) || requestedGrade < 1 || requestedGrade > 12) throw new ApiError(400, 'Khối tuyển sinh không hợp lệ');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await Admission.create({ schoolId: school._id, trackingCode: trackingCode(), applicantName: String(data.applicantName).trim(), dateOfBirth, guardianName: String(data.guardianName).trim(), guardianPhone: String(data.guardianPhone).trim(), guardianEmail: String(data.guardianEmail || '').trim(), requestedGrade, previousSchool: String(data.previousSchool || '').trim(), note: String(data.note || '').trim() });
    } catch (error) {
      if (error.code !== 11000 || attempt === 2) throw error;
    }
  }
  throw new ApiError(500, 'Không tạo được mã hồ sơ');
};

const getPublic = async code => {
  const row = await Admission.findOne({ trackingCode: String(code).trim().toUpperCase() }).select('trackingCode applicantName requestedGrade status reviewNote createdAt schoolId').populate('schoolId', 'name code');
  if (!row) throw new ApiError(404, 'Không tìm thấy mã hồ sơ');
  return row;
};

const list = async (actor, query = {}) => {
  const filter = await schoolScope(actor);
  if (query.status) filter.status = String(query.status).toUpperCase();
  return Admission.find(filter).populate('schoolId', 'name code').populate('reviewedBy', 'name email').sort({ createdAt: -1 }).limit(500);
};

const review = async (actor, id, data = {}) => {
  if (![ROLES.SUPER_ADMIN, ROLES.CLUSTER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.ACADEMIC_AFFAIRS].includes(actor.role)) throw new ApiError(403, 'Không có quyền duyệt hồ sơ tuyển sinh');
  const row = await Admission.findOne({ _id: objectId(id), ...(await schoolScope(actor)) });
  if (!row) throw new ApiError(404, 'Không tìm thấy hồ sơ trong phạm vi');
  const status = String(data.status || '').toUpperCase();
  if (!['UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WAITLISTED'].includes(status)) throw new ApiError(400, 'Trạng thái tuyển sinh không hợp lệ');
  if (['ACCEPTED', 'REJECTED', 'WAITLISTED'].includes(row.status) && status !== row.status) throw new ApiError(409, 'Hồ sơ đã chốt kết quả');
  row.status = status; row.reviewNote = String(data.reviewNote || '').trim(); row.reviewedBy = actor._id; row.reviewedAt = new Date();
  return row.save();
};

module.exports = { createPublic, getPublic, list, review };
