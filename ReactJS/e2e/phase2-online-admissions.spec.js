import { test, expect } from '@playwright/test';

test('public applicant can submit and track an admission application', async ({ page }) => {
  await page.goto('/admissions/apply');
  await page.getByLabel('Ma truong/subdomain').fill('QA0');
  await page.getByLabel('Ho ten hoc sinh').fill('E2E Applicant');
  await page.getByLabel('Ngay sinh').fill('2012-05-10');
  await page.getByLabel('Ho ten phu huynh').fill('E2E Guardian');
  await page.getByLabel('So dien thoai').fill('0900000000');
  await page.getByLabel('Khoi dang ky').fill('7');
  const response = page.waitForResponse(r => r.url().includes('/v1/api/admissions/public') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Nop ho so', exact: true }).click();
  expect((await response).status()).toBe(201);
  await expect(page.getByText(/Ma tra cuu: ADM-/)).toBeVisible();
});
