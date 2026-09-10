const { setTimeout: delay } = require('node:timers/promises');
const jobs = require('../services/jobService');
const config = require('../config/jobs');
const defaultHandlers = require('./handlers');

const runOnce = async ({ handlers = defaultHandlers } = {}) => {
  const job = await jobs.claim();
  if (!job) return false;
  let leaseLost = false, beating = false;
  const timer = setInterval(async () => {
    if (beating) return;
    beating = true;
    try { if (!await jobs.heartbeat(job)) leaseLost = true; }
    catch { leaseLost = true; }
    finally { beating = false; }
  }, Math.floor(config().leaseMs / 3));
  timer.unref();
  try {
    if (!handlers[job.kind]) throw Object.assign(new Error('Handler unavailable'), { code: 'HANDLER_UNAVAILABLE' });
    const result = await handlers[job.kind](job);
    if (!leaseLost) await jobs.complete(job, result);
  } catch (error) {
    if (!leaseLost) await jobs.fail(job, error);
  } finally { clearInterval(timer); }
  return true;
};
const run = async ({ signal } = {}) => {
  const settings = config();
  while (!signal?.aborted) {
    try {
      await jobs.dispatch();
      if (signal?.aborted) break;
      if (await runOnce()) continue;
    } catch { console.error('[jobs] Worker tick failed; retrying on next poll'); }
    try { await delay(settings.pollMs, undefined, { signal }); }
    catch (error) { if (error.name !== 'AbortError') throw error; }
  }
};
module.exports = { run, runOnce };
