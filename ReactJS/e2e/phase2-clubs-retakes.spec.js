import { test, expect } from '@playwright/test';

async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(`${account}@test.invalid`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Phase0@Test123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('student registers an open club', async ({ page }) => {
  await login(page, 'student0');
  await page.goto('/activities');
  await expect(page.getByText('QA Science Club 0', { exact: true })).toBeVisible();
  const saved = page.waitForResponse(r => r.url().includes('/v1/api/clubs/') && r.url().endsWith('/register') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Dang ky', exact: true }).click();
  expect((await saved).status()).toBe(201);
});
