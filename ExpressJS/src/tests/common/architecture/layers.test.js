const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const src = path.resolve(__dirname, '../../..');
const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
  ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);

test('src contains only the declared layers and the two Express entry points', () => {
  const expectedDirectories = [
    'config', 'controllers', 'dtos', 'middleware', 'models',
    'repository', 'routes', 'services', 'tests', 'utils',
  ];
  const entries = fs.readdirSync(src, { withFileTypes: true });
  assert.deepEqual(
    entries.filter(entry => entry.isDirectory()).map(entry => entry.name).sort(),
    expectedDirectories.sort()
  );
  assert.deepEqual(
    entries.filter(entry => entry.isFile()).map(entry => entry.name).sort(),
    ['app.js', 'server.js']
  );
});

test('layer content is grouped in declared role directories', () => {
  const layers = [
    'controllers', 'dtos', 'middleware', 'models', 'repository',
    'routes', 'services', 'tests', 'utils',
  ];
  const directFiles = layers.flatMap(layer => fs.readdirSync(path.join(src, layer), { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.join(layer, entry.name)));
  const allowedRoles = {
    controllers: ['admin', 'common', 'finance', 'operations', 'teacher', 'student', 'parent'],
    dtos: ['admin', 'common', 'finance', 'operations', 'teacher', 'student', 'parent'],
    middleware: ['common'],
    models: ['admin', 'common', 'finance', 'operations', 'teacher'],
    repository: ['admin', 'common', 'finance', 'operations', 'teacher', 'student', 'parent'],
    routes: ['admin', 'common', 'finance', 'operations', 'teacher', 'student', 'parent'],
    services: ['admin', 'common', 'finance', 'operations', 'teacher', 'student', 'parent'],
    tests: ['admin', 'common', 'finance', 'operations', 'teacher', 'student', 'parent'],
    utils: ['common'],
  };
  const invalidRoleDirectories = layers.flatMap(layer => fs.readdirSync(path.join(src, layer), { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !allowedRoles[layer].includes(entry.name))
    .map(entry => path.join(layer, entry.name)));
  const nestedRoleDirectories = Object.keys(allowedRoles).flatMap(layer => fs.readdirSync(path.join(src, layer), { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name !== 'common')
    .flatMap(role => fs.readdirSync(path.join(src, layer, role.name), { withFileTypes: true })
      .filter(entry => entry.isDirectory()).map(entry => path.join(layer, role.name, entry.name))));
  const uppercaseDirectories = layers.flatMap(layer => files(path.join(src, layer))
    .map(file => path.relative(path.join(src, layer), path.dirname(file)))
    .flatMap(relative => relative.split(path.sep))
    .filter(Boolean)
    .filter(directory => directory !== directory.toLowerCase()));
  assert.deepEqual(directFiles, []);
  assert.deepEqual(invalidRoleDirectories, []);
  assert.deepEqual(nestedRoleDirectories, []);
  assert.deepEqual([...new Set(uppercaseDirectories)], []);
});

test('services receive persistence dependencies instead of importing models or the container', () => {
  const violations = files(path.join(src, 'services')).filter(file => file.endsWith('.js'))
    .filter(file => /require\([^\n]*(?:\/models\/|\/container['"])|dependencies\.references/.test(fs.readFileSync(file, 'utf8')));
  assert.deepEqual(violations.map(file => path.relative(src, file)), []);
});

test('services export constructor-injected service classes', () => {
  const violations = files(path.join(src, 'services')).filter(file => file.endsWith('.js'))
    .filter(file => !/constructor\(dependencies\)/.test(fs.readFileSync(file, 'utf8')));
  assert.deepEqual(violations.map(file => path.relative(src, file)), []);
});

test('repositories export constructor-injected repository classes', () => {
  const violations = files(path.join(src, 'repository')).filter(file => file.endsWith('.repository.js'))
    .filter(file => !/constructor\(/.test(fs.readFileSync(file, 'utf8')));
  assert.deepEqual(violations.map(file => path.relative(src, file)), []);
});

test('runtime layers outside repositories do not import models directly', () => {
  const allowedRoots = new Set(['models', 'repository', 'tests']);
  const violations = files(src).filter(file => file.endsWith('.js'))
    .filter(file => !allowedRoots.has(path.relative(src, file).split(path.sep)[0]))
    .filter(file => /require\([^\n]*[\\/]models[\\/]/.test(fs.readFileSync(file, 'utf8')));
  assert.deepEqual(violations.map(file => path.relative(src, file)), []);
});

test('models contain schema definitions without hooks, methods or statics', () => {
  const violations = files(path.join(src, 'models')).filter(file => file.endsWith('.model.js'))
    .filter(file => /\.(?:pre|post)\(|\.methods\.|\.statics\./.test(fs.readFileSync(file, 'utf8')));
  assert.deepEqual(violations.map(file => path.relative(src, file)), []);
});

test('the Express application installs one centralized error handler', () => {
  const source = fs.readFileSync(path.join(src, 'app.js'), 'utf8');
  assert.equal((source.match(/app\.use\(errorHandler\)/g) || []).length, 1);
  assert.equal((source.match(/app\.use\(notFoundHandler\)/g) || []).length, 1);
});

test('the composition root exposes a stable application service instance', () => {
  const container = require('../../../config/container');
  assert.equal(container.services.auth, container.services.auth);
  assert.equal(typeof container.services.auth.login, 'function');
});
