import { test, expect } from '@playwright/test';

async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(`${account}@test.invalid`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Phase0@Test123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('parent reads the published periodic contact book and replies', async ({ page }) => {
  await login(page, 'parent0');
  const loaded = page.waitForResponse(r => r.url().includes('/v1/api/contact-books') && r.request().method() === 'GET');
  await page.goto('/contact-book');
  expect((await loaded).status()).toBe(200);
  await expect(page.getByText('Fixture progress', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Phan hoi|Phản hồi/ }).click();
  await page.getByRole('dialog').locator('textarea').fill('Da doc so lien lac.');
  const saved = page.waitForResponse(r => r.url().includes('/v1/api/contact-books/') && r.url().endsWith('/reply') && r.request().method() === 'PATCH');
  await page.getByRole('dialog').locator('button').last().click();
  expect((await saved).status()).toBe(200);
});
