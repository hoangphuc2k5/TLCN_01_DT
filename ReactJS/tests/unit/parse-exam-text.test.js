import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTextExam } from '../../src/utils/exam-parser.js';

test('parses Vietnamese format multiple choice questions and essays', () => {
  const text = `
Câu 1: Thủ đô của Việt Nam là gì?
A. Hà Nội
B. Đà Nẵng
C. TP.HCM
D. Cần Thơ
Đáp án: A

Câu 2: Số chẵn nhỏ nhất là gì?
A. 0
B. 2
C. 4
D. 6
Đáp án: A

Câu 3: Nêu cảm nghĩ của em về mùa thu Hà Nội.
  `;

  const parsed = parseTextExam(text);
  assert.equal(parsed.length, 3);

  // Question 1
  assert.equal(parsed[0].type, 'MCQ');
  assert.equal(parsed[0].prompt, 'Thủ đô của Việt Nam là gì?');
  assert.equal(parsed[0].options.length, 4);
  assert.equal(parsed[0].correctKey, 'A');
  assert.equal(parsed[0].points, 1);

  // Question 2
  assert.equal(parsed[1].type, 'MCQ');
  assert.equal(parsed[1].prompt, 'Số chẵn nhỏ nhất là gì?');
  assert.equal(parsed[1].correctKey, 'A');

  // Question 3
  assert.equal(parsed[2].type, 'ESSAY');
  assert.equal(parsed[2].prompt, 'Nêu cảm nghĩ của em về mùa thu Hà Nội.');
  assert.equal(parsed[2].points, 2);
});

test('handles empty text and whitespace gracefully', () => {
  assert.deepEqual(parseTextExam(''), []);
  assert.deepEqual(parseTextExam('   \n\n  '), []);
});
