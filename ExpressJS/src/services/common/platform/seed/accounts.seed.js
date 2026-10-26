const { ROLES } = require('../../../../config/constants/roles.config');

class SeedAccounts {
  constructor(dependencies) {
    this.seedRepository = dependencies.repositories.seed;
    this.ROLES = dependencies.ROLES || ROLES;
  }

  async seed({ cluster, school1, password }) {
    const { seedRepository, ROLES } = this;
    const superAdmin = await seedRepository.create('user', {
      name: 'Super Admin',
      email: 'superadmin@system.vn',
      password,
      role: ROLES.SUPER_ADMIN,
      code: 'SA001',
    });

    await seedRepository.create('user', {
      name: 'Quản lý cụm Ánh Sáng',
      email: 'cluster@anhsang.edu.vn',
      password,
      role: ROLES.CLUSTER_ADMIN,
      clusterId: cluster._id,
      code: 'CA001',
    });

    const schoolAdmin = await seedRepository.create('user', {
      name: 'Hiệu trưởng Nguyễn Văn A',
      email: 'hieutruong@as1.edu.vn',
      password,
      role: ROLES.SCHOOL_ADMIN,
      schoolId: school1._id,
      clusterId: cluster._id,
      code: 'HT001',
    });

    await seedRepository.create('user', {
      name: 'Giáo vụ Trần Thị B',
      email: 'giaovu@as1.edu.vn',
      password,
      role: ROLES.ACADEMIC_AFFAIRS,
      schoolId: school1._id,
      clusterId: cluster._id,
      code: 'GVU001',
    });

    const teacher = await seedRepository.create('user', {
      name: 'GV Toán Lê Văn C',
      email: 'gvtoan@as1.edu.vn',
      password,
      role: ROLES.SUBJECT_TEACHER,
      schoolId: school1._id,
      clusterId: cluster._id,
      code: 'GV001',
    });

    const homeroom = await seedRepository.create('user', {
      name: 'GVCN Phạm Thị D',
      email: 'gvcn@as1.edu.vn',
      password,
      role: ROLES.HOMEROOM_TEACHER,
      schoolId: school1._id,
      clusterId: cluster._id,
      code: 'CN001',
    });

    await seedRepository.create('user', {
      name: 'Kế toán Hoàng E',
      email: 'ketoan@as1.edu.vn',
      password,
      role: ROLES.ACCOUNTANT,
      schoolId: school1._id,
      clusterId: cluster._id,
      code: 'KT001',
    });

    const librarian = await seedRepository.create('user', {
      name: 'Thủ thư Ngô F',
      email: 'thuthu@as1.edu.vn',
      password,
      role: ROLES.LIBRARIAN,
      schoolId: school1._id,
      clusterId: cluster._id,
      code: 'TT001',
    });
    return { superAdmin, schoolAdmin, teacher, homeroom, librarian };
  }
}

module.exports = SeedAccounts;
