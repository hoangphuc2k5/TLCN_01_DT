const { pipeline } = require('node:stream/promises');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const documents = require('../services/fileService');
const transcriptHistory = require('../services/transcriptHistoryService');

const upload = asyncHandler(async (req, res) => success(
  res,
  await documents.uploadStudentDocument(req.user, req.body, req.file),
  'Tai ho so hoc sinh thanh cong',
  201,
));

const list = asyncHandler(async (req, res) => success(res, await documents.listStudentDocuments(req.user, req.query)));

const download = asyncHandler(async (req, res) => {
  const { row, stream } = await documents.downloadStudentDocument(req.user, req.params.id);
  const asset = row.fileAssetId;
  res.set({
    'Content-Type': asset.mimeType,
    'Content-Length': String(asset.sizeBytes),
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(asset.originalName).replace(/'/g, '%27')}`,
  });
  await pipeline(stream, res);
});

const certificate = asyncHandler(async (req, res) => {
  const result = await transcriptHistory.currentCertificate(req.user, req.params.studentId, req.params.format);
  res.locals.resourceId = String(result.snapshot._id);
  res.locals.transcriptVersion = result.snapshot.version;
  sendCertificate(res, result, false);
});

const history = asyncHandler(async (req, res) => success(res, await transcriptHistory.list(req.user, req.params.studentId)));

const historicalCertificate = asyncHandler(async (req, res) => {
  const result = await transcriptHistory.historicalCertificate(req.user, req.params.studentId, req.params.snapshotId, req.params.format);
  res.locals.resourceId = String(result.snapshot._id);
  res.locals.transcriptVersion = result.snapshot.version;
  sendCertificate(res, result, true);
});

const sendCertificate = (res, result, versioned) => {
  const name = String(result.transcript.student.name || 'student').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 60) || 'student';
  res.set({
    'Content-Type': result.mimeType,
    'Content-Length': String(result.buffer.length),
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': `attachment; filename="${name}-transcript${versioned ? `-v${result.snapshot.version}` : ''}.${result.extension}"`,
  });
  res.end(result.buffer);
};

module.exports = { upload, list, download, certificate, history, historicalCertificate };
