require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('node:dns');

// Optional process-local override for networks that refuse Atlas SRV/TXT queries.
// Configure before opening connections; never change the machine's DNS settings.
const dnsServers = (process.env.DNS_SERVERS || '').split(',').map(value => value.trim()).filter(Boolean);
if (dnsServers.length) dns.setServers(dnsServers);

function createConnection({
  mongoose: client = mongoose,
  env = process.env,
  assertUsable = db => require('../../repository/administration/backup.repository').assertUsable(db),
  logger = require('../logger/logger.config'),
} = {}) {
  let inFlight;

  return function connection() {
    if (inFlight) return inFlight;
    // Set the shared promise before any driver or guard work can begin.
    inFlight = Promise.resolve().then(async () => {
      const uri = env.MONGO_DB_URL;
      if (!uri) throw new Error('MONGO_DB_URL is missing');

      if (client.connection.readyState === 1) {
        await assertUsable(client.connection.db);
        logger.log('Reusing existing MongoDB connection (Singleton)');
        return client.connection;
      }

      // Probe before connecting Mongoose: model auto-create/index work must not
      // touch a partially restored target before its guard has been checked.
      const probe = new client.mongo.MongoClient(uri);
      try {
        await probe.connect();
        await assertUsable(probe.db());
      } finally { await probe.close(); }
      await client.connect(uri);
      logger.log('Connected to MongoDB');
      return client.connection;
    }).finally(() => { inFlight = undefined; });
    return inFlight;
  };
}

module.exports = createConnection();
module.exports.createConnection = createConnection;
module.exports.disconnect = () => mongoose.disconnect();
