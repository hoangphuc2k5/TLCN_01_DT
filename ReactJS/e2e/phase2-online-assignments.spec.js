import { test, expect } from '@playwright/test';

async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(`${account}@test.invalid`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Phase0@Test123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('student submits a homework file and sees retake requests on the assignments page', async ({ page }) => {
  await login(page, 'student0');
  const loaded = page.waitForResponse(r => r.url().includes('/v1/api/homeworks') && r.request().method() === 'GET');
  await page.goto('/assignments');
  expect((await loaded).status()).toBe(200);
  const row = page.getByRole('row').filter({ hasText: 'QA Homework 0' });
  await expect(row).toBeVisible();
  await row.locator('button').first().click();
  await page.getByLabel('Nộp file', { exact: true }).check();
  await page.getByRole('dialog').locator('textarea').fill('Bài làm được nộp bằng file.');
  await page.getByLabel('File bài làm', { exact: true }).setInputFiles({ name: 'bai-lam.txt', mimeType: 'text/plain', buffer: Buffer.from('Noi dung bai lam') });
  const submitted = page.waitForResponse(r => r.url().includes('/v1/api/homeworks/') && r.url().includes('/submissions') && r.request().method() === 'POST');
  const attached = page.waitForResponse(r => r.url().includes('/submission-attachments') && r.request().method() === 'POST');
  await page.getByRole('dialog').locator('button').last().click();
  expect((await submitted).status()).toBe(201);
  expect((await attached).status()).toBe(201);
  await expect(row.getByRole('button', { name: 'bai-lam.txt', exact: true })).toBeVisible();
  await expect(page.getByText('Yêu cầu thi lại / học lại', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tạo yêu cầu', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Môn', { exact: true }).click();
  await page.locator('.ant-select-item-option:visible').filter({ hasText: 'QA Math' }).click();
  await dialog.getByLabel('Năm học', { exact: true }).click();
  await page.locator('.ant-select-item-option:visible').filter({ hasText: '2026-2027' }).click();
  await dialog.getByLabel('Lý do', { exact: true }).fill('Xin thi lại để cải thiện kết quả.');
  const requested = page.waitForResponse(r => r.url().endsWith('/v1/api/retake-requests') && r.request().method() === 'POST');
  await dialog.locator('button').last().click();
  expect((await requested).status()).toBe(201);
  await expect(page.getByRole('row').filter({ hasText: 'Xin thi lại để cải thiện kết quả.' })).toBeVisible();
});

test('reader cannot access the homework page directly', async ({ page }) => {
  await login(page, 'reader0');
  await page.goto('/assignments');
  await expect(page).toHaveURL(/\/dashboard$/);
});
