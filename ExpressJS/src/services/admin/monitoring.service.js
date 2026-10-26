function createMonitoringService(dependencies) {
  const persistence = dependencies.persistence;
  const { schoolScope } = dependencies.services["data-scope"];
  
  const getSystemMetrics = async actor => {
    const scope = await schoolScope(actor); const started = Date.now(); let db = 'down';
    try { await persistence.getSystemMetricsCommand({ ping: 1 }); db = 'up'; } catch { /* health response still contains process metrics */ }
    const schoolFilter = scope.schoolId ? { _id: scope.schoolId } : scope.clusterId ? { clusterId: scope.clusterId } : {};
    const schools = await persistence.schoolsFind(schoolFilter);
    const schoolIds = schools.map(school => school._id);
    const [users, classes, assetUsage] = await Promise.all([
      persistence.getSystemMetricsAggregate([{ $match: schoolIds.length ? { schoolId: { $in: schoolIds } } : { _id: { $in: [] } } }, { $group: { _id: '$role', count: { $sum: 1 } } }]),
      persistence.getSystemMetricsCountDocuments(schoolIds.length ? { schoolId: { $in: schoolIds } } : { _id: { $in: [] } }),
      schoolIds.length ? persistence.assetUsageAggregate(schoolIds) : Promise.resolve([]),
    ]);
    const storageBySchool = new Map(assetUsage.map(item => [String(item._id), item.usedBytes]));
    return {
      status: db === 'up' ? 'healthy' : 'degraded', uptimeSeconds: Math.round(process.uptime()), responseMs: Date.now() - started,
      database: { status: db, readyState: persistence.readyState },
      process: { memoryRssBytes: process.memoryUsage().rss, heapUsedBytes: process.memoryUsage().heapUsed, heapTotalBytes: process.memoryUsage().heapTotal },
      schools: schools.map(school => ({ _id: school._id, name: school.name, code: school.code, subdomain: school.subdomain, status: school.status, storageUsedBytes: storageBySchool.get(String(school._id)) || 0 })),
      totals: { schools: schools.length, classes, users: users.reduce((total, item) => total + item.count, 0), usersByRole: Object.fromEntries(users.map(item => [item._id, item.count])) },
    };
  };
  return { getSystemMetrics };
  
}

class MonitoringService {
  constructor(dependencies) {
    Object.assign(this, createMonitoringService(dependencies));
  }
}

module.exports = MonitoringService;
