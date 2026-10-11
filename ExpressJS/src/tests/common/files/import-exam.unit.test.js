const { test } = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');
const importService = require("../../../config/container").services["import"];

test('builds exam template buffer and parses exam questions correctly', async () => {
  const { buffer, filename } = importService.buildTemplateBuffer('exams');
  assert.equal(filename, 'mau-import-de-thi.xlsx');
  assert.ok(buffer && buffer.length > 0);

  const parsed = importService.parseExamQuestions(buffer);
  assert.equal(parsed.total, 3);
  assert.equal(parsed.errors.length, 0);

  // Question 1: MCQ
  assert.equal(parsed.questions[0].type, 'MCQ');
  assert.equal(parsed.questions[0].prompt, 'Thủ đô của Việt Nam là thành phố nào?');
  assert.equal(parsed.questions[0].correctKey, 'A');
  assert.equal(parsed.questions[0].points, 1);
  assert.equal(parsed.questions[0].options.length, 4);

  // Question 3: ESSAY
  assert.equal(parsed.questions[2].type, 'ESSAY');
  assert.equal(parsed.questions[2].prompt, 'Nêu cảm nghĩ của em về ngày đầu tiên đi học.');
  assert.equal(parsed.questions[2].points, 2);
});

test('parses custom workbook with Vietnamese headers and mixed questions', async () => {
  const wb = XLSX.utils.book_new();
  const rows = [
    {
      LoaiCau: 'MCQ',
      CauHoi: '2 + 2 = ?',
      DapAnA: '3',
      DapAnB: '4',
      DapAnC: '5',
      DapAnD: '6',
      DapAnDung: 'B',
      Diem: 1.5,
    },
    {
      LoaiCau: 'TULUAN',
      CauHoi: 'Giải phương trình bậc hai sau...',
      Diem: 3,
    },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Questions');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const parsed = importService.parseExamQuestions(buffer);
  assert.equal(parsed.total, 2);
  assert.equal(parsed.questions[0].type, 'MCQ');
  assert.equal(parsed.questions[0].correctKey, 'B');
  assert.equal(parsed.questions[0].points, 1.5);
  assert.equal(parsed.questions[1].type, 'ESSAY');
  assert.equal(parsed.questions[1].points, 3);
});
