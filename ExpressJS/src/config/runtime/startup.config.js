const connection = require('../database/database.config');
const container = require('../container');
const registerEventListeners = require('../events/register-listeners.config');

let startupPromise;

async function startRuntime() {
  if (process.env.VERCEL && (process.env.FILE_STORAGE_DRIVER || 'local') === 'local') {
    throw new Error('FILE_STORAGE_DRIVER=s3 is required on Vercel because its filesystem is ephemeral');
  }

  await connection();
  await container.repositories.system.initializeModels(['file-asset', 'job', 'auth-attempt']);
  registerEventListeners();

  const roleCache = container.services['role-permission-cache'];
  const { seedSystemRoles } = container.services.role;
  try {
    await seedSystemRoles();
  } catch (error) {
    container.logger.warn('seedSystemRoles warning:', error.message);
    await roleCache.reload();
  }
}

module.exports = function ensureRuntimeStarted() {
  if (!startupPromise) {
    startupPromise = startRuntime().catch(error => {
      startupPromise = undefined;
      throw error;
    });
  }
  return startupPromise;
};

