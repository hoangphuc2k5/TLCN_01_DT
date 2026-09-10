import { test } from 'node:test';
import assert from 'node:assert/strict';
import { can, canVisit, canExport } from '../src/util/permissions.js';

const reader = { role: 'CUSTOM_READER', permissionEntries: [{ resource: 'users', actions: ['view'] }] };

test('job route and execution controls require distinct permissions', () => {
  assert.equal(canVisit(reader, '/jobs'), false);
  const viewer = { role: 'CUSTOM_VIEWER', permissionEntries: [{ resource: 'jobs', actions: ['view'] }] };
  assert.equal(canVisit(viewer, '/jobs'), true);
  assert.equal(can(viewer, 'jobs', 'execute'), false);
  assert.equal(canVisit({ role: 'SCHOOL_ADMIN', permissionEntries: [] }, '/jobs'), false);
});
test('custom reader sees users route but not roles or subscriptions', () => {
  assert.equal(canVisit(reader, '/users'), true);
  assert.equal(canVisit(reader, '/roles'), false);
  assert.equal(canVisit(reader, '/subscriptions'), false);
});
test('read permission never enables mutation controls', () => {
  for (const action of ['create', 'update', 'delete', 'execute']) assert.equal(can(reader, 'users', action), false);
});
test('system role alone does not grant mutation permission', () => {
  assert.equal(can({ role: 'SCHOOL_ADMIN', permissionEntries: [] }, 'users', 'create'), false);
});
test('custom role may open subscriptions if explicitly granted view', () => {
  assert.equal(canVisit({ role: 'BILLING_READER', permissionEntries: [{ resource: 'subscriptions', actions: ['view'] }] }, '/subscriptions'), true);
});
test('lesson-plan route follows its own resource permission', () => {
  assert.equal(canVisit({ role: 'CUSTOM', permissionEntries: [{ resource: 'lesson_plans', actions: ['view'] }] }, '/lesson-plans'), true);
  assert.equal(canVisit(reader, '/lesson-plans'), false);
});
test('student and parent retain personal pages but not management routes', () => {
  for (const role of ['STUDENT', 'PARENT']) {
    const user = { role, permissionEntries: [{ resource: 'own_data', actions: ['view'] }] };
    for (const page of ['grades', 'fees', 'attendance', 'conduct']) assert.equal(canVisit(user, '/' + page), true);
    assert.equal(canVisit(user, '/users'), false);
    assert.equal(can(user, 'fees', 'create'), false);
  }
});
test('unauthenticated and unknown routes fail closed', () => {
  assert.equal(canVisit(null, '/users'), false);
  assert.equal(canVisit(reader, '/unregistered'), false);
});
test('super admin retains management access', () => assert.equal(canVisit({ role: 'SUPER_ADMIN' }, '/users'), true));
test('report reader can open and export academic reports without mutation permissions', () => {
  const user = { role: 'REPORT_READER', permissionEntries: [{ resource: 'reports', actions: ['view'] }] };
  for (const resource of ['grades', 'fees', 'attendance']) {
    assert.equal(canVisit(user, '/' + resource), true);
    assert.equal(canExport(user, resource), true);
    assert.equal(can(user, resource, 'create'), false);
  }
});
test('teacher export requires module view and personal export requires own_data', () => {
  const reports = [{ resource: 'reports', actions: ['view'] }];
  assert.equal(canExport({ role: 'SUBJECT_TEACHER', permissionEntries: reports }, 'fees'), false);
  assert.equal(canExport({ role: 'PARENT', permissionEntries: reports }, 'grades'), false);
  assert.equal(canExport(reader, 'unknown'), false);
});
