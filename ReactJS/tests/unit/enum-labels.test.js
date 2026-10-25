import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enumLabel } from '../../src/utils/enum-labels.js';

test('enumLabel localizes shared workflow and category values', () => {
  assert.equal(enumLabel('ROOM'), 'Phòng');
  assert.equal(enumLabel('EQUIPMENT'), 'Thiết bị');
  assert.equal(enumLabel('PENDING'), 'Chờ duyệt');
  assert.equal(enumLabel('GOOD'), 'Tốt');
  assert.equal(enumLabel('HOLIDAY'), 'Ngày nghỉ');
});

test('enumLabel preserves unknown values and handles empty values', () => {
  assert.equal(enumLabel('CUSTOM_STATUS'), 'CUSTOM_STATUS');
  assert.equal(enumLabel(null), '—');
});
