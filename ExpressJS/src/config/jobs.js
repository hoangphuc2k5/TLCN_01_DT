module.exports = () => {
  const integer = (name, fallback, min, max) => {
    const value = Number(process.env[name] || fallback);
    if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`Invalid ${name}`);
    return value;
  };
  return {
    pollMs: integer('JOB_POLL_MS', 2000, 100, 60000),
    leaseMs: integer('JOB_LEASE_MS', 90000, 1000, 3600000),
    maxAttempts: integer('JOB_MAX_ATTEMPTS', 5, 1, 20),
    retryMs: integer('JOB_RETRY_MS', 5000, 100, 3600000),
    fileDeleteGraceMs: integer('JOB_FILE_DELETE_GRACE_MS', 30000, 0, 3600000),
  };
};
