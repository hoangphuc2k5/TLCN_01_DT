import { test, expect } from '@playwright/test';

async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(`${account}@test.invalid`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Phase0@Test123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('.ant-layout-sider')).toBeVisible({ timeout: 15_000 });
}

const roleMenus = {
  superadmin: ['clusters', 'schools', 'users', 'roles', 'subscriptions', 'templates', 'support', 'audit-logs'],
  clusteradmin: ['schools', 'users', 'roles', 'templates', 'support', 'fees'],
  admin0: ['schools', 'users', 'roles', 'classes', 'attendance', 'grades', 'fees', 'exams', 'materials', 'assignments', 'contact-book', 'class-life', 'appointments', 'activities', 'conduct', 'rewards', 'admissions', 'templates', 'support', 'audit-logs'],
  academic0: ['users', 'classes', 'attendance', 'exams', 'materials', 'assignments', 'contact-book', 'class-life', 'appointments', 'facilities'],
  teacher0: ['classes', 'attendance', 'grades', 'exams', 'materials', 'assignments', 'contact-book', 'class-life', 'appointments', 'facilities'],
  homeroom0: ['classes', 'attendance', 'grades', 'conduct', 'rewards', 'exams', 'materials', 'assignments', 'contact-book', 'class-life', 'appointments', 'facilities'],
  accountant0: ['fees'],
  librarian0: ['library', 'facilities'],
  student0: ['grades', 'attendance', 'fees', 'exams', 'materials', 'assignments', 'contact-book', 'class-life', 'appointments', 'activities', 'library', 'conduct', 'rewards'],
  parent0: ['grades', 'attendance', 'fees', 'exams', 'conduct', 'rewards', 'assignments', 'contact-book', 'class-life', 'appointments', 'library'],
  reader0: ['classes', 'attendance', 'grades', 'fees', 'exams', 'materials', 'library', 'facilities', 'conduct', 'templates', 'support', 'subscriptions', 'jobs'],
  creator0: ['materials'],
};

for (const [account, expectedRoutes] of Object.entries(roleMenus)) {
  test(`${account} sees its expected module menu`, async ({ page }) => {
    await login(page, account);
    const visibleRoutes = new Set(await page.locator('a[href^="/"]').evaluateAll(links =>
      links.map(link => new URL(link.getAttribute('href'), window.location.origin).pathname.replace(/^\//, ''))
    ));
    for (const route of expectedRoutes) expect(visibleRoutes, `${account} menu missing /${route}`).toContain(route);
  });
}
