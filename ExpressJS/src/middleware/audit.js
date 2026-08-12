const AuditLog = require('../models/AuditLog');

const audit = (action, resource) => async (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    AuditLog.create({
      actorId: req.user?._id,
      schoolId: req.schoolId || req.user?.schoolId || null,
      action,
      resource,
      resourceId: String(req.params.id || res.locals?.resourceId || ''),
      details: {
        method: req.method,
        path: req.originalUrl,
        bodyKeys: Object.keys(req.body || {}),
      },
      ip: req.ip,
    }).catch(() => {});
  });
  next();
};

module.exports = audit;
