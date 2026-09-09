require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('node:dns');

// Optional process-local override for networks that refuse Atlas SRV/TXT queries.
// Configure before opening connections; never change the machine's DNS settings.
const dnsServers = (process.env.DNS_SERVERS || '').split(',').map(value => value.trim()).filter(Boolean);
if (dnsServers.length) dns.setServers(dnsServers);

const connection = async () => {
  const uri = process.env.MONGO_DB_URL;
  if (!uri) throw new Error('MONGO_DB_URL is missing');

  // Singleton: reuse existing connection if present
  if (mongoose.connection.readyState === 1) {
    await require('../backup/restoreGuard').assertUsable(mongoose.connection.db);
    console.log('Reusing existing MongoDB connection (Singleton)');
    return mongoose.connection;
  }

  // Probe before connecting Mongoose: model auto-create/index work must not touch
  // a partially restored target before its guard has been checked.
  const probe = new mongoose.mongo.MongoClient(uri);
  try {
    await probe.connect();
    await require('../backup/restoreGuard').assertUsable(probe.db());
  } finally { await probe.close(); }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
  return mongoose.connection;
};

module.exports = connection;
