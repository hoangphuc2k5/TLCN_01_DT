import { test, expect } from '@playwright/test';

async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(`${account}@test.invalid`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Phase0@Test123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('parent sees the class meeting and records RSVP', async ({ page }) => {
  await login(page, 'parent0');
  const loaded = page.waitForResponse(r => r.url().includes('/v1/api/parent-meetings') && r.request().method() === 'GET');
  await page.goto('/class-life');
  expect((await loaded).status()).toBe(200);
  await expect(page.getByText('QA Parent Meeting 0', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Respond', exact: true }).click();
  const saved = page.waitForResponse(r => r.url().includes('/v1/api/parent-meetings/') && r.url().endsWith('/rsvp') && r.request().method() === 'PATCH');
  await page.getByRole('dialog').locator('button').last().click();
  expect((await saved).status()).toBe(200);
});
