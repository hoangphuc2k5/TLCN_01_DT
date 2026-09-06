import { test } from 'node:test';
import assert from 'node:assert/strict';
import { can, canVisit } from '../src/util/permissions.js';

const reader = { role: 'CUSTOM_READER', permissionEntries: [{ resource: 'users', actions: ['view'] }] };
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
