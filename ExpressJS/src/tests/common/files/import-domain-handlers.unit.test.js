const { test } = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');
const ImportService = require('../../../services/common/files/import.service');

const makeWorkbook = rows => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Data');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

function createService() {
  const calls = { users: [], grades: [], fees: [], attendance: [], exams: [] };
  const references = {
    findClassByNameFindOne: async () => ({ _id: 'class-1' }),
    findStudentByCodeFindOne: async () => ({ _id: 'student-1' }),
    byNameFindOne: async () => ({ _id: 'year-1' }),
    currentFindOne: async () => null,
    findYearByNameFindOne: async () => null,
    subjectFindOne: async () => ({ _id: 'subject-1' }),
    subjectFindOne2: async () => null,
  };
  const services = {
    user: { createUser: async (...args) => calls.users.push(args) },
    grade: { upsertGrade: async (...args) => calls.grades.push(args) },
    fee: { createInvoice: async (...args) => calls.fees.push(args) },
    attendance: { recordAttendance: async (...args) => calls.attendance.push(args) },
    exam: { createExam: async (...args) => { calls.exams.push(args); return { _id: 'exam-1' }; } },
  };
  return {
    calls,
    service: new ImportService({ persistence: references, services }),
  };
}

const actor = { _id: 'actor-1', schoolId: 'school-1' };

test('imports users and resolves optional class references', async () => {
  const { service, calls } = createService();
  const result = await service.importUsers(actor, makeWorkbook([{
    email: 'student@example.com', name: 'Student One', role: 'STUDENT',
    code: 'ST001', className: '8A', password: 'long-test-password',
  }]));

  assert.deepEqual(result, { success: 1, failed: 0, errors: [] });
  assert.equal(calls.users.length, 1);
  assert.deepEqual(calls.users[0][1], {
    email: 'student@example.com', name: 'Student One', role: 'STUDENT',
    code: 'ST001', phone: '', classId: 'class-1', password: 'long-test-password',
  });
});

test('groups grade rows by student, class, subject, year and semester', async () => {
  const { service, calls } = createService();
  const result = await service.importGrades(actor, makeWorkbook([
    { studentCode: 'ST001', className: '8A', subjectCode: 'MATH', academicYear: '2025-2026', semester: 1, type: 'ORAL', score: 8, weight: 1 },
    { studentCode: 'ST001', className: '8A', subjectCode: 'MATH', academicYear: '2025-2026', semester: 1, type: 'MIDTERM', score: 9, weight: 2 },
  ]));

  assert.deepEqual(result, { success: 2, failed: 0, errors: [] });
  assert.equal(calls.grades.length, 1);
  assert.equal(calls.grades[0][1].scores.length, 2);
  assert.equal(calls.grades[0][1].studentId, 'student-1');
});

test('imports fee invoices with resolved student and academic year', async () => {
  const { service, calls } = createService();
  const result = await service.importFees(actor, makeWorkbook([{
    studentCode: 'ST001', academicYear: '2025-2026', title: 'Tuition',
    amount: 1200, dueDate: '2025-09-30', note: 'Term 1',
  }]));

  assert.deepEqual(result, { success: 1, failed: 0, errors: [] });
  assert.equal(calls.fees.length, 1);
  assert.deepEqual(calls.fees[0][1], {
    studentId: 'student-1', academicYearId: 'year-1', title: 'Tuition',
    amount: 1200, dueDate: new Date('2025-09-30'), note: 'Term 1',
  });
});

test('groups attendance rows for one class, day and period', async () => {
  const { service, calls } = createService();
  const result = await service.importAttendance(actor, makeWorkbook([
    { date: '2025-09-01', period: 1, className: '8A', studentCode: 'ST001', status: 'PRESENT' },
    { date: '2025-09-01', period: 1, className: '8A', studentCode: 'ST002', status: 'LATE' },
  ]));

  assert.deepEqual(result, { success: 2, failed: 0, errors: [] });
  assert.equal(calls.attendance.length, 1);
  assert.equal(calls.attendance[0][1].records.length, 2);
  assert.deepEqual(calls.attendance[0][1].records.map(record => record.status), ['PRESENT', 'LATE']);
});

test('imports a parsed exam and applies class and subject metadata', async () => {
  const { service, calls } = createService();
  const result = await service.importExam(actor, makeWorkbook([{
    type: 'MCQ', prompt: '2 + 2?', optionA: '3', optionB: '4', correctKey: 'B', points: 1,
  }]), { title: 'Math quiz', className: '8A', subjectCode: 'MATH', durationMinutes: 30 });

  assert.equal(result.exam._id, 'exam-1');
  assert.equal(result.success, 1);
  assert.equal(result.failed, 0);
  assert.deepEqual(calls.exams[0][1], {
    title: 'Math quiz', classId: 'class-1', subjectId: 'subject-1', durationMinutes: 30,
    questions: [{
      type: 'MCQ', prompt: '2 + 2?', options: [{ key: 'A', text: '3' }, { key: 'B', text: '4' }],
      correctKey: 'B', points: 1,
    }],
    status: 'DRAFT',
  });
});

test('rejects imports from actors outside a school', async () => {
  const { service } = createService();
  await assert.rejects(service.importFees({ _id: 'global-actor' }, makeWorkbook([])), /thuộc trường/);
});
