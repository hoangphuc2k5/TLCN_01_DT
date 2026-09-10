const ApiError = require('../utils/ApiError');
const DAY = 86400000;
// School calendar dates are date-only (not instants); no server timezone conversion.
const dateKey = value => new Date(value).toISOString().slice(0, 10);
const parseDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ApiError(400, 'Ngày phải có định dạng YYYY-MM-DD');
  const time = Date.parse(value);
  if (!Number.isFinite(time) || dateKey(time) !== value) throw new ApiError(400, 'Ngày không hợp lệ');
  return value;
};
const daysBetween = (from, to, max = 31) => {
  parseDate(from); parseDate(to);
  const count = (Date.parse(to) - Date.parse(from)) / DAY + 1;
  if (count < 1 || count > max) throw new ApiError(400, `Khoảng ngày phải từ 1 đến ${max} ngày`);
  return Array.from({ length: count }, (_, i) => dateKey(Date.parse(from) + i * DAY));
};
const weekday = date => new Date(date).getUTCDay() || 7;
const inRange = (date, from, to) => date >= dateKey(from) && date <= dateKey(to);
const period = value => {
  if (!Number.isInteger(value) || value < 1 || value > 10) throw new ApiError(400, 'Tiết phải là số nguyên từ 1 đến 10');
  return value;
};
const room = value => {
  if (value == null) return '';
  if (typeof value !== 'string' || value.trim().length > 100) throw new ApiError(400, 'Phòng không hợp lệ');
  return value.trim().normalize('NFC');
};
module.exports = { DAY, dateKey, parseDate, daysBetween, weekday, inRange, period, room };
