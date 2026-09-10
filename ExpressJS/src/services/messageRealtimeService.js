const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const ApiError = require('../utils/ApiError');
const { STATUS } = require('../constants/status');
const roleCache = require('./rolePermissionCache');
const { visibleRole } = require('./roleService');
const { objectId } = require('./dataScope');

const TICKET_AUDIENCE = 'message-realtime';
const TICKET_ISSUER = 'school-management-api';
const TICKET_TTL_SECONDS = 60;

const issueTicket = async actor => {
  const user = await User.findById(actor._id).select('+security');
  if (!user || user.status !== STATUS.ACTIVE) throw new ApiError(401, 'Tài khoản không hợp lệ hoặc đã bị khóa');
  const ticket = jwt.sign({
    sub: String(user._id),
    purpose: TICKET_AUDIENCE,
    sessionVersion: user.security?.sessionVersion || 0,
  }, process.env.JWT_SECRET, {
    algorithm: 'HS256', audience: TICKET_AUDIENCE, issuer: TICKET_ISSUER, expiresIn: TICKET_TTL_SECONDS,
  });
  return { ticket, expiresInSeconds: TICKET_TTL_SECONDS, path: '/v1/ws/messages' };
};

const authenticateTicket = async ticket => {
  let decoded;
  try {
    decoded = jwt.verify(ticket, process.env.JWT_SECRET, {
      algorithms: ['HS256'], audience: TICKET_AUDIENCE, issuer: TICKET_ISSUER,
    });
  } catch {
    throw new ApiError(401, 'Ticket realtime hết hạn hoặc không hợp lệ');
  }
  if (decoded.purpose !== TICKET_AUDIENCE || !decoded.sub) throw new ApiError(401, 'Ticket realtime không hợp lệ');
  const user = await User.findById(decoded.sub).select('+security');
  if (!user || user.status !== STATUS.ACTIVE || (decoded.sessionVersion || 0) !== (user.security?.sessionVersion || 0)) {
    throw new ApiError(401, 'Phiên realtime đã bị thu hồi');
  }
  const role = await roleCache.getRole(user.role);
  if (!role || !visibleRole(user, role)) throw new ApiError(403, 'Vai trò không tồn tại hoặc đã bị vô hiệu hóa');
  return user;
};

const serializeEvent = (message, replay = false) => ({
  type: 'message.created',
  replay,
  message: {
    _id: String(message._id),
    senderId: String(message.senderId?._id || message.senderId),
    receiverId: String(message.receiverId?._id || message.receiverId),
    createdAt: message.createdAt,
  },
});

const participantFilter = userId => ({ $or: [{ senderId: userId }, { receiverId: userId }] });
const latestMessageId = async userId => (await Message.findOne(participantFilter(userId)).select('_id').sort({ _id: -1 }).lean())?._id || null;
const replayAfter = async (userId, cursor, through, limit = 100) => {
  const filter = participantFilter(userId);
  if (cursor || through) filter._id = { ...(cursor ? { $gt: objectId(cursor, 'cursor') } : {}), ...(through ? { $lte: through } : {}) };
  return Message.find(filter).select('_id senderId receiverId createdAt').sort({ _id: 1 }).limit(limit).lean();
};

module.exports = { issueTicket, authenticateTicket, serializeEvent, latestMessageId, replayAfter };
