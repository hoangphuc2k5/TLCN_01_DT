const multer = require('multer');
const ApiError = require('../utils/ApiError');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      /\.xlsx?$/i.test(file.originalname || '');
    if (!ok) {
      return cb(new ApiError(400, 'Chỉ chấp nhận file Excel (.xlsx / .xls)'));
    }
    return cb(null, true);
  },
});

module.exports = upload;
