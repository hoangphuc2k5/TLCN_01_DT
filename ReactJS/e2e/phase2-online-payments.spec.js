import { test, expect } from '@playwright/test';

async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(`${account}@test.invalid`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Phase0@Test123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('student can create an online tuition checkout', async ({ page }) => {
  await login(page, 'student0');
  await page.goto('/fees');
  await expect(page.getByText('QA Tuition student 0', { exact: true })).toBeVisible();
  const response = page.waitForResponse(r => r.url().includes('/v1/api/online-payments') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Thanh toan online', exact: true }).first().click();
  expect((await response).status()).toBe(201);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText(/MOCK_/)).toBeVisible();
});
