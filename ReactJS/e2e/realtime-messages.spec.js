import { test, expect } from '@playwright/test';

async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(`${account}@test.invalid`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Phase0@Test123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('recipient inbox updates through the authenticated realtime channel', async ({ browser }) => {
  const teacherContext = await browser.newContext(); const studentContext = await browser.newContext();
  try {
    const teacher = await teacherContext.newPage(); const student = await studentContext.newPage();
    await login(student, 'student0'); await student.goto('/messages');
    await expect(student.getByText('Realtime đã kết nối', { exact: true })).toBeVisible();
    await login(teacher, 'teacher0'); await teacher.goto('/messages');
    await expect(teacher.getByText('Realtime đã kết nối', { exact: true })).toBeVisible();

    await teacher.getByRole('button', { name: 'Soạn tin nhắn', exact: true }).click();
    const dialog = teacher.getByRole('dialog');
    await dialog.getByLabel('Người nhận', { exact: true }).click();
    await teacher.getByText('student 0 (student0@test.invalid)', { exact: true }).last().click();
    await dialog.getByLabel('Tiêu đề', { exact: true }).fill('Tin realtime Phase 3');
    await dialog.getByLabel('Nội dung', { exact: true }).fill('Nội dung phải xuất hiện mà không tải lại trang.');
    const sent = teacher.waitForResponse(response => response.url().endsWith('/v1/api/messages') && response.request().method() === 'POST');
    const refreshed = student.waitForResponse(response => response.url().includes('/v1/api/messages?box=inbox'));
    await dialog.locator('.ant-modal-footer button').last().click();
    expect((await sent).status()).toBe(201); expect((await refreshed).status()).toBe(200);
    const row = student.getByRole('row').filter({ hasText: 'Tin realtime Phase 3' });
    await expect(row).toBeVisible(); await expect(row.getByText('Mới', { exact: true })).toBeVisible();
  } finally { await Promise.allSettled([teacherContext.close(), studentContext.close()]); }
});
