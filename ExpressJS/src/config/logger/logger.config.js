// CommonJS caches this instance for every consumer in the process.
// Resolve console methods at call time to preserve redirection and test hooks.
const logger = Object.freeze({
  log: (...args) => console.log(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
  debug: (...args) => console.debug(...args),
});

module.exports = logger;
