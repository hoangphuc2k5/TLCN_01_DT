import { test, expect } from '@playwright/test';

async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(`${account}@test.invalid`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Phase0@Test123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function openPage(page, path, endpoint = path) {
  const response = page.waitForResponse(r => r.url().includes(`/v1/api${endpoint}`) && r.request().method() === 'GET');
  await page.goto(path);
  expect((await response).status()).toBe(200);
}

for (const [path, endpoint, forbidden] of [
  ['/grades', '/grades', ['Nhập / cập nhật điểm', 'upload Import Excel']],
  ['/attendance', '/attendance', ['Lưu điểm danh', 'upload Import Excel']],
  ['/fees', '/fees', ['Tạo hóa đơn', 'Thu tiền', 'upload Import Excel']],
  ['/materials', '/materials', ['Thêm học liệu', 'Xóa']],
  ['/exams', '/exams', ['Tạo đề thi', 'Mở đề', 'Làm bài']],
  ['/library', '/library/books', ['Thêm sách']],
  ['/facilities', '/facilities', ['Đăng ký mượn', 'Duyệt', 'Từ chối']],
  ['/conduct', '/conduct', ['Nhập hạnh kiểm']],
  ['/templates', '/templates', ['Tạo mẫu', 'Áp dụng cho trường']],
  ['/support', '/support-tickets', ['Tạo ticket hỗ trợ']],
  ['/classes', '/classes', ['Thêm lớp', 'Thêm năm học']],
  ['/subscriptions', '/subscriptions', ['Gán / cập nhật gói']],
  ['/schools', '/schools', ['Thêm trường', 'Sửa', 'Xóa']],
  ['/announcements', '/announcements', ['Soạn thông báo', 'Xóa']],
  ['/calendar', '/calendar', ['Thêm sự kiện', 'Xóa']],
]) {
  test(`reader has no write controls on ${path}`, async ({ page }) => {
    await login(page, 'reader0');
    await openPage(page, path, endpoint);
    for (const name of forbidden) await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
    if (path === '/library') {
      await page.getByRole('tab', { name: 'Mượn / Trả' }).click();
      await expect(page.getByRole('button', { name: 'Cho mượn', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Trả sách', exact: true })).toHaveCount(0);
    }
    if (['/grades', '/attendance', '/fees'].includes(path)) await expect(page.getByRole('button', { name: 'Xuất Excel', exact: true })).toBeVisible();
    if (path === '/grades') await page.screenshot({ path: 'test-results/reader-grades.png', fullPage: true });
  });
}

test('custom reader cannot bypass menu using direct URL', async ({ page }) => {
  await login(page, 'reader0');
  await expect(page.locator('a[href="/roles"]')).toHaveCount(0);
  await page.goto('/roles');
  await expect(page.getByRole('button', { name: 'Tạo vai trò', exact: true })).toHaveCount(0);
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('custom create-only role can add material without delete or users permission', async ({ page }) => {
  await login(page, 'creator0');
  await openPage(page, '/materials');
  await page.getByRole('button', { name: 'Thêm học liệu', exact: true }).click();
  await page.getByLabel('Tiêu đề', { exact: true }).fill('QA created material');
  const saved = page.waitForResponse(r => r.url().endsWith('/v1/api/materials') && r.request().method() === 'POST');
  await page.getByRole('dialog').getByRole('button', { name: 'Đồng ý', exact: true }).click();
  expect((await saved).status()).toBe(201);
  await expect(page.getByRole('cell', { name: 'QA created material', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xóa', exact: true })).toHaveCount(0);
});

test('parent sees only own child in grades, fees and nested attendance', async ({ page }) => {
  await login(page, 'parent0');
  for (const path of ['/grades', '/fees']) {
    await openPage(page, path);
    await expect(page.getByRole('cell', { name: 'student 0', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'peer 0', exact: true })).toHaveCount(0);
    await expect(page.getByRole('cell', { name: 'student 1', exact: true })).toHaveCount(0);
  }
  await openPage(page, '/attendance');
  await page.getByRole('button', { name: 'Mở rộng dòng', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'student 0', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'peer 0', exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/parent-attendance.png', fullPage: true });
});

test('parent dashboard excludes stale foreign child and receives class notice', async ({ page }) => {
  await login(page, 'parent0');
  const loaded = page.waitForResponse(r => r.url().endsWith('/v1/api/dashboard'));
  await page.reload();
  const data = (await (await loaded).json()).data;
  expect(data.stats.find(s => s.key === 'children').value).toBe(1);
  expect(data.grades.every(g => g.studentId.name === 'student 0')).toBe(true);
  await expect(page.locator('.ant-statistic').filter({ hasText: 'Con em' }).locator('.ant-statistic-content-value')).toHaveText('1');
  await openPage(page, '/announcements');
  await expect(page.getByRole('cell', { name: 'QA Parent Notice 0', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'QA Parent Notice 1', exact: true })).toHaveCount(0);
});

test('teacher cannot see another author private material', async ({ page }) => {
  await login(page, 'teacher0');
  await openPage(page, '/materials');
  await expect(page.getByRole('cell', { name: 'QA Material 0', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'QA Private Material 0', exact: true })).toHaveCount(0);
});

test('student submits exam through UI without seeing unpublished score', async ({ page }) => {
  await login(page, 'student0');
  await openPage(page, '/exams');
  await expect(page.getByRole('cell', { name: 'QA Exam 1', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Làm bài', exact: true }).click();
  await page.getByRole('radio', { name: 'A. 2', exact: true }).check();
  const submitted = page.waitForResponse(r => r.url().includes('/submit') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Nộp bài', exact: true }).click();
  expect((await submitted).status()).toBe(200);
  await expect(page.getByRole('cell', { name: 'Chưa công bố', exact: true })).toBeVisible();
});

test('librarian can choose scoped student, and cannot approve own request', async ({ page }) => {
  await login(page, 'librarian0');
  await openPage(page, '/library', '/library/books');
  await page.getByRole('tab', { name: 'Mượn / Trả' }).click();
  await page.getByRole('button', { name: 'Cho mượn', exact: true }).click();
  await page.getByLabel('Học sinh', { exact: true }).click();
  await expect(page.getByTitle('student 0', { exact: true })).toBeVisible();
  await expect(page.getByTitle('student 1', { exact: true })).toHaveCount(0);
  await openPage(page, '/facilities');
  const own = page.getByRole('row').filter({ hasText: 'QA Room librarian 0' });
  await expect(own.getByRole('button', { name: 'Duyệt', exact: true })).toHaveCount(0);
  const other = page.getByRole('row').filter({ hasText: 'QA Room teacher 0' });
  const approved = page.waitForResponse(r => r.url().includes('/review') && r.request().method() === 'PATCH');
  await other.getByRole('button', { name: 'Duyệt', exact: true }).click();
  expect((await approved).status()).toBe(200);
  await expect(other.getByText('APPROVED', { exact: true })).toBeVisible();
});

test('teacher updates a grade for an assigned class using the UI', async ({ page }) => {
  await login(page, 'teacher0');
  await openPage(page, '/grades');
  await page.getByRole('button', { name: 'Nhập / cập nhật điểm', exact: true }).click();
  for (const [label, option] of [['Năm học', '2026-2027'], ['Lớp', 'QA Class 0'], ['Học sinh', 'student 0'], ['Môn', 'QA Math']]) {
    await page.getByLabel(label, { exact: true }).click();
    await page.getByTitle(option, { exact: true }).click();
  }
  await page.getByLabel('Cuối kỳ', { exact: true }).fill('9');
  const saved = page.waitForResponse(r => r.url().endsWith('/v1/api/grades') && r.request().method() === 'POST');
  await page.getByRole('dialog').getByRole('button', { name: 'Đồng ý', exact: true }).click();
  expect((await saved).status()).toBe(200);
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('row').filter({ hasText: 'student 0' }).getByRole('cell', { name: '9', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/teacher-grade-saved.png', fullPage: true });
});

test('school admin sees edit only for owned roles after reloading account data', async ({ page }) => {
  await login(page, 'admin0');
  await openPage(page, '/roles');
  const owned = page.getByRole('row').filter({ hasText: 'QA_LOCAL_0' });
  await expect(owned.getByRole('button', { name: 'Sửa', exact: true })).toBeVisible();
  const shared = page.getByRole('row').filter({ hasText: 'QA_READER' });
  await expect(shared.getByRole('button', { name: 'Sửa', exact: true })).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: 'QA_LOCAL_1' })).toHaveCount(0);
  await openPage(page, '/announcements');
  await expect(page.getByRole('row').filter({ hasText: 'QA Notice 0' }).getByRole('button', { name: 'Xóa', exact: true })).toBeVisible();
});
