const { pipeline } = require('node:stream/promises');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const files = require('../services/fileService');

exports.upload = asyncHandler(async (req, res) => success(res, await files.uploadMaterial(req.user, req.body, req.file), 'Đã tải lên học liệu', 201));
exports.usage = asyncHandler(async (req, res) => success(res, await files.usage(req.user, req.query.schoolId)));
exports.metadata = asyncHandler(async (req, res) => success(res, files.metadata(await files.accessibleAsset(req.user, req.params.id))));
exports.download = asyncHandler(async (req, res) => {
  const asset = await files.accessibleAsset(req.user, req.params.id);
  const stream = await files.download(asset);
  res.set({ 'Content-Type': 'application/octet-stream', 'Content-Length': String(asset.sizeBytes),
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(asset.originalName).replace(/'/g, '%27')}` });
  await pipeline(stream, res);
});
