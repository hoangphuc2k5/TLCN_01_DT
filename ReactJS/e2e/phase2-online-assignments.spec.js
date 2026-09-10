import { test, expect } from '@playwright/test';

async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(`${account}@test.invalid`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Phase0@Test123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('student views published homework and submits an answer', async ({ page }) => {
  await login(page, 'student0');
  const loaded = page.waitForResponse(r => r.url().includes('/v1/api/homeworks') && r.request().method() === 'GET');
  await page.goto('/assignments');
  expect((await loaded).status()).toBe(200);
  const row = page.getByRole('row').filter({ hasText: 'QA Homework 0' });
  await expect(row).toBeVisible();
  await row.locator('button').first().click();
  await page.getByRole('dialog').locator('textarea').fill('Lời giải của học sinh.');
  await page.getByLabel('File đính kèm', { exact: true }).setInputFiles({ name: 'bai-lam.txt', mimeType: 'text/plain', buffer: Buffer.from('Noi dung bai lam') });
  const submitted = page.waitForResponse(r => r.url().includes('/v1/api/homeworks/') && r.url().includes('/submissions') && r.request().method() === 'POST');
  const attached = page.waitForResponse(r => r.url().includes('/submission-attachments') && r.request().method() === 'POST');
  await page.getByRole('dialog').locator('button').last().click();
  expect((await submitted).status()).toBe(201);
  expect((await attached).status()).toBe(201);
  await expect(row.getByRole('button', { name: 'bai-lam.txt', exact: true })).toBeVisible();
});

test('reader cannot access the homework page directly', async ({ page }) => {
  await login(page, 'reader0');
  await page.goto('/assignments');
  await expect(page).toHaveURL(/\/dashboard$/);
});
