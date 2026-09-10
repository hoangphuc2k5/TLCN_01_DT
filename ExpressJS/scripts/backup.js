// Operator CLI only: intentionally no HTTP restore endpoint and no automatic DB cutover.
require('dotenv').config();
const path = require('node:path');
const { parseArgs } = require('node:util');
const { MongoClient } = require('mongoose').mongo;
const service = require('../src/backup/backupService');
const { BackupError, requireThat, encryptionKey, databaseName } = require('../src/backup/safety');

const HELP = `Usage (run from ExpressJS):
  npm run backup -- create --file <absolute.edubak> --maintenance
  npm run backup -- verify --file <absolute.edubak>
  npm run backup -- restore --file <absolute.edubak> --target-db <new_name> --storage-root <new_absolute_path> --maintenance
  npm run backup -- restore --file <absolute.edubak> --target-db <new_name> --storage-root <new_absolute_path> --maintenance --apply

Restore is a read-only plan unless --apply is present. Stop all API/workers/writers.
Create: MONGO_DB_URL, JWT_SECRET, AUTH_MFA_ENCRYPTION_KEY (if MFA exists).
Restore: RESTORE_DB_URL, RESTORE_JWT_SECRET (new, >=32 characters),
         RESTORE_MFA_ENCRYPTION_KEY (same as source, if MFA exists).
All commands: BACKUP_ENCRYPTION_KEY (64 hex), BACKUP_STAGING_ROOT (optional).
No URI, password or encryption key is accepted on the command line.
See docs/phase1-backup-restore.md before operating on a real environment.`;

async function main(args = process.argv.slice(2)) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, strict: true, options: {
    help: { type: 'boolean' }, file: { type: 'string' }, 'target-db': { type: 'string' },
    'storage-root': { type: 'string' }, maintenance: { type: 'boolean' }, apply: { type: 'boolean' },
  } });
  if (values.help) { console.log(HELP); return; }
  const command = positionals[0];
  requireThat(positionals.length === 1 && ['create', 'verify', 'restore'].includes(command), 'INVALID_COMMAND');
  requireThat(values.file && path.isAbsolute(values.file), 'ABSOLUTE_ARCHIVE_PATH_REQUIRED');
  requireThat(!values.apply || command === 'restore', 'APPLY_ONLY_FOR_RESTORE');
  requireThat(command === 'restore' || (!values['target-db'] && !values['storage-root']), 'RESTORE_OPTIONS_ONLY');
  encryptionKey(process.env.BACKUP_ENCRYPTION_KEY);
  const common = {
    filename: values.file, key: process.env.BACKUP_ENCRYPTION_KEY,
    stagingRoot: path.resolve(process.env.BACKUP_STAGING_ROOT || path.join(__dirname, '../storage/backup-staging')),
    maxBytes: process.env.BACKUP_MAX_BYTES ? Number(process.env.BACKUP_MAX_BYTES) : undefined,
    maintenance: values.maintenance === true,
  };
  if (command === 'verify') { console.log(JSON.stringify(await service.verify(common), null, 2)); return; }
  requireThat(common.maintenance, 'MAINTENANCE_REQUIRED');
  const restoring = command === 'restore';
  const uri = process.env[restoring ? 'RESTORE_DB_URL' : 'MONGO_DB_URL'];
  requireThat(typeof uri === 'string' && !!uri, restoring ? 'RESTORE_DB_URL_REQUIRED' : 'MONGO_DB_URL_REQUIRED');
  if (restoring) {
    requireThat(databaseName(values['target-db']), 'NEW_TARGET_DATABASE_REQUIRED');
    requireThat(values['storage-root'] && path.isAbsolute(values['storage-root']), 'ABSOLUTE_STORAGE_PATH_REQUIRED');
    requireThat((process.env.RESTORE_JWT_SECRET || '').length >= 32, 'ROTATED_JWT_SECRET_REQUIRED');
  }
  // Secrets remain in process environment; never interpolate a URI into shell arguments.
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000, maxPoolSize: 3 });
  try {
    await client.connect();
    const db = restoring ? client.db(values['target-db']) : client.db();
    const report = restoring ? await service.restore(db, { ...common, apply: values.apply === true,
      targetDatabase: values['target-db'], localRoot: values['storage-root'],
      jwtSecret: process.env.RESTORE_JWT_SECRET, mfaKey: process.env.RESTORE_MFA_ENCRYPTION_KEY })
      : await service.create(db, { ...common, localRoot: path.resolve(process.env.FILE_LOCAL_ROOT || path.join(__dirname, '../storage/private')),
        jwtSecret: process.env.JWT_SECRET, mfaKey: process.env.AUTH_MFA_ENCRYPTION_KEY });
    console.log(JSON.stringify(report, null, 2));
  } finally { await client.close(); }
}

if (require.main === module) main().catch(error => {
  // Driver and filesystem errors may contain credentials or private paths. Do not echo them.
  console.error(JSON.stringify({ error: error instanceof BackupError ? error.code : 'BACKUP_OPERATION_FAILED',
    message: 'Operation did not complete. Review the runbook; a restored target requires a COMPLETE restoreguard and matching runtime keys.' }));
  process.exitCode = 1;
});
module.exports = { main };
