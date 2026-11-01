import { test, expect } from '@playwright/test';

const login = async (page, email) => {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Phase0@Test123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/users');
  await page.getByRole('tab', { name: 'Chuyển trường', exact: true }).click();
};
test('source releases a student and destination accepts into its class through the UI', async ({ browser }) => {
  test.setTimeout(60000);
  const sourceContext = await browser.newContext();
  const destinationContext = await browser.newContext();
  const source = await sourceContext.newPage();
  const destination = await destinationContext.newPage();
  try {
    await login(source, 'admin0@test.invalid');
    await source.getByRole('button', { name: 'Tạo yêu cầu chuyển trường', exact: true }).click();
    let dialog = source.getByRole('dialog');
    await dialog.getByLabel('Học sinh', { exact: true }).click();
    await source.getByText('peer 0 (QA-PEER0)', { exact: true }).click();
    await dialog.getByLabel('Trường đến', { exact: true }).click();
    await source.getByText('QA School 1 (QA1)', { exact: true }).click();
    await dialog.getByLabel('Ngày dự kiến chuyển', { exact: true }).fill('01/11/2026');
    await dialog.getByLabel('Ngày dự kiến chuyển', { exact: true }).press('Enter');
    await dialog.getByLabel('Lý do', { exact: true }).fill('Gia đình chuyển nơi ở');
    await dialog.getByRole('button', { name: 'Tạo yêu cầu', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    const row = source.getByRole('row').filter({ hasText: 'peer 0' });
    await expect(row).toContainText('Chờ trường đi duyệt');
    await row.getByRole('button', { name: 'Duyệt chuyển đi', exact: true }).click();
    dialog = source.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(row).toContainText('Chờ tiếp nhận');
    await login(destination, 'admin1@test.invalid');
    const incoming = destination.getByRole('row').filter({ hasText: 'peer 0' });
    await expect(incoming.getByRole('button', { name: 'Duyệt chuyển đi', exact: true })).toHaveCount(0);
    await incoming.getByRole('button', { name: 'Chi tiết', exact: true }).click();
    await expect(destination.getByRole('dialog')).toContainText('Điểm bàn giao');
    await expect(destination.getByRole('dialog')).toContainText('QA Math');
    await destination.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    await incoming.getByRole('button', { name: 'Tiếp nhận', exact: true }).click();
    dialog = destination.getByRole('dialog');
    await dialog.getByLabel('Lớp tiếp nhận cùng khối', { exact: true }).click();
    await destination.getByText('QA Class 1', { exact: true }).click();
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(incoming).toContainText('Đã tiếp nhận');
    await destination.reload();
    await destination.getByRole('tab', { name: 'Người dùng', exact: true }).click();
    await destination.getByRole('listitem', { name: '2', exact: true }).click();
    await expect(destination.getByRole('row').filter({ hasText: 'peer0@test.invalid' })).toContainText('QA School 1');
    const token = await source.evaluate(() => localStorage.getItem('access_token'));
    const remaining = await (await source.request.get('/v1/api/users?role=STUDENT', { headers: { authorization: `Bearer ${token}` } })).json();
    expect(remaining.EC).toBe(0);
    expect(remaining.data.some(student => student.email === 'peer0@test.invalid')).toBe(false);
  } finally {
    await Promise.allSettled([sourceContext.close(), destinationContext.close()]);
  }
});
