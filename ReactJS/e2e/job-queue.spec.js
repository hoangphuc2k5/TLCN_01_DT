import { test, expect } from '@playwright/test';

async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(`${account}@test.invalid`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Phase0@Test123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('link', { name: 'Tác vụ nền', exact: true }).click();
}
test('job reader sees only own school and cannot retry or cancel', async ({ page }) => {
  await login(page, 'reader0');
  await expect(page.getByText('QA Job 0', { exact: true })).toBeVisible();
  await expect(page.getByText('QA Job 1', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Thử lại', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Hủy', exact: true })).toHaveCount(0);
});
test('school operator retries and cancels a queued job through the UI', async ({ page }) => {
  await login(page, 'admin0');
  const row = page.getByRole('row').filter({ hasText: 'QA Job 0' });
  await row.getByRole('button', { name: 'Thử lại', exact: true }).click();
  const retry = page.waitForResponse(r => r.url().endsWith('/retry') && r.request().method() === 'POST');
  await page.getByRole('dialog').getByRole('button', { name: 'Đồng ý', exact: true }).click();
  expect((await retry).status()).toBe(200);
  await expect(row.getByText('Chờ chạy', { exact: true })).toBeVisible();
  await row.getByRole('button', { name: 'Hủy', exact: true }).click();
  const cancelled = page.waitForResponse(r => r.url().endsWith('/cancel') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Đồng ý', exact: true }).click();
  expect((await cancelled).status()).toBe(200);
  await expect(row.getByText('Đã hủy', { exact: true })).toBeVisible();
});
