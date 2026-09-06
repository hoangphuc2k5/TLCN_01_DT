import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(`${account}@test.invalid`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Phase0@Test123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/materials');
}
test('teacher uploads a private file, downloads exact bytes and deletes it', async ({ page }) => {
  const bytes = Buffer.from('%PDF-1.4\nPhase1 browser fixture\n%%EOF');
  await login(page, 'teacher0');
  await page.getByRole('button', { name: 'Thêm học liệu', exact: true }).click();
  await page.getByLabel('Tiêu đề', { exact: true }).fill('Phase1 private lesson');
  await page.getByRole('radio', { name: 'Tải file lên', exact: true }).check();
  await page.getByLabel('Chọn file', { exact: true }).setInputFiles({ name: 'lesson.pdf', mimeType: 'application/pdf', buffer: bytes });
  await page.getByRole('switch', { name: 'Chia sẻ học liệu', exact: true }).click();
  const uploaded = page.waitForResponse(r => r.url().endsWith('/materials/upload') && r.request().method() === 'POST');
  await page.getByRole('dialog').getByRole('button', { name: 'Đồng ý', exact: true }).click();
  expect((await uploaded).status()).toBe(201);
  const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'Phase1 private lesson', exact: true }) });
  await expect(row).toBeVisible();
  const saved = page.waitForEvent('download');
  await row.getByRole('button', { name: 'Tải file', exact: true }).click();
  const download = await saved;
  expect(download.suggestedFilename()).toBe('lesson.pdf');
  expect(await readFile(await download.path())).toEqual(bytes);
  await row.getByRole('button', { name: 'Xóa', exact: true }).click();
  const removed = page.waitForResponse(r => r.url().includes('/materials/') && r.request().method() === 'DELETE');
  await page.getByRole('button', { name: 'Đồng ý', exact: true }).click();
  expect((await removed).status()).toBe(200);
  await expect(row).toHaveCount(0);
});
