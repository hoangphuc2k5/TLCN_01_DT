/**
 * Seed demo data — orchestration for the local MVP demo.
 * Run: npm run seed
 */
const bcrypt = require('bcrypt');
const SeedPlatformData = require('./seed/platform-data.seed');
const SeedAccounts = require('./seed/accounts.seed');
const SeedAcademicData = require('./seed/academic-data.seed');
const SeedFunctionalData = require('./seed/functional-data.seed');

const DEMO_PASSWORD = 'Password@123';
const COLLECTIONS_TO_CLEAR = [
  'notification', 'leave-request', 'attendance', 'grade', 'fee-invoice',
  'timetable', 'teacher-assignment', 'announcement', 'exam-attempt', 'exam',
  'learning-material', 'book-loan', 'library-book', 'facility-request',
  'support-ticket', 'conduct-record', 'shared-template', 'subscription-invoice',
  'subscription', 'message', 'calendar-event', 'audit-log', 'class', 'subject',
  'academic-year', 'user', 'school', 'cluster', 'role',
];

class SeedService {
  constructor(dependencies) {
    this.seedRepository = dependencies.repositories.seed;
    this.seedSystemRoles = dependencies.services.role.seedSystemRoles;
    this.logger = dependencies.logger;
    this.platformData = new SeedPlatformData(dependencies);
    this.accounts = new SeedAccounts(dependencies);
    this.academicData = new SeedAcademicData(dependencies);
    this.functionalData = new SeedFunctionalData(dependencies);
  }

  async run() {
    this.logger.log('Connected. Clearing old data...');
    await this.seedRepository.clear(COLLECTIONS_TO_CLEAR);

    this.logger.log('Seeding system roles...');
    await this.seedSystemRoles({ force: true });
    const password = await bcrypt.hash(DEMO_PASSWORD, 10);
    const platform = await this.platformData.seed();
    const accounts = await this.accounts.seed({ ...platform, password });
    const academic = await this.academicData.seed({ ...platform, ...accounts, password });
    await this.functionalData.seed({ ...platform, ...accounts, ...academic });

    this.logger.log('\n========== SEED COMPLETE ==========');
    this.logger.log('Password for all accounts: ' + DEMO_PASSWORD + '\n');
    this.logger.log('Accounts:');
    this.logger.log('  superadmin@system.vn          SUPER_ADMIN');
    this.logger.log('  cluster@anhsang.edu.vn        CLUSTER_ADMIN');
    this.logger.log('  hieutruong@as1.edu.vn         SCHOOL_ADMIN (CS1)');
    this.logger.log('  giaovu@as1.edu.vn             ACADEMIC_AFFAIRS');
    this.logger.log('  gvtoan@as1.edu.vn             SUBJECT_TEACHER');
    this.logger.log('  gvcn@as1.edu.vn               HOMEROOM_TEACHER');
    this.logger.log('  ketoan@as1.edu.vn             ACCOUNTANT');
    this.logger.log('  thuthu@as1.edu.vn              LIBRARIAN');
    this.logger.log('  hs1@as1.edu.vn                STUDENT');
    this.logger.log('  phuhuynh@as1.edu.vn           PARENT');
    this.logger.log('  hieutruong@as2.edu.vn         SCHOOL_ADMIN (CS2)');
    this.logger.log('===================================\n');
  }
}

module.exports = SeedService;
