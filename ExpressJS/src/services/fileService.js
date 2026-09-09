const mongoose = require('mongoose');
const { randomUUID, createHash } = require('node:crypto');
const FileAsset = require('../models/FileAsset');
const Material = require('../models/LearningMaterial');
const StudentDocument = require('../models/StudentDocument');
const User = require('../models/User');
const School = require('../models/School');
const Subscription = require('../models/Subscription');
const ApiError = require('../utils/ApiError');
const config = require('../config/fileStorage');
const storage = require('./fileStorage');
const { validateFile } = require('../middleware/fileUpload');
const { schoolScope, personalStudentIds, objectId } = require('./dataScope');
const { targetSchool } = require('./writeScope');

const transaction = async work => {
  try { return await mongoose.connection.transaction(work); }
  catch (error) {
    if (error.code === 20 || error.codeName === 'IllegalOperation') throw new ApiError(503, 'Kho file cần MongoDB replica set để bảo đảm hạn mức');
    throw error;
  }
};
const quotaBytes = async (schoolId, session) => {
  const sub = await Subscription.findOne({ schoolId }).session(session || null);
  if (!sub || sub.status !== 'ACTIVE' || (sub.expiresAt && sub.expiresAt <= new Date())) return config().defaultQuotaBytes;
  const bytes = Math.floor(sub.storageGb * 1024 ** 3);
  if (!Number.isSafeInteger(bytes) || bytes < 0) throw new ApiError(503, 'Hạn mức dung lượng của trường không hợp lệ');
  return bytes;
};
const usage = async (actor, school) => {
  const schoolId = await targetSchool(actor, school);
  const item = await School.findById(schoolId).select('+storageUsedBytes');
  return { schoolId, usedBytes: item.storageUsedBytes || 0, quotaBytes: await quotaBytes(schoolId), maxFileBytes: config().maxBytes };
};

// Storage is external to MongoDB. Keep the reservation until physical deletion succeeds.
const purgeAsset = async asset => {
  const stored = await FileAsset.findById(asset._id);
  if (!stored) return;
  if (stored.status !== 'DELETING') throw new ApiError(409, 'File chưa được đánh dấu để xóa');
  await storage.adapter(stored.driver).remove(stored);
  await transaction(async session => {
    const current = await FileAsset.findOne({ _id: asset._id, status: 'DELETING' }).session(session);
    if (!current) return;
    const released = await School.updateOne({ _id: current.schoolId, storageUsedBytes: { $gte: current.sizeBytes } },
      { $inc: { storageUsedBytes: -current.sizeBytes } }, { session });
    if (released.modifiedCount !== 1) throw new ApiError(409, 'Bộ đếm dung lượng cần được kiểm tra');
    await Material.deleteMany({ fileAssetId: current._id, schoolId: current.schoolId }).session(session);
    await FileAsset.deleteOne({ _id: current._id }).session(session);
  });
};
const deleteAsset = async id => {
  const asset = await transaction(session => FileAsset.findOneAndUpdate({ _id: id, status: { $in: ['READY', 'DELETING'] } }, { status: 'DELETING' }, { new: true, session }));
  if (!asset) throw new ApiError(409, 'File đang tải lên hoặc cần khôi phục trạng thái');
  try { await purgeAsset(asset); }
  catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(503, 'Chưa xóa được file; có thể thử lại, dung lượng vẫn được giữ'); }
};

const uploadMaterial = async (actor, data, file) => {
  const info = validateFile(file);
  const settings = config();
  if (file.buffer.length > settings.maxBytes) throw new ApiError(413, 'File vượt giới hạn tải lên');
  if (data.isShared !== undefined && !['true', 'false', true, false].includes(data.isShared)) throw new ApiError(400, 'isShared không hợp lệ');
  const payload = await require('./resourceService').materialPayload(actor, { ...data, fileUrl: '', fileType: 'FILE', isShared: data.isShared !== 'false' && data.isShared !== false });
  const asset = new FileAsset({ ...info, schoolId: payload.schoolId, uploadedBy: actor._id, sizeBytes: file.buffer.length,
    sha256: createHash('sha256').update(file.buffer).digest('hex'), driver: settings.driver, bucket: settings.bucket,
    key: `${payload.schoolId}/${randomUUID()}` });
  const material = new Material({ ...payload, fileAssetId: asset._id });
  await material.validate();
  await transaction(async session => {
    const quota = await quotaBytes(payload.schoolId, session);
    const reserved = await School.updateOne({ _id: payload.schoolId, $expr: { $lte: [{ $add: [{ $ifNull: ['$storageUsedBytes', 0] }, asset.sizeBytes] }, quota] } },
      { $inc: { storageUsedBytes: asset.sizeBytes } }, { session });
    if (reserved.modifiedCount !== 1) throw new ApiError(409, 'Trường đã hết dung lượng lưu trữ');
    await FileAsset.create([asset.toObject()], { session });
    await Material.create([material.toObject()], { session });
  });
  try {
    await storage.adapter(asset.driver).put({ ...asset.toObject(), buffer: file.buffer });
    const ready = await FileAsset.updateOne({ _id: asset._id, status: 'UPLOADING' }, { status: 'READY' });
    if (ready.matchedCount !== 1) throw new Error('Upload state changed before finalization');
  } catch {
    // A crash or cleanup error leaves durable metadata for the maintenance recovery command.
    try {
      await FileAsset.updateOne({ _id: asset._id }, { status: 'DELETING' });
      await purgeAsset(asset);
    } catch { /* Reservation intentionally retained until recovery succeeds. */ }
    throw new ApiError(503, 'Không lưu được file, vui lòng thử lại');
  }
  return material;
};
const accessibleAsset = async (actor, id) => {
  const asset = await FileAsset.findOne({ ...await schoolScope(actor), _id: objectId(id) });
  if (!asset || !await Material.exists({ $and: [await require('./resourceService').materialScope(actor), { fileAssetId: asset._id }] })) {
    throw new ApiError(404, 'Không tìm thấy file trong phạm vi');
  }
  if (asset.status !== 'READY') throw new ApiError(409, 'File chưa sẵn sàng để tải');
  return asset;
};
const metadata = asset => ({ _id: asset._id, originalName: asset.originalName, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes, sha256: asset.sha256, createdAt: asset.createdAt });
const download = async asset => {
  try { return await storage.adapter(asset.driver).read(asset); }
  catch { throw new ApiError(503, 'Kho file tạm thời không khả dụng'); }
};

