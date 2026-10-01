function createFileService(dependencies) {
  const persistence = dependencies.persistence;
  const mongoose = require('mongoose');
  const { randomUUID, createHash } = require('node:crypto');
  const ApiError = require("../../utils/common/api-error.util");
  const config = require("../../config/file-storage/file-storage.config");
  const storage = dependencies.services["file-storage"];
  const { validateFile } = require("../../middleware/common/file-upload.middleware");
  const { schoolScope, personalStudentIds, objectId } = dependencies.services["data-scope"];
  const { targetSchool } = dependencies.services["write-scope"];
  
  const transaction = async work => {
    try { return await persistence.transactionTransaction(work); }
    catch (error) {
      if (error.code === 20 || error.codeName === 'IllegalOperation') throw new ApiError(503, 'Kho file cần MongoDB replica set để bảo đảm hạn mức');
      throw error;
    }
  };
  const quotaBytes = async (schoolId, session) => {
    const sub = await persistence.subFindOne({ schoolId }, session || null);
    if (!sub || sub.status !== 'ACTIVE' || (sub.expiresAt && sub.expiresAt <= new Date())) return config().defaultQuotaBytes;
    const bytes = Math.floor(sub.storageGb * 1024 ** 3);
    if (!Number.isSafeInteger(bytes) || bytes < 0) throw new ApiError(503, 'Hạn mức dung lượng của trường không hợp lệ');
    return bytes;
  };
  const usage = async (actor, school) => {
    const schoolId = await targetSchool(actor, school);
    const item = await persistence.itemFindById(schoolId);
    return { schoolId, usedBytes: item.storageUsedBytes || 0, quotaBytes: await quotaBytes(schoolId), maxFileBytes: config().maxBytes };
  };
  
  // Storage is external to MongoDB. Keep the reservation until physical deletion succeeds.
  const purgeAsset = async asset => {
    const stored = await persistence.storedFindById(asset._id);
    if (!stored) return;
    if (stored.status !== 'DELETING') throw new ApiError(409, 'File chưa được đánh dấu để xóa');
    await storage.adapter(stored.driver).remove(stored);
    await transaction(async session => {
      const current = await persistence.currentFindOne({ _id: asset._id, status: 'DELETING' }, session);
      if (!current) return;
      const released = await persistence.releasedUpdateOne({ _id: current.schoolId, storageUsedBytes: { $gte: current.sizeBytes } }, { $inc: { storageUsedBytes: -current.sizeBytes } }, { session });
      if (released.modifiedCount !== 1) throw new ApiError(409, 'Bộ đếm dung lượng cần được kiểm tra');
      await persistence.purgeAssetDeleteMany({ fileAssetId: current._id, schoolId: current.schoolId }, session);
      await persistence.purgeAssetDeleteMany2({ fileAssetId: current._id, schoolId: current.schoolId }, session);
      await persistence.purgeAssetUpdateMany({ schoolId: current.schoolId, attachmentIds: current._id }, { $pull: { attachmentIds: current._id } }, { session });
      await persistence.purgeAssetDeleteOne({ _id: current._id }, session);
    });
  };
  const deleteAsset = async id => {
    const asset = await transaction(session => persistence.assetFindOneAndUpdate({ _id: id, status: { $in: ['READY', 'DELETING'] } }, { status: 'DELETING' }, { new: true, session }));
    if (!asset) throw new ApiError(409, 'File đang tải lên hoặc cần khôi phục trạng thái');
    try { await purgeAsset(asset); }
    catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(503, 'Chưa xóa được file; có thể thử lại, dung lượng vẫn được giữ'); }
  };
  
  const uploadMaterial = async (actor, data, file) => {
    const info = validateFile(file);
    const settings = config();
    if (file.buffer.length > settings.maxBytes) throw new ApiError(413, 'File vượt giới hạn tải lên');
    if (data.isShared !== undefined && !['true', 'false', true, false].includes(data.isShared)) throw new ApiError(400, 'isShared không hợp lệ');
    const payload = await dependencies.services["resource"].materialPayload(actor, { ...data, fileUrl: '', fileType: 'FILE', isShared: data.isShared !== 'false' && data.isShared !== false });
    const asset = persistence.assetNewDocument({ ...info, schoolId: payload.schoolId, uploadedBy: actor._id, sizeBytes: file.buffer.length,
      sha256: createHash('sha256').update(file.buffer).digest('hex'), driver: settings.driver, bucket: settings.bucket,
      key: `${payload.schoolId}/${randomUUID()}` });
    const material = persistence.materialNewDocument({ ...payload, fileAssetId: asset._id });
    await persistence.uploadMaterialValidate(material);
    await transaction(async session => {
      const quota = await quotaBytes(payload.schoolId, session);
      const reserved = await persistence.reservedUpdateOne({ _id: payload.schoolId, $expr: { $lte: [{ $add: [{ $ifNull: ['$storageUsedBytes', 0] }, asset.sizeBytes] }, quota] } }, { $inc: { storageUsedBytes: asset.sizeBytes } }, { session });
      if (reserved.modifiedCount !== 1) throw new ApiError(409, 'Trường đã hết dung lượng lưu trữ');
      await persistence.uploadMaterialCreate([asset.toObject()], { session });
      await persistence.uploadMaterialCreate2([material.toObject()], { session });
    });
    try {
      await storage.adapter(asset.driver).put({ ...asset.toObject(), buffer: file.buffer });
      const ready = await persistence.readyUpdateOne({ _id: asset._id, status: 'UPLOADING' }, { status: 'READY' });
      if (ready.matchedCount !== 1) throw new Error('Upload state changed before finalization');
    } catch {
      // A crash or cleanup error leaves durable metadata for the maintenance recovery command.
      try {
        await persistence.uploadMaterialUpdateOne({ _id: asset._id }, { status: 'DELETING' });
        await purgeAsset(asset);
      } catch { /* Reservation intentionally retained until recovery succeeds. */ }
      throw new ApiError(503, 'Không lưu được file, vui lòng thử lại');
    }
    return material;
  };
  const accessibleAsset = async (actor, id) => {
    const asset = await persistence.assetFindOne({ ...await schoolScope(actor), _id: objectId(id) });
    if (!asset || !await persistence.accessibleAssetExists({ $and: [await dependencies.services["resource"].materialScope(actor), { fileAssetId: asset._id }] })) {
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
    const student = await persistence.studentFindOne({ ...await schoolScope(actor), _id: studentId, role: 'STUDENT' });
    if (!student) throw new ApiError(404, 'KhÃ´ng tÃ¬m tháº¥y há»c sinh trong pháº¡m vi');
    const documentType = String(data.documentType || 'OTHER').toUpperCase();
    if (!['IDENTITY', 'BIRTH_CERTIFICATE', 'TRANSCRIPT', 'HEALTH', 'OTHER'].includes(documentType)) throw new ApiError(400, 'Loáº¡i há»“ sÆ¡ khÃ´ng há»£p lá»‡');
    if (!String(data.title || '').trim()) throw new ApiError(400, 'Thiáº¿u tiÃªu Ä‘á» há»“ sÆ¡');
    const info = validateFile(file); const settings = config();
    if (file.buffer.length > settings.maxBytes) throw new ApiError(413, 'File vÆ°á»£t giá»›i háº¡n táº£i lÃªn');
    const asset = persistence.assetNewDocument2({ ...info, purpose: 'STUDENT_DOCUMENT', schoolId: student.schoolId, uploadedBy: actor._id, sizeBytes: file.buffer.length, sha256: createHash('sha256').update(file.buffer).digest('hex'), driver: settings.driver, bucket: settings.bucket, key: `${student.schoolId}/${randomUUID()}` });
    const document = persistence.documentNewDocument({ schoolId: student.schoolId, studentId, documentType, title: String(data.title).trim(), fileAssetId: asset._id, uploadedBy: actor._id });
    await persistence.uploadStudentDocumentValidate(document);
    await transaction(async session => {
      const quota = await quotaBytes(student.schoolId, session);
      const reserved = await persistence.reservedUpdateOne2({ _id: student.schoolId, $expr: { $lte: [{ $add: [{ $ifNull: ['$storageUsedBytes', 0] }, asset.sizeBytes] }, quota] } }, { $inc: { storageUsedBytes: asset.sizeBytes } }, { session });
      if (reserved.modifiedCount !== 1) throw new ApiError(409, 'TrÆ°á»ng Ä‘Ã£ háº¿t dung lÆ°u trá»¯');
      await persistence.uploadStudentDocumentCreate([asset.toObject()], { session }); await persistence.uploadStudentDocumentCreate2([document.toObject()], { session });
    });
    try { await storage.adapter(asset.driver).put({ ...asset.toObject(), buffer: file.buffer }); const ready = await persistence.readyUpdateOne2({ _id: asset._id, status: 'UPLOADING' }, { status: 'READY' }); if (ready.matchedCount !== 1) throw new Error('Upload state changed'); }
    catch { try { await persistence.uploadStudentDocumentUpdateOne({ _id: asset._id }, { status: 'DELETING' }); await purgeAsset(asset); } catch { /* recovery job keeps reservation */ } throw new ApiError(503, 'KhÃ´ng lÆ°u Ä‘Æ°á»£c há»“ sÆ¡'); }
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
  const listStudentDocuments = async (actor, query = {}) => persistence.listStudentDocumentsFind(await studentDocumentFilter(actor, query), { createdAt: -1 });
  const accessibleStudentDocument = async (actor, id) => {
    const row = await persistence.rowFindOne({ _id: objectId(id), ...(await studentDocumentFilter(actor)) });
    if (!row || !row.fileAssetId || row.fileAssetId.status !== 'READY') throw new ApiError(404, 'KhÃ´ng tÃ¬m tháº¥y há»“ sÆ¡ trong pháº¡m vi');
    return row;
  };
  const downloadStudentDocument = async (actor, id) => { const row = await accessibleStudentDocument(actor, id); return { row, stream: await download(row.fileAssetId) }; };
  
  const uploadHomeworkAttachment = async (actor, homeworkId, file) => {
    if (actor.role !== 'STUDENT') throw new ApiError(403, 'Chỉ học sinh được tải file bài làm');
    const homeworkService = dependencies.services["homework"];
    const homework = await homeworkService.getHomework(actor, homeworkId);
    homeworkService.assertSubmissionOpen(homework);
    const info = validateFile(file); const settings = config();
    if (file.buffer.length > settings.maxBytes) throw new ApiError(413, 'File vượt giới hạn tải lên');
    const asset = persistence.assetNewDocument3({ ...info, purpose: 'HOMEWORK_SUBMISSION', schoolId: homework.schoolId, uploadedBy: actor._id,
      sizeBytes: file.buffer.length, sha256: createHash('sha256').update(file.buffer).digest('hex'), driver: settings.driver,
      bucket: settings.bucket, key: `${homework.schoolId}/${randomUUID()}` });
    await transaction(async session => {
      const submission = await persistence.submissionFindOne({ homeworkId: homework._id, studentId: actor._id }, session);
      if (!submission) throw new ApiError(409, 'Cần chọn hình thức nộp bài trước khi thêm file');
      if (!['UPLOADING', 'SUBMITTED'].includes(submission.status)) throw new ApiError(409, 'Bài đã được chấm, không thể đổi file');
      if (submission.attachmentIds.length >= 5) throw new ApiError(409, 'Bài nộp có tối đa 5 file');
      const quota = await quotaBytes(homework.schoolId, session);
      const reserved = await persistence.reservedUpdateOne3({ _id: homework.schoolId, $expr: { $lte: [{ $add: [{ $ifNull: ['$storageUsedBytes', 0] }, asset.sizeBytes] }, quota] } }, { $inc: { storageUsedBytes: asset.sizeBytes } }, { session });
      if (reserved.modifiedCount !== 1) throw new ApiError(409, 'Trường đã hết dung lượng lưu trữ');
      await persistence.uploadHomeworkAttachmentCreate([asset.toObject()], { session });
      submission.attachmentIds.push(asset._id);
      await persistence.uploadHomeworkAttachmentSave(submission, { session });
    });
    try {
      await storage.adapter(asset.driver).put({ ...asset.toObject(), buffer: file.buffer });
      await transaction(async session => {
        const ready = await persistence.readyUpdateOne3({ _id: asset._id, status: 'UPLOADING' }, { status: 'READY' }, { session });
        if (ready.matchedCount !== 1) throw new Error('Upload state changed');
        const submission = await persistence.submissionFindOne2({ homeworkId: homework._id, studentId: actor._id, attachmentIds: asset._id }, session);
        if (!submission) throw new Error('Submission state changed');
        if (submission.status !== 'GRADED') {
          submission.status = 'SUBMITTED';
          submission.submissionMode = submission.answerText ? 'MIXED' : 'FILE';
          await persistence.uploadHomeworkAttachmentSave2(submission, { session });
        }
      });
    } catch {
      try { await persistence.uploadHomeworkAttachmentUpdateOne({ _id: asset._id }, { status: 'DELETING' }); await purgeAsset(asset); } catch { /* reservation stays for recovery */ }
      throw new ApiError(503, 'Không lưu được file bài làm');
    }
    return metadata(await persistence.uploadHomeworkAttachmentFindById(asset._id));
  };
  
  const accessibleHomeworkAttachment = async (actor, id) => {
    const asset = await persistence.assetFindOne2({ ...await schoolScope(actor), _id: objectId(id), purpose: 'HOMEWORK_SUBMISSION' });
    if (!asset) throw new ApiError(404, 'Không tìm thấy file bài làm trong phạm vi');
    const submission = await persistence.submissionFindOne3({ schoolId: asset.schoolId, attachmentIds: asset._id });
    if (!submission) throw new ApiError(404, 'Không tìm thấy file bài làm trong phạm vi');
    const personal = await personalStudentIds(actor);
    if (personal !== null && !personal.some(studentId => String(studentId) === String(submission.studentId))) throw new ApiError(404, 'Không tìm thấy file bài làm trong phạm vi');
    await dependencies.services["homework"].getHomework(actor, submission.homeworkId);
    if (asset.status !== 'READY') throw new ApiError(409, 'File chưa sẵn sàng để tải');
    return asset;
  };
  
  const deleteHomeworkAttachment = async (actor, id) => {
    if (actor.role !== 'STUDENT') throw new ApiError(403, 'Chỉ học sinh được xóa file bài làm');
    const asset = await accessibleHomeworkAttachment(actor, id);
    const submission = await persistence.submissionFindOne4({ studentId: actor._id, attachmentIds: asset._id });
    if (!submission || submission.status !== 'SUBMITTED') throw new ApiError(409, 'Bài đã được chấm, không thể đổi file');
    if (submission.attachmentIds.length === 1 && !submission.answerText) throw new ApiError(409, 'Bài nộp bằng file phải giữ lại ít nhất một file');
    const homework = await dependencies.services["homework"].getHomework(actor, submission.homeworkId);
    dependencies.services["homework"].assertSubmissionOpen(homework);
    await deleteAsset(asset._id);
    return { id: asset._id };
  };
  
  const recoverUnfinished = async ({ apply = false } = {}) => {
    const assets = await persistence.unfinishedAssetsFind({ status: { $in: ['UPLOADING', 'DELETING'] } });
    const rows = assets.map(asset => ({
      _id: asset._id,
      schoolId: asset.schoolId,
      status: asset.status,
      sizeBytes: asset.sizeBytes,
    }));
    if (apply) {
      for (const asset of assets) {
        const claimed = await persistence.recoverAssetFindOneAndUpdate(
          { _id: asset._id, status: { $in: ['UPLOADING', 'DELETING'] } },
          { status: 'DELETING' },
          { new: true }
        );
        if (claimed) await purgeAsset(claimed);
      }
    }
    return rows;
  };

  return { uploadMaterial, uploadStudentDocument, listStudentDocuments, accessibleStudentDocument, downloadStudentDocument, accessibleAsset,
  uploadHomeworkAttachment, accessibleHomeworkAttachment, deleteHomeworkAttachment, metadata, download, usage, deleteAsset, purgeAsset, recoverUnfinished };
  
}

class FileService {
  constructor(dependencies) {
    Object.assign(this, createFileService(dependencies));
  }
}

module.exports = FileService;
