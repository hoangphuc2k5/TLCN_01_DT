import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getFileType, getMimeTypeFromFileName } from '../../src/utils/file-preview.js';

test('getFileType detects PDF from extension or MIME type', () => {
  assert.equal(getFileType('lecture-01.pdf'), 'pdf');
  assert.equal(getFileType('DOCUMENT.PDF'), 'pdf');
  assert.equal(getFileType('unknown-stream', 'application/pdf'), 'pdf');
});

test('getFileType detects images correctly', () => {
  assert.equal(getFileType('avatar.png'), 'image');
  assert.equal(getFileType('photo.jpg'), 'image');
  assert.equal(getFileType('scanned.jpeg'), 'image');
  assert.equal(getFileType('badge.webp'), 'image');
  assert.equal(getFileType('chart.svg'), 'image');
  assert.equal(getFileType('raw-file', 'image/png'), 'image');
});

test('getFileType detects text, json, and markdown files', () => {
  assert.equal(getFileType('notes.txt'), 'text');
  assert.equal(getFileType('README.md'), 'text');
  assert.equal(getFileType('config.json'), 'text');
  assert.equal(getFileType('log', 'text/plain'), 'text');
});

test('getFileType detects office documents and fallbacks', () => {
  assert.equal(getFileType('assignment.docx'), 'word');
  assert.equal(getFileType('legacy.doc'), 'word');
  assert.equal(getFileType('grades.xlsx'), 'excel');
  assert.equal(getFileType('sheet.xls'), 'excel');
  assert.equal(getFileType('export.csv'), 'excel');
  assert.equal(getFileType('archive.zip'), 'other');
  assert.equal(getFileType(''), 'other');
});

test('getMimeTypeFromFileName maps common extensions to appropriate browser MIME types', () => {
  assert.equal(getMimeTypeFromFileName('test.pdf'), 'application/pdf');
  assert.equal(getMimeTypeFromFileName('image.png'), 'image/png');
  assert.equal(getMimeTypeFromFileName('image.jpg'), 'image/jpeg');
  assert.equal(getMimeTypeFromFileName('doc.txt'), 'text/plain');
  assert.equal(getMimeTypeFromFileName('data.json'), 'application/json');
  assert.equal(getMimeTypeFromFileName('file.unknown'), 'application/octet-stream');
});
