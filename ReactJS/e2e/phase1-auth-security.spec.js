import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../ExpressJS/package.json', import.meta.url));
const { TOTP } = require('otpauth');
const originalPassword = 'Phase0@Test123';

async function passwordLogin(page, account, password = originalPassword) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(`${account}@test.invalid`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
}

test('enroll MFA, reject invalid code, recover login, disable MFA and change password through UI', async ({ page }) => {
  await passwordLogin(page, 'security0');
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/profile');
  await page.getByLabel('Mật khẩu hiện tại', { exact: true }).fill(originalPassword);
  await page.getByRole('button', { name: 'Thiết lập 2FA', exact: true }).click();
  const secret = await page.getByTestId('totp-secret').innerText();
  await page.getByLabel('Mã xác nhận thiết lập', { exact: true }).fill(new TOTP({ secret }).generate());
  await page.getByRole('button', { name: 'Bật 2FA', exact: true }).click();
  const recovery = (await page.getByTestId('recovery-codes').innerText()).trim().split('\n');
  expect(recovery).toHaveLength(10);
  await page.getByRole('button', { name: 'Đã lưu, đăng nhập lại', exact: true }).click();
  await passwordLogin(page, 'security0');
  await expect(page.getByText('Xác thực hai bước', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeNull();
  await page.getByLabel('Mã xác thực', { exact: true }).fill('invalid');
  await page.getByRole('button', { name: 'Xác minh', exact: true }).click();
  await expect(page.getByText('Mã xác thực sai, hết hạn hoặc đã sử dụng.', { exact: true })).toBeVisible();
  await page.getByLabel('Mã xác thực', { exact: true }).fill(recovery[0]);
  await page.getByRole('button', { name: 'Xác minh', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/profile');
  await expect(page.getByText(/Đã bật — còn 9 mã khôi phục/)).toBeVisible();
  await page.getByLabel('Mật khẩu hiện tại', { exact: true }).fill(originalPassword);
  await page.getByLabel('Mã 2FA hoặc mã khôi phục', { exact: true }).fill(recovery[1]);
  await page.getByRole('button', { name: 'Tắt 2FA', exact: true }).click();
  await page.getByRole('button', { name: 'Đã lưu, đăng nhập lại', exact: true }).click();
  await passwordLogin(page, 'security0');
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/profile');
  await page.getByLabel('Mật khẩu hiện tại', { exact: true }).fill(originalPassword);
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('My very private new phrase!');
  await page.getByRole('button', { name: 'Đổi mật khẩu', exact: true }).click();
  await page.getByRole('button', { name: 'Đã lưu, đăng nhập lại', exact: true }).click();
  await passwordLogin(page, 'security0', 'My very private new phrase!');
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('admin temporary password forces profile on login and reload until the user changes it', async ({ page }) => {
  await passwordLogin(page, 'admin1');
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/users');
  const row = page.getByRole('row').filter({ hasText: 'security1@test.invalid' });
  await row.getByRole('button', { name: 'Reset MK', exact: true }).click();
  await page.getByRole('button', { name: 'Đồng ý', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('textbox')).toBeVisible();
  const temporary = await dialog.getByRole('textbox').inputValue();
  expect(temporary.length).toBeGreaterThanOrEqual(15);
  await page.evaluate(() => localStorage.removeItem('access_token'));
  await passwordLogin(page, 'security1', temporary);
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText('Bạn phải đổi mật khẩu tạm trước khi tiếp tục sử dụng hệ thống.', { exact: true })).toBeVisible();
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/profile$/);
  await page.getByLabel('Mật khẩu hiện tại', { exact: true }).fill(temporary);
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('Only I know this long phrase!');
  await page.getByRole('button', { name: 'Đổi mật khẩu', exact: true }).click();
  await page.getByRole('button', { name: 'Đã lưu, đăng nhập lại', exact: true }).click();
  await passwordLogin(page, 'security1', 'Only I know this long phrase!');
  await expect(page).toHaveURL(/\/dashboard$/);
});
