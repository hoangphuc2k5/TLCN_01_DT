import { test, expect } from '@playwright/test';

async function login(page) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('teacher0@test.invalid');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Phase0@Test123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('layout resets route scroll and works at laptop and phone widths', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  try {
    await login(page);
    const content = page.locator('.app-content');
    await expect(content).toBeVisible();
    await content.evaluate(element => {
      const spacer = document.createElement('div');
      spacer.dataset.testid = 'scroll-fixture';
      spacer.style.height = '1200px';
      element.append(spacer);
    });
    await expect.poll(() => content.evaluate(element => element.scrollHeight - element.clientHeight)).toBeGreaterThan(0);
    await content.evaluate(element => element.scrollTo(0, element.scrollHeight));
    await expect.poll(() => content.evaluate(element => element.scrollTop)).toBeGreaterThan(0);

    await page.getByRole('link', { name: 'Điểm danh' }).click();
    await expect(page).toHaveURL(/\/attendance$/);
    await expect.poll(() => content.evaluate(element => element.scrollTop)).toBe(0);
    await expect(page.getByRole('button', { name: 'Lưu điểm danh', exact: true })).toBeDisabled();

    await page.setViewportSize({ width: 390, height: 844 });
    const menuButton = page.getByRole('button', { name: 'Mở menu điều hướng' });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    await expect(page.locator('.app-mobile-drawer')).toBeVisible();
    await page.getByRole('link', { name: 'Thông báo' }).click();
    await expect(page).toHaveURL(/\/announcements$/);
    await expect(page.locator('.ant-drawer-content-wrapper')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  } finally {
    await context.close();
  }
});

test('attendance save stays unavailable until class, subject, and students are ready', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  try {
    await login(page);
    await page.goto('/attendance');
    const saveButton = page.getByRole('button', { name: 'Lưu điểm danh', exact: true });
    await expect(saveButton).toBeDisabled();

    await page.getByRole('combobox').nth(0).click();
    await page.locator('.ant-select-item-option:visible').filter({ hasText: 'QA Class 0' }).click();
    await expect(page.getByText('Danh sách điểm danh (2 học sinh)', { exact: true })).toBeVisible();
    await expect(saveButton).toBeDisabled();

    await page.getByRole('combobox').nth(1).click();
    await page.locator('.ant-select-item-option:visible').filter({ hasText: 'QA Math' }).click();
    await expect(saveButton).toBeEnabled();
  } finally {
    await context.close();
  }
});
