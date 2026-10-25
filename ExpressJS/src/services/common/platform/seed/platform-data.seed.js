

class SeedPlatformData {
  constructor(dependencies) {
    this.seedRepository = dependencies.repositories.seed;
  }

  async seed() {
    const { seedRepository } = this;
    const cluster = await seedRepository.create('cluster', {
      name: 'Hệ thống Giáo dục Ánh Sáng',
      code: 'ANHSANG',
      description: 'Cụm trường demo đa cơ sở',
    });

    const school1 = await seedRepository.create('school', {
      name: 'THCS Ánh Sáng - Cơ sở 1',
      code: 'AS1',
      subdomain: 'as1',
      clusterId: cluster._id,
      address: '123 Nguyễn Huệ, Q1, TP.HCM',
      phone: '0281234567',
      email: 'as1@anhsang.edu.vn',
      schoolType: 'SECONDARY',
    });

    const school2 = await seedRepository.create('school', {
      name: 'THCS Ánh Sáng - Cơ sở 2',
      code: 'AS2',
      subdomain: 'as2',
      clusterId: cluster._id,
      address: '45 Lê Lợi, Q3, TP.HCM',
      phone: '0287654321',
      email: 'as2@anhsang.edu.vn',
      schoolType: 'SECONDARY',
    });

    await seedRepository.create('subscription', {
      schoolId: school1._id,
      plan: 'PREMIUM',
      maxStudents: 1000,
      maxTeachers: 100,
      storageGb: 50,
      features: ['exams', 'library', 'materials'],
      expiresAt: new Date('2026-12-31'),
      status: 'ACTIVE',
    });

    const sub1 = await seedRepository.findOne('subscription', { schoolId: school1._id });
    await seedRepository.create('subscription-invoice', {
      schoolId: school1._id,
      subscriptionId: sub1._id,
      plan: 'PREMIUM',
      amount: 5000000,
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-12-31'),
      status: 'PAID',
      paidAt: new Date('2026-01-02'),
      note: 'Gia hạn năm 2026',
    });

    await seedRepository.create('subscription', {
      schoolId: school2._id,
      plan: 'BASIC',
      maxStudents: 500,
      maxTeachers: 50,
      storageGb: 20,
      expiresAt: new Date('2026-12-31'),
      status: 'ACTIVE',
    });

    const sub2 = await seedRepository.findOne('subscription', { schoolId: school2._id });
    await seedRepository.create('subscription-invoice', {
      schoolId: school2._id,
      subscriptionId: sub2._id,
      plan: 'BASIC',
      amount: 2000000,
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-12-31'),
      status: 'PAID',
      paidAt: new Date('2026-01-02'),
      note: 'Gia hạn năm 2026',
    });
    return { cluster, school1, school2 };
  }
}

module.exports = SeedPlatformData;
