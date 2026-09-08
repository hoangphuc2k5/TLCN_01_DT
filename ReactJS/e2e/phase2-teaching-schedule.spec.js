import { test, expect } from '@playwright/test';
async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(`${account}@test.invalid`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Phase0@Test123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function showSchedule(page) {
  await page.getByRole('link', { name: 'Thời khóa biểu', exact: true }).click();
  await page.getByLabel('Lịch từ ngày').fill('2026-09-07');
  await page.getByLabel('Lịch đến ngày').fill('2026-09-08');
  const response = page.waitForResponse(r => r.url().includes('/timetables/schedule?') && r.url().includes('2026-09-07'));
  await page.getByRole('button', { name: 'Xem lịch', exact: true }).click();
  expect((await response).status()).toBe(200);
}
test('teacher submits absence and structured makeup; admin approval updates parent timetable', async ({ browser }) => {
  const teacherContext = await browser.newContext();
  const adminContext = await browser.newContext();
  const parentContext = await browser.newContext();
  try {
    const teacher = await teacherContext.newPage(), admin = await adminContext.newPage(), parent = await parentContext.newPage();
    await login(teacher, 'teacher0');
    await teacher.getByRole('link', { name: 'Đơn từ', exact: true }).click();
    await teacher.getByRole('button', { name: 'Gửi đơn', exact: true }).click();
    let dialog = teacher.getByRole('dialog');
    await dialog.getByLabel('Lý do', { exact: true }).fill('QA teaching absence');
    await dialog.getByLabel('Từ ngày', { exact: true }).fill('2026-09-07');
    await dialog.getByLabel('Đến ngày', { exact: true }).fill('2026-09-07');
    const sent = teacher.waitForResponse(r => r.url().endsWith('/leave-requests') && r.request().method() === 'POST');
    await dialog.getByRole('button', { name: 'Đồng ý', exact: true }).click();
    expect((await sent).status()).toBe(201);
    await expect(dialog).toBeHidden();
    await login(admin, 'admin0');
    await admin.getByRole('link', { name: 'Đơn từ', exact: true }).click();
    let row = admin.getByRole('row').filter({ hasText: 'QA teaching absence' });
    await row.getByRole('button', { name: 'Duyệt', exact: true }).click();
    await expect(row.getByText('APPROVED', { exact: true })).toBeVisible();
    await teacher.getByRole('button', { name: 'Gửi đơn', exact: true }).click();
    dialog = teacher.getByRole('dialog');
    await dialog.getByLabel('Loại đơn', { exact: true }).press('ArrowDown');
    await teacher.getByText('Đề xuất dạy bù', { exact: true }).last().click();
    await dialog.getByLabel('Lý do', { exact: true }).fill('QA makeup lesson');
    await dialog.getByLabel('Ngày nghỉ cần dạy bù', { exact: true }).fill('2026-09-07');
    await dialog.getByLabel('Tiết nghỉ', { exact: true }).press('ArrowDown');
    await teacher.getByText('QA Class 0 · Tiết 1 · QA Math', { exact: true }).click();
    await dialog.getByLabel('Ngày dạy bù', { exact: true }).fill('2026-09-08');
    await dialog.getByLabel('Tiết dạy bù', { exact: true }).fill('4');
    await dialog.getByLabel('Phòng dạy bù', { exact: true }).fill('QA Makeup Room');
    const submitted = teacher.waitForResponse(r => r.url().endsWith('/leave-requests') && r.request().method() === 'POST');
    await dialog.getByRole('button', { name: 'Đồng ý', exact: true }).click();
    expect((await submitted).status()).toBe(201);
    await expect(dialog).toBeHidden();
    await admin.reload();
    row = admin.getByRole('row').filter({ hasText: 'QA makeup lesson' });
    await expect(row.getByText('QA Makeup Room', { exact: false })).toBeVisible();
    await row.getByRole('button', { name: 'Duyệt', exact: true }).click();
    await expect(row.getByText('APPROVED', { exact: true })).toBeVisible();
    await login(parent, 'parent0');
    await showSchedule(parent);
    await expect(parent.getByText('Nghỉ dạy', { exact: true })).toBeVisible();
    await expect(parent.getByText('Dạy bù', { exact: true })).toBeVisible();
    await expect(parent.getByText('QA Makeup Room', { exact: true })).toBeVisible();
    await expect(parent.getByText('QA teaching absence', { exact: true })).toHaveCount(0);
    await expect(parent.getByText('QA Class 1', { exact: true })).toHaveCount(0);
    await row.getByRole('button', { name: 'Hủy lịch bù', exact: true }).click();
    await admin.getByRole('dialog').getByLabel('Lý do hủy lịch', { exact: true }).fill('QA room unavailable');
    await admin.getByRole('dialog').getByRole('button', { name: 'Đồng ý', exact: true }).click();
    await expect(row.getByText('CANCELLED', { exact: true })).toBeVisible();
    await parent.getByRole('button', { name: 'Xem lịch', exact: true }).click();
    await expect(parent.getByText('Dạy bù', { exact: true })).toHaveCount(0);
    await expect(parent.getByText('Nghỉ dạy', { exact: true })).toBeVisible();
  } finally { await Promise.allSettled([teacherContext.close(), adminContext.close(), parentContext.close()]); }
});
test('student sees own dated timetable and rejects an excessive date range', async ({ page }) => {
  await login(page, 'student1');
  await showSchedule(page);
  const card = page.locator('.ant-card').filter({ hasText: 'Lịch theo ngày' });
  await expect(card.getByText('QA Class 1', { exact: true })).toBeVisible();
  await expect(card.getByText('QA Class 0', { exact: true })).toHaveCount(0);
  await page.getByLabel('Lịch đến ngày').fill('2027-01-01');
  const rejected = page.waitForResponse(r => r.url().includes('/timetables/schedule?') && r.url().includes('2027-01-01'));
  await page.getByRole('button', { name: 'Xem lịch', exact: true }).click();
  expect((await rejected).status()).toBe(400);
  await expect(page.getByText('Khoảng ngày phải từ 1 đến 31 ngày', { exact: true }).first()).toBeVisible();
});