const uploadStudentDocument = async (actor, data = {}, file) => {
  if (!['SUPER_ADMIN', 'CLUSTER_ADMIN', 'SCHOOL_ADMIN', 'ACADEMIC_AFFAIRS'].includes(actor.role)) throw new ApiError(403, 'KhÃ´ng cÃ³ quyá»n táº£i há»“ sÆ¡');
  const studentId = objectId(data.studentId, 'studentId');
  const student = await User.findOne({ ...await schoolScope(actor), _id: studentId, role: 'STUDENT' }).select('_id schoolId');
  if (!student) throw new ApiError(404, 'KhÃ´ng tÃ¬m tháº¥y há»c sinh trong pháº¡m vi');
  const documentType = String(data.documentType || 'OTHER').toUpperCase();
  if (!['IDENTITY', 'BIRTH_CERTIFICATE', 'TRANSCRIPT', 'HEALTH', 'OTHER'].includes(documentType)) throw new ApiError(400, 'Loáº¡i há»“ sÆ¡ khÃ´ng há»£p lá»‡');
  if (!String(data.title || '').trim()) throw new ApiError(400, 'Thiáº¿u tiÃªu Ä‘á» há»“ sÆ¡');
  const info = validateFile(file); const settings = config();
  if (file.buffer.length > settings.maxBytes) throw new ApiError(413, 'File vÆ°á»£t giá»›i háº¡n táº£i lÃªn');
  const asset = new FileAsset({ ...info, purpose: 'STUDENT_DOCUMENT', schoolId: student.schoolId, uploadedBy: actor._id, sizeBytes: file.buffer.length, sha256: createHash('sha256').update(file.buffer).digest('hex'), driver: settings.driver, bucket: settings.bucket, key: `${student.schoolId}/${randomUUID()}` });
  const document = new StudentDocument({ schoolId: student.schoolId, studentId, documentType, title: String(data.title).trim(), fileAssetId: asset._id, uploadedBy: actor._id });
  await document.validate();
  await transaction(async session => {
    const quota = await quotaBytes(student.schoolId, session);
    const reserved = await School.updateOne({ _id: student.schoolId, $expr: { $lte: [{ $add: [{ $ifNull: ['$storageUsedBytes', 0] }, asset.sizeBytes] }, quota] } }, { $inc: { storageUsedBytes: asset.sizeBytes } }, { session });
    if (reserved.modifiedCount !== 1) throw new ApiError(409, 'TrÆ°á»ng Ä‘Ã£ háº¿t dung lÆ°u trá»¯');
    await FileAsset.create([asset.toObject()], { session }); await StudentDocument.create([document.toObject()], { session });
  });
  try { await storage.adapter(asset.driver).put({ ...asset.toObject(), buffer: file.buffer }); const ready = await FileAsset.updateOne({ _id: asset._id, status: 'UPLOADING' }, { status: 'READY' }); if (ready.matchedCount !== 1) throw new Error('Upload state changed'); }
  catch { try { await FileAsset.updateOne({ _id: asset._id }, { status: 'DELETING' }); await purgeAsset(asset); } catch { /* recovery job keeps reservation */ } throw new ApiError(503, 'KhÃ´ng lÆ°u Ä‘Æ°á»£c há»“ sÆ¡'); }
  return document;
};
const studentDocumentFilter = async (actor, query = {}) => {
  const filter = await schoolScope(actor); const ids = await personalStudentIds(actor);
  if (ids !== null) filter.studentId = { $in: ids };
  if (query.studentId) {
    const requested = objectId(query.studentId, 'studentId');
    if (ids !== null && !ids.some(id => String(id) === String(requested))) filter.studentId = { $in: [] };
    else filter.studentId = requested;
  }
  if (query.documentType) filter.documentType = String(query.documentType).toUpperCase();
  return filter;
};
const listStudentDocuments = async (actor, query = {}) => StudentDocument.find(await studentDocumentFilter(actor, query)).populate('studentId', 'name code').populate('uploadedBy', 'name').populate('fileAssetId', 'originalName mimeType sizeBytes status').sort({ createdAt: -1 }).limit(300);
const accessibleStudentDocument = async (actor, id) => {
  const row = await StudentDocument.findOne({ _id: objectId(id), ...(await studentDocumentFilter(actor)) }).populate('fileAssetId');
  if (!row || !row.fileAssetId || row.fileAssetId.status !== 'READY') throw new ApiError(404, 'KhÃ´ng tÃ¬m tháº¥y há»“ sÆ¡ trong pháº¡m vi');
  return row;
};
const downloadStudentDocument = async (actor, id) => { const row = await accessibleStudentDocument(actor, id); return { row, stream: await download(row.fileAssetId) }; };
module.exports = { uploadMaterial, uploadStudentDocument, listStudentDocuments, accessibleStudentDocument, downloadStudentDocument, accessibleAsset, metadata, download, usage, deleteAsset, purgeAsset };
