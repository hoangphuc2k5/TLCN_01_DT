const { pipeline } = require('node:stream/promises');
const { Transform } = require('node:stream');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const files = require('../services/fileService');
const materialDownloads = require('../services/materialDownloadService');

exports.upload = asyncHandler(async (req, res) => success(res, await files.uploadMaterial(req.user, req.body, req.file), 'Đã tải lên học liệu', 201));
exports.usage = asyncHandler(async (req, res) => success(res, await files.usage(req.user, req.query.schoolId)));
exports.metadata = asyncHandler(async (req, res) => success(res, files.metadata(await files.accessibleAsset(req.user, req.params.id))));
exports.download = asyncHandler(async (req, res) => {
  const asset = await files.accessibleAsset(req.user, req.params.id);
  const stream = await files.download(asset);
  const event = await materialDownloads.start(req.user, asset, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  res.set({ 'Content-Type': 'application/octet-stream', 'Content-Length': String(asset.sizeBytes),
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(asset.originalName).replace(/'/g, '%27')}` });
  let finalChunk = null;
  const auditBarrier = new Transform({
    transform(chunk, encoding, callback) {
      if (finalChunk) this.push(finalChunk);
      finalChunk = chunk;
      callback();
    },
    flush(callback) {
      materialDownloads.complete(event._id).then(() => {
        if (finalChunk) this.push(finalChunk);
        callback();
      }, callback);
    },
  });
  try {
    // Finalize the audit before ending the HTTP body so a following report request sees the new event.
    await pipeline(stream, auditBarrier, res);
  } catch (error) {
    await materialDownloads.fail(event._id).catch(() => {});
    throw error;
  }
});
exports.materialDownloads = asyncHandler(async (req, res) => success(res, await materialDownloads.list(req.user, req.params.id)));

exports.uploadHomeworkAttachment = asyncHandler(async (req, res) => success(res, await files.uploadHomeworkAttachment(req.user, req.params.id, req.file), 'Đã tải file bài làm', 201));
exports.deleteHomeworkAttachment = asyncHandler(async (req, res) => success(res, await files.deleteHomeworkAttachment(req.user, req.params.id), 'Đã xóa file bài làm'));
exports.downloadHomeworkAttachment = asyncHandler(async (req, res) => {
  const asset = await files.accessibleHomeworkAttachment(req.user, req.params.id);
  const stream = await files.download(asset);
  res.set({ 'Content-Type': 'application/octet-stream', 'Content-Length': String(asset.sizeBytes), 'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff', 'Content-Disposition': `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(asset.originalName).replace(/'/g, '%27')}` });
  await pipeline(stream, res);
});
