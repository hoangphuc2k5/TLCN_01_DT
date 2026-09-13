import { test, expect } from '@playwright/test';

async function login(page) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('admin0@test.invalid');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Phase0@Test123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('accountant creates and reviews a fee invoice split into line items', async ({ page }) => {
  await login(page);
  await page.goto('/fees');
  await page.getByRole('button', { name: 'Tạo hóa đơn', exact: true }).click();

  const modal = page.getByRole('dialog', { name: 'Tạo hóa đơn' });
  await modal.getByLabel('Học sinh').click();
  await page.locator('.ant-select-dropdown:visible').getByText('student 0', { exact: true }).click();
  await modal.getByLabel('Năm học').click();
  await page.locator('.ant-select-dropdown:visible').getByText('2026-2027', { exact: true }).click();
  await modal.getByLabel('Nội dung').fill('Học phí tháng 9 nhiều khoản');
  await modal.getByLabel('Tên khoản').fill('Học phí tháng 9');
  await modal.getByLabel('Đơn giá').fill('200000');
  await modal.getByRole('button', { name: 'Thêm khoản thu' }).click();

  const names = modal.getByLabel('Tên khoản');
  const prices = modal.getByLabel('Đơn giá');
  await names.nth(1).fill('Phí bán trú tháng 9');
  await prices.nth(1).fill('50000');
  await modal.getByLabel('Hạn thanh toán').fill('2026-09-30');

  const created = page.waitForResponse(response => response.url().endsWith('/v1/api/fees')
    && response.request().method() === 'POST');
  await modal.getByRole('button', { name: 'Đồng ý', exact: true }).click();
  expect((await created).status()).toBe(201);

  const invoiceRow = page.getByRole('row').filter({ hasText: 'Học phí tháng 9 nhiều khoản' });
  await expect(invoiceRow).toContainText('250.000');
  await invoiceRow.getByRole('button', { name: 'Mở rộng dòng' }).click();
  await expect(page.getByText('Học phí tháng 9', { exact: true })).toBeVisible();
  await expect(page.getByText('Phí bán trú tháng 9', { exact: true })).toBeVisible();
});
