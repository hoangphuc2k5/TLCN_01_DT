// Run with API/workers stopped. No automatic expiry: an active writer must never race cleanup.
require('dotenv').config();
const mongoose = require('mongoose');
const connect = require('../src/config/database');
const FileAsset = require('../src/models/FileAsset');
const { purgeAsset } = require('../src/services/fileService');

async function main() {
  const apply = process.argv.includes('--apply');
  if (apply && !process.argv.includes('--maintenance')) throw new Error('Stop API/workers first, then supply --apply --maintenance');
  await connect();
  const assets = await FileAsset.find({ status: { $in: ['UPLOADING', 'DELETING'] } });
  console.log(`${apply ? 'Recovering' : 'Dry run:'} ${assets.length} unfinished file operations`);
  for (const asset of assets) {
    console.log(`${asset._id} school=${asset.schoolId} status=${asset.status} bytes=${asset.sizeBytes}`);
    if (apply) {
      await FileAsset.updateOne({ _id: asset._id, status: { $in: ['UPLOADING', 'DELETING'] } }, { status: 'DELETING' });
      await purgeAsset(asset);
    }
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
