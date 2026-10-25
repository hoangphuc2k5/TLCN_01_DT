class ImportUserHandlers {
  constructor(dependencies) {
    const context = dependencies.context;
    const { userService, ROLES, parseWorkbook, pick, requireSchoolActor, findClassByName } = context;
    const importUsers = async (actor, buffer) => {
      requireSchoolActor(actor);
      const rows = parseWorkbook(buffer);
      const result = { success: 0, failed: 0, errors: [] };

      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const line = i + 2;
        try {
          const email = String(pick(row, 'email', 'Email', 'Gmail')).toLowerCase().trim();
          const name = String(pick(row, 'name', 'Name', 'HoTen', 'Họ tên')).trim();
          const role = String(pick(row, 'role', 'Role', 'VaiTro') || ROLES.STUDENT)
            .toUpperCase()
            .trim();
          const code = String(pick(row, 'code', 'Code', 'Ma') || '').trim();
          const phone = String(pick(row, 'phone', 'Phone', 'SDT') || '').trim();
          const className = String(pick(row, 'className', 'Lop', 'class') || '').trim();
          const passwordRaw = String(pick(row, 'password', 'Password', 'MatKhau') || '');
          const password =
            passwordRaw ||
            undefined;
          if (!password && process.env.ALLOW_PASSWORD_LOGIN !== 'false') throw new Error('Thiếu mật khẩu riêng cho tài khoản (ít nhất 15 ký tự).');

          if (!Object.values(ROLES).includes(role) || role === ROLES.SUPER_ADMIN) {
            throw new Error(`Role không hợp lệ: ${role}`);
          }

          let classId;
          if (className) {
            const cls = await findClassByName(actor.schoolId, className);
            if (!cls) throw new Error(`Không tìm thấy lớp ${className}`);
            classId = cls._id;
          }

          await userService.createUser(actor, {
            email,
            name,
            role,
            code,
            phone,
            classId,
            password,
          });
          result.success += 1;
        } catch (err) {
          result.failed += 1;
          result.errors.push({ line, message: err.message || String(err) });
        }
      }

      return result;
    };
    Object.assign(this, { importUsers });
  }
}

module.exports = ImportUserHandlers;
