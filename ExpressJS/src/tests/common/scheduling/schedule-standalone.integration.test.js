const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const School = require("../../../models/admin/school.model");
const transaction = require("../../../config/container").services["schedule-transaction"];
test('standalone MongoDB rejects schedule writes before running mutation and preserves the school revision', async () => {
  const mongo = await MongoMemoryServer.create();
  try {
    await mongoose.connect(mongo.getUri());
    const school = await School.create({ name: 'Standalone', code: 'SOLO', subdomain: 'solo' });
    let ran = false;
    await assert.rejects(transaction(school._id, async () => { ran = true; }), error => error.statusCode === 503);
    assert.equal(ran, false);
    assert.equal((await School.findById(school._id).select('+scheduleRevision')).scheduleRevision, 0);
  } finally { await mongoose.disconnect(); await mongo.stop(); }
});
