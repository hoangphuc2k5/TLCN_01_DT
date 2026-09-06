const path = require('node:path');
const ApiError = require('../utils/ApiError');

const config = () => {
  const driver = process.env.FILE_STORAGE_DRIVER || 'local';
  const maxBytes = Number(process.env.FILE_MAX_BYTES || 10 * 1024 * 1024);
  const defaultQuotaBytes = Number(process.env.FILE_DEFAULT_QUOTA_BYTES || 5 * 1024 ** 3);
  if (!['local', 's3'].includes(driver) || !Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 64 * 1024 ** 2 ||
      !Number.isSafeInteger(defaultQuotaBytes) || defaultQuotaBytes < 0) throw new ApiError(503, 'Cấu hình kho file không hợp lệ');
  if (driver === 's3' && !process.env.FILE_S3_BUCKET) throw new ApiError(503, 'Chưa cấu hình bucket lưu file');
  return { driver, maxBytes, defaultQuotaBytes, root: path.resolve(process.env.FILE_LOCAL_ROOT || path.join(__dirname, '../../storage/private')), bucket: process.env.FILE_S3_BUCKET || '' };
};
module.exports = config;
