import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(`${account}@test.invalid`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Phase0@Test123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('student downloads a real DOCX transcript', async ({ page }) => {
  await login(page, 'student0'); await page.goto('/student-documents');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Word (.docx)', exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/-transcript\.docx$/);
  const bytes = await fs.readFile(await download.path());
  expect(bytes.subarray(0, 4)).toEqual(Buffer.from('504b0304', 'hex'));
});
