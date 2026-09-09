import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';

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
  await page.getByRole('button', { name: 'Thanh toán VNPay', exact: true }).first().click();
  const createdResponse = await response;
  expect(createdResponse.status()).toBe(201);
  const payment = (await createdResponse.json()).data;
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText(/VNPAY/)).toBeVisible();
  const link = page.getByRole('link', { name: 'Mở cổng thanh toán VNPay', exact: true });
  const checkout = new URL(await link.getAttribute('href'));
  expect(checkout.hostname).toBe('sandbox.vnpayment.vn');
  expect(checkout.searchParams.get('vnp_TmnCode')).toBe('TESTCODE');
  const payload = { vnp_Amount: String(payment.amount * 100), vnp_TmnCode: 'TESTCODE',
    vnp_TxnRef: payment.providerOrderId, vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: '123456789' };
  const encoded = Object.keys(payload).sort().map(k => `${k}=${encodeURIComponent(payload[k])}`).join('&');
  payload.vnp_SecureHash = crypto.createHmac('sha512', 'isolated-vnpay-fixture-secret').update(encoded).digest('hex');
  const query = new URLSearchParams(payload).toString();
  await page.goto(`/payments/vnpay-return?${query}`);
  await expect(page.getByText('Đang chờ xác nhận thanh toán', { exact: true })).toBeVisible();
  const ipn = await page.request.get(`/v1/api/online-payments/vnpay/ipn?${query}`);
  expect((await ipn.json()).RspCode).toBe('00');
  await page.getByRole('button', { name: 'Kiểm tra lại' }).click();
  await expect(page.getByText('Đã ghi nhận thanh toán', { exact: true })).toBeVisible();
});


test('unsigned VNPay return cannot display a successful payment', async ({ page }) => {
  await login(page, 'student0');
  const token = await page.evaluate(() => localStorage.getItem('access_token'));
  await page.goto('/payments/vnpay-return?vnp_ResponseCode=00&vnp_TxnRef=fake');
  await expect(page.getByRole('button', { name: 'Kiểm tra lại' })).toBeVisible();
  await expect(page.getByText('Chữ ký VNPay không hợp lệ', { exact: true })).toBeVisible();
  await expect(page.getByText('Đã ghi nhận thanh toán', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBe(token);
});
