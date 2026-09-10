const mongoose = require('mongoose');
const School = require('../models/School');
const User = require('../models/User');
const Class = require('../models/Class');
const { schoolScope } = require('./dataScope');

const getSystemMetrics = async actor => {
  const scope = await schoolScope(actor); const started = Date.now(); let db = 'down';
  try { await mongoose.connection.db.command({ ping: 1 }); db = 'up'; } catch { /* health response still contains process metrics */ }
  const schoolFilter = scope.schoolId ? { _id: scope.schoolId } : scope.clusterId ? { clusterId: scope.clusterId } : {};
  const schools = await School.find(schoolFilter).select('+storageUsedBytes name code subdomain status').lean();
  const schoolIds = schools.map(school => school._id);
  const [users, classes] = await Promise.all([
    User.aggregate([{ $match: schoolIds.length ? { schoolId: { $in: schoolIds } } : { _id: { $in: [] } } }, { $group: { _id: '$role', count: { $sum: 1 } } }]),
    Class.countDocuments(schoolIds.length ? { schoolId: { $in: schoolIds } } : { _id: { $in: [] } }),
  ]);
  return {
    status: db === 'up' ? 'healthy' : 'degraded', uptimeSeconds: Math.round(process.uptime()), responseMs: Date.now() - started,
    database: { status: db, readyState: mongoose.connection.readyState },
    process: { memoryRssBytes: process.memoryUsage().rss, heapUsedBytes: process.memoryUsage().heapUsed, heapTotalBytes: process.memoryUsage().heapTotal },
    schools: schools.map(school => ({ _id: school._id, name: school.name, code: school.code, subdomain: school.subdomain, status: school.status, storageUsedBytes: school.storageUsedBytes || 0 })),
    totals: { schools: schools.length, classes, users: users.reduce((total, item) => total + item.count, 0), usersByRole: Object.fromEntries(users.map(item => [item._id, item.count])) },
  };
};
module.exports = { getSystemMetrics };
