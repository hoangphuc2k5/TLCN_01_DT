import { test, expect } from '@playwright/test';

async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(`${account}@test.invalid`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Phase0@Test123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('student submits a homework file and sees retake requests on the assignments page', async ({ page }) => {
  await login(page, 'student0');
  const loaded = page.waitForResponse(r => r.url().includes('/v1/api/homeworks') && r.request().method() === 'GET');
  await page.goto('/assignments');
  expect((await loaded).status()).toBe(200);
  const row = page.getByRole('row').filter({ hasText: 'QA Homework 0' });
  await expect(row).toBeVisible();
  await row.locator('button').first().click();
  await page.getByLabel('Nộp file', { exact: true }).check();
  await page.getByRole('dialog').locator('textarea').fill('Bài làm được nộp bằng file.');
  await page.getByLabel('File bài làm', { exact: true }).setInputFiles({ name: 'bai-lam.txt', mimeType: 'text/plain', buffer: Buffer.from('Noi dung bai lam') });
  const submitted = page.waitForResponse(r => r.url().includes('/v1/api/homeworks/') && r.url().includes('/submissions') && r.request().method() === 'POST');
  const attached = page.waitForResponse(r => r.url().includes('/submission-attachments') && r.request().method() === 'POST');
  await page.getByRole('dialog').locator('button').last().click();
  expect((await submitted).status()).toBe(201);
  expect((await attached).status()).toBe(201);
  await expect(row.getByRole('button', { name: 'bai-lam.txt', exact: true })).toBeVisible();
  await expect(page.getByText('Yêu cầu thi lại / học lại', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tạo yêu cầu', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Môn', { exact: true }).click();
  await page.locator('.ant-select-item-option:visible').filter({ hasText: 'QA Math' }).click();
  await dialog.getByLabel('Năm học', { exact: true }).click();
  await page.locator('.ant-select-item-option:visible').filter({ hasText: '2026-2027' }).click();
  await dialog.getByLabel('Lý do', { exact: true }).fill('Xin thi lại để cải thiện kết quả.');
  const requested = page.waitForResponse(r => r.url().endsWith('/v1/api/retake-requests') && r.request().method() === 'POST');
  await dialog.locator('button').last().click();
  expect((await requested).status()).toBe(201);
  await expect(page.getByRole('row').filter({ hasText: 'Xin thi lại để cải thiện kết quả.' })).toBeVisible();
});

test('student sees the teacher score and feedback after grading', async ({ browser }) => {
  const baseURL = 'http://127.0.0.1:5175';
  const studentContext = await browser.newContext({ baseURL });
  const teacherContext = await browser.newContext({ baseURL });
  const studentPage = await studentContext.newPage();
  const teacherPage = await teacherContext.newPage();
  const feedback = 'Bài làm tốt, trình bày rõ ràng.';

  try {
    await login(studentPage, 'student1');
    await studentPage.goto('/assignments');
    const studentRow = studentPage.getByRole('row').filter({ hasText: 'QA Homework 1' });
    await expect(studentRow).toBeVisible();
    await studentRow.getByRole('button', { name: 'Nộp bài', exact: true }).click();
    const submissionDialog = studentPage.getByRole('dialog');
    await submissionDialog.getByLabel('Nội dung bài làm', { exact: true }).fill('Lời giải của học sinh.');
    const submitted = studentPage.waitForResponse(r => r.url().includes('/v1/api/homeworks/') && r.url().includes('/submissions') && r.request().method() === 'POST');
    await submissionDialog.getByRole('button', { name: 'Đồng ý', exact: true }).click();
    expect((await submitted).status()).toBe(201);

    await login(teacherPage, 'teacher1');
    await teacherPage.goto('/assignments');
    const teacherRow = teacherPage.getByRole('row').filter({ hasText: 'QA Homework 1' });
    await expect(teacherRow).toBeVisible();
    await teacherRow.getByRole('button', { name: 'Bài nộp', exact: true }).click();
    const submissionRow = teacherPage.getByRole('row').filter({ hasText: 'student 1' });
    await expect(submissionRow).toBeVisible();
    await submissionRow.getByRole('button', { name: 'Chấm bài', exact: true }).click();
    await teacherPage.getByLabel('Điểm', { exact: true }).fill('8');
    await teacherPage.getByLabel('Nhận xét', { exact: true }).fill(feedback);
    const graded = teacherPage.waitForResponse(r => r.url().includes('/v1/api/assignment-submissions/') && r.url().endsWith('/grade') && r.request().method() === 'PATCH');
    await teacherPage.getByRole('button', { name: 'Lưu', exact: true }).click();
    const gradedResponse = await graded;
    expect(gradedResponse.status()).toBe(200);
    expect(gradedResponse.request().postDataJSON()).toMatchObject({ score: 8, feedback });

    const homeworkReload = studentPage.waitForResponse(r => r.url().includes('/v1/api/homeworks') && r.request().method() === 'GET');
    await studentPage.reload();
    const homeworkRows = (await homeworkReload).json().then(response => response.data);
    const homework = (await homeworkRows).find(row => row.title === 'QA Homework 1');
    expect(homework?.submission).toMatchObject({ status: 'GRADED', score: 8, feedback });
    const refreshedStudentRow = studentPage.getByRole('row').filter({ hasText: 'QA Homework 1' });
    await expect(refreshedStudentRow.getByText('8/10', { exact: true })).toBeVisible();
    await expect(refreshedStudentRow).toContainText(feedback);
  } finally {
    await teacherContext.close();
    await studentContext.close();
  }
});

test('reader cannot access the homework page directly', async ({ page }) => {
  await login(page, 'reader0');
  await page.goto('/assignments');
  await expect(page).toHaveURL(/\/dashboard$/);
});
