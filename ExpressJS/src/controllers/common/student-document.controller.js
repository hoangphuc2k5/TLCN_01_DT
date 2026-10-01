const requestDto = require('../../dtos/common/student-document.request.dto');
const responseDto = require('../../dtos/common/student-document.response.dto');
const { pipeline } = require('node:stream/promises');
const asyncHandler = require("../../utils/common/async-handler.util");
const { success } = require("../../utils/common/response.util");
const documents = require("../../config/container").services["file"];
const transcriptHistory = require("../../config/container").services["transcript-history"];

const upload = asyncHandler(async (req, res) => success(
  res, responseDto.fromService(await documents.uploadStudentDocument(req.user, requestDto.body(req), req.file)),
  'Tai ho so hoc sinh thanh cong',
  201,
));

const list = asyncHandler(async (req, res) => success(res, responseDto.fromService(await documents.listStudentDocuments(req.user, requestDto.query(req)))));

const download = asyncHandler(async (req, res) => {
  const { row, stream } = await documents.downloadStudentDocument(req.user, requestDto.params(req).id);
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
  const result = await transcriptHistory.currentCertificate(req.user, requestDto.params(req).studentId, requestDto.params(req).format);
  res.locals.resourceId = String(result.snapshot._id);
  res.locals.transcriptVersion = result.snapshot.version;
  sendCertificate(res, result, false);
});

const history = asyncHandler(async (req, res) => success(res, responseDto.fromService(await transcriptHistory.list(req.user, requestDto.params(req).studentId))));

const historicalCertificate = asyncHandler(async (req, res) => {
  const result = await transcriptHistory.historicalCertificate(req.user, requestDto.params(req).studentId, requestDto.params(req).snapshotId, requestDto.params(req).format);
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
