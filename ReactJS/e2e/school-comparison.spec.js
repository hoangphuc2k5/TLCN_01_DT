import { test, expect } from '@playwright/test';

test('comparison filters reach the API and rejected export shows an error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('admin0@test.invalid');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Phase0@Test123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  // Controlled UI responses; backend scope and aggregation are exercised against local MongoDB separately.
  await page.route('**/v1/api/schools', route => route.fulfill({ json: { EC: 0, data: [{ _id: 'a', name: 'Alpha', code: 'A' }, { _id: 'b', name: 'Beta', code: 'B' }] } }));
  let params;
  await page.route('**/v1/api/reports/schools/compare?*', route => {
    params = new URL(route.request().url()).searchParams;
    return route.fulfill({ json: { EC: 0, data: [{ school: { _id: 'a', name: 'Alpha', code: 'A' }, gradeAverage: 0, attendanceRate: 50, outstandingAmount: 0 }] } });
  });
  await page.route('**/v1/api/reports/schools/compare/export.xlsx?*', route => route.fulfill({ status: 403, json: { EC: 1, EM: 'Ngoài phạm vi báo cáo' } }));
  await page.goto('/school-comparison');
  await page.locator('.ant-select').first().click();
  await page.getByText('Alpha (A)', { exact: true }).click();
  await page.getByText('Beta (B)', { exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('textbox', { name: 'Năm học', exact: true }).fill('2026-2027');
  await page.getByRole('button', { name: 'Đối chiếu', exact: true }).click();
  await expect(page.getByRole('cell', { name: '0.00', exact: true })).toBeVisible();
  expect(params.get('academicYear')).toBe('2026-2027');
  expect(params.get('schoolIds')).toBe('a,b');
  await page.getByRole('button', { name: 'Xuất Excel', exact: true }).click();
  await expect(page.getByText('Ngoài phạm vi báo cáo', { exact: true })).toBeVisible();
});
