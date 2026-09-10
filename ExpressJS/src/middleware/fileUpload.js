const multer = require('multer');
const path = require('node:path');
const config = require('../config/fileStorage');
const ApiError = require('../utils/ApiError');

const types = {
  '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.txt': 'text/plain',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
const upload = (req, res, next) => {
  try {
    multer({ storage: multer.memoryStorage(), limits: { fileSize: config().maxBytes, files: 1, fields: 12, fieldSize: 16384 },
      fileFilter: (_req, file, done) => {
        const mime = types[path.extname(file.originalname).toLowerCase()];
        done(mime && mime === file.mimetype ? null : new ApiError(415, 'Chỉ nhận PDF, ảnh PNG/JPG, TXT hoặc Office (.docx/.xlsx/.pptx)'), !!mime);
      },
    }).single('file')(req, res, error => {
      if (error instanceof multer.MulterError) return next(new ApiError(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400,
        error.code === 'LIMIT_FILE_SIZE' ? 'File vượt giới hạn tải lên' : 'Dữ liệu upload không hợp lệ'));
      next(error);
    });
  } catch (error) { next(error); }
};
const validateFile = file => {
  if (!file?.buffer?.length) throw new ApiError(400, 'Cần chọn file có nội dung');
  const b = file.buffer;
  const ext = path.extname(file.originalname).toLowerCase();
  let valid = false;
  if (ext === '.pdf') valid = b.subarray(0, 5).toString() === '%PDF-';
  else if (ext === '.png') valid = b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
  else if (['.jpg', '.jpeg'].includes(ext)) valid = b.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'));
  else if (['.docx', '.xlsx', '.pptx'].includes(ext)) valid = b.subarray(0, 4).equals(Buffer.from('504b0304', 'hex'));
  else if (ext === '.txt') { try { new TextDecoder('utf-8', { fatal: true }).decode(b); valid = !b.includes(0); } catch {} }
  if (!valid || types[ext] !== file.mimetype) throw new ApiError(415, 'Nội dung file không khớp định dạng');
  let name = file.originalname;
  // Browser multipart filenames use UTF-8; Busboy defaults to Latin-1 for header parameters.
  if ([...name].every(c => c.charCodeAt(0) <= 255)) {
    try { name = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(name, 'latin1')); } catch { /* Preserve explicitly Latin-1 names. */ }
  }
  return { originalName: [...path.basename(name.replace(/\\/g, '/')).replace(/[\x00-\x1f\x7f]/g, '')].slice(0, 180).join(''), mimeType: types[ext] };
};
module.exports = { upload, validateFile };
