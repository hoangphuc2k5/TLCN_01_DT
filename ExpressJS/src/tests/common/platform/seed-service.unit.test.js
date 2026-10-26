const { test } = require('node:test');
const assert = require('node:assert/strict');
const SeedService = require('../../../services/common/platform/seed.service');

test('seed service composes platform, account, academic and demo data phases', async () => {
  const created = [];
  const logs = [];
  const subscriptions = new Map();
  let nextId = 0;
  const seedRepository = {
    clear: async collections => { created.push({ operation: 'clear', collections }); },
    create: async (collection, data) => {
      const record = { ...data, _id: `seed-${++nextId}` };
      if (collection === 'subscription') subscriptions.set(String(data.schoolId), record);
      if (collection === 'exam') {
        record.questions = data.questions.map((question, index) => ({ ...question, _id: `question-${index + 1}` }));
      }
      created.push({ collection, data, record });
      return record;
    },
    findOne: async (collection, filter) => subscriptions.get(String(filter.schoolId)) || null,
    findByIdAndUpdate: async (collection, id, update) => {
      created.push({ operation: 'update', collection, id, update });
    },
  };
  const dependencies = {
    repositories: { seed: seedRepository },
    services: {
      role: { seedSystemRoles: async options => { created.push({ operation: 'roles', options }); } },
      'grade-strategy': {
        getGradeStrategy: () => ({
          calculateAverage: scores => scores.reduce((total, score) => total + score.score, 0) / scores.length,
          classify: () => 'TOT',
        }),
      },
    },
    logger: { log: message => logs.push(message) },
  };

  await new SeedService(dependencies).run();

  assert.equal(created[0].operation, 'clear');
  assert.deepEqual(created[1], { operation: 'roles', options: { force: true } });
  assert.ok(created.some(entry => entry.collection === 'school'));
  assert.ok(created.some(entry => entry.collection === 'user' && entry.data?.email === 'hs1@as1.edu.vn'));
  assert.ok(created.some(entry => entry.collection === 'grade'));
  assert.ok(created.some(entry => entry.collection === 'fee-invoice'));
  assert.ok(created.some(entry => entry.collection === 'exam-attempt'));
  assert.ok(created.some(entry => entry.collection === 'calendar-event'));
  assert.ok(logs.some(message => message.includes('SEED COMPLETE')));
  assert.ok(logs.some(message => message.includes('Password@123')));
});
