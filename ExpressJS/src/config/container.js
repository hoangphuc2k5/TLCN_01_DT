const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');
const logger = require('./logger/logger.config');
const eventBus = require('./events/event-bus.config');

const filesIn = root => fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
  const target = path.join(root, entry.name);
  return entry.isDirectory() ? filesIn(target) : [target];
});

const loadFeatureModules = (root, suffix) => Object.fromEntries(
  filesIn(root)
    .filter(file => file.endsWith(`.${suffix}.js`))
    .map(file => [path.basename(file, `.${suffix}.js`), require(file)])
);

const models = loadFeatureModules(path.join(__dirname, '../models'), 'model');
const repositoryClasses = {};
for (const file of filesIn(path.join(__dirname, '../repository'))
  .filter(file => file.endsWith('.repository.js') && path.basename(file) !== 'base.repository.js')) {
  const feature = path.basename(file, '.repository.js');
  (repositoryClasses[feature] ||= []).push(require(file));
}

const repositoryCache = {};
const repositories = new Proxy(repositoryCache, {
  get(cache, feature) {
    if (typeof feature !== 'string') return cache[feature];
    if (cache[feature]) return cache[feature];
    const classes = repositoryClasses[feature];
    if (!classes) return undefined;
    const shared = feature === 'shared' ? undefined : repositories.shared;
    const instances = classes.map(Repository => new Repository({
      models,
      shared,
      database: mongoose,
      eventBus,
    }));
    cache[feature] = new Proxy({}, {
      get(_target, property) {
        for (const instance of instances) {
          const value = instance[property];
          if (typeof value === 'function') return value.bind(instance);
          if (value !== undefined) return value;
        }
        return undefined;
      },
    });
    return cache[feature];
  },
});

const serviceClasses = loadFeatureModules(path.join(__dirname, '../services'), 'service');
const serviceCache = {};
const services = new Proxy(serviceCache, {
  get(cache, feature) {
    if (typeof feature !== 'string') return cache[feature];
    if (cache[feature]) return cache[feature];
    const Service = serviceClasses[feature];
    if (!Service) return undefined;
    const placeholder = {};
    cache[feature] = placeholder;
    const instance = new Service({
      persistence: repositories[feature],
      repositories,
      services,
      logger,
      eventBus,
    });
    if (typeof instance.execute === 'function' && Object.keys(instance).length === 1) {
      const callable = instance.execute.bind(instance);
      callable.execute = callable;
      cache[feature] = callable;
      return callable;
    }
    Object.assign(placeholder, instance);
    return placeholder;
  },
});

module.exports = Object.freeze({ models, repositories, services, logger, eventBus });
