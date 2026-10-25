import { test, expect } from '@playwright/test';

async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(`${account}@test.invalid`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Phase0@Test123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('teacher records attendance and parent sees only their child status', async ({ browser }) => {
  const baseURL = 'http://127.0.0.1:5175';
  const teacherContext = await browser.newContext({ baseURL, timezoneId: 'UTC' });
  const parentContext = await browser.newContext({ baseURL, timezoneId: 'UTC' });
  const teacherPage = await teacherContext.newPage();
  const parentPage = await parentContext.newPage();
  let restoreAttendance;

  try {
    await login(teacherPage, 'teacher0');
    const history = teacherPage.waitForResponse(r => r.url().endsWith('/v1/api/attendance') && r.request().method() === 'GET');
    await teacherPage.goto('/attendance');
    expect((await history).status()).toBe(200);

    await teacherPage.getByRole('combobox').nth(0).click();
    const classOption = teacherPage.locator('.ant-select-item-option:visible').filter({ hasText: 'QA Class 0' });
    await expect(classOption).toBeVisible();
    await classOption.click();
    await expect(teacherPage.getByText('Danh sách điểm danh (2 học sinh)', { exact: true })).toBeVisible();

    await teacherPage.getByRole('combobox').nth(1).click();
    const subjectOption = teacherPage.locator('.ant-select-item-option:visible').filter({ hasText: 'QA Math' });
    await expect(subjectOption).toBeVisible();
    await subjectOption.click();
    await teacherPage.getByPlaceholder('Chọn thời điểm').fill('01/09/2026');
    await teacherPage.getByPlaceholder('Chọn thời điểm').press('Enter');
    await teacherPage.getByPlaceholder('Tiết').fill('1');
    const studentRow = teacherPage.getByRole('row').filter({ hasText: 'student 0' });
    await studentRow.getByText('Có mặt', { exact: true }).click();
    await teacherPage.getByText('Vắng không phép', { exact: true }).click();

    const saveRequest = teacherPage.waitForRequest(r => r.url().endsWith('/v1/api/attendance') && r.method() === 'POST');
    const saved = teacherPage.waitForResponse(r => r.url().endsWith('/v1/api/attendance') && r.request().method() === 'POST');
    const saveButton = teacherPage.getByRole('button', { name: 'Lưu điểm danh', exact: true });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    const saveResponse = await saved;
    const savePayload = (await saveRequest).postDataJSON();
    restoreAttendance = { classId: savePayload.classId, studentIds: savePayload.records.map(record => record.studentId) };
    expect(saveResponse.status()).toBe(200);
    expect(savePayload.date).toBe('2026-09-01T00:00:00.000Z');

    await login(parentPage, 'parent0');
    const parentHistory = parentPage.waitForResponse(r => r.url().endsWith('/v1/api/attendance') && r.request().method() === 'GET');
    await parentPage.goto('/attendance');
    expect((await parentHistory).status()).toBe(200);

    const classRows = parentPage.getByRole('row').filter({ hasText: 'QA Class 0' });
    let recordedRow;
    for (let index = 0; index < await classRows.count(); index += 1) {
      const candidate = classRows.nth(index);
      if (await candidate.getByRole('cell').nth(2).innerText() === '1') {
        recordedRow = candidate;
        break;
      }
    }
    expect(recordedRow).toBeTruthy();
    await expect(recordedRow.getByRole('cell').nth(6)).toHaveText('1');
    await recordedRow.getByRole('button', { name: 'Mở rộng dòng', exact: true }).click();
    const childRow = parentPage.getByRole('row', { name: 'student 0 Không phép —', exact: true });
    await expect(childRow).toContainText('Không phép');
    await expect(parentPage.getByRole('row').filter({ hasText: 'peer 0' })).toHaveCount(0);
  } finally {
    if (restoreAttendance) {
      await teacherPage.evaluate(async ({ classId, studentIds }) => {
        const response = await fetch('/v1/api/attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify({
            classId,
            date: '2026-09-01T00:00:00.000Z',
            period: 1,
            records: studentIds.map(studentId => ({ studentId, status: 'PRESENT' })),
          }),
        });
        if (!response.ok) throw new Error(`Fixture cleanup failed: ${response.status}`);
      }, restoreAttendance).catch(() => {});
    }
    await parentContext.close().catch(() => {});
    await teacherContext.close().catch(() => {});
  }
});
