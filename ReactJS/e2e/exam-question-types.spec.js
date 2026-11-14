import { test, expect } from '@playwright/test';

async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(`${account}@test.invalid`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Phase0@Test123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function choose(page, label, option, index = 0) {
  await page.getByLabel(label, { exact: true }).nth(index)
    .locator('xpath=ancestor::div[contains(@class,"ant-select-selector")]')
    .click();
  await page.locator('.ant-select-item-option').filter({ hasText: option }).last().click();
}

test('teacher builds and publishes a THPT exam; student submits all three parts for ten points', async ({ browser }) => {
  test.setTimeout(90000);
  const teacherContext = await browser.newContext();
  const studentContext = await browser.newContext();
  const teacherPage = await teacherContext.newPage();
  const studentPage = await studentContext.newPage();
  const examTitle = `QA THPT mixed exam ${Date.now()}`;

  try {
    await login(teacherPage, 'teacher0');
    await teacherPage.goto('/exams');
    await teacherPage.getByRole('button', { name: 'Tạo đề thi', exact: true }).click();
    const dialog = teacherPage.getByRole('dialog');
    await dialog.getByLabel('Tiêu đề đề thi').fill(examTitle);
    await choose(teacherPage, 'Lớp học', 'QA Class 0');
    await choose(teacherPage, 'Môn học', 'QA Math');
    await dialog.locator('.ant-form-item').filter({ hasText: 'Cấu trúc đề' }).locator('.ant-select-selector').click();
    await teacherPage.locator('.ant-select-item-option').filter({ hasText: 'Mẫu cấu trúc THPT' }).click();

    await teacherPage.getByLabel('Nội dung câu hỏi / câu dẫn').fill('Chọn kết quả của phép tính 1 + 1.');
    await teacherPage.getByLabel('Điểm tối đa').fill('2.5');
    await teacherPage.getByLabel('Phương án A').fill('2');
    await teacherPage.getByLabel('Phương án B').fill('3');
    await teacherPage.getByRole('button', { name: /Thêm câu/ }).click();
    await expect(dialog.getByText('Chọn kết quả của phép tính 1 + 1.')).toBeVisible();

    await choose(teacherPage, 'Phần thi', 'Phần II - Trắc nghiệm Đúng/Sai');
    await teacherPage.getByLabel('Nội dung câu hỏi / câu dẫn').fill('Đánh giá các mệnh đề sau.');
    await teacherPage.getByLabel('Điểm tối đa').fill('3');
    for (const [index, statement] of ['Một cộng một bằng hai.', 'Một cộng một bằng ba.', 'Hai là số chẵn.', 'Ba là số chẵn.'].entries()) {
      await teacherPage.getByLabel(`Ý ${String.fromCharCode(97 + index)}`).fill(statement);
      await choose(teacherPage, 'Đáp án', index === 1 || index === 3 ? 'Sai' : 'Đúng', index);
    }
    await teacherPage.getByRole('button', { name: /Thêm câu/ }).click();
    await expect(dialog.getByText('Đánh giá các mệnh đề sau.')).toBeVisible();

    await choose(teacherPage, 'Phần thi', 'Phần III - Trả lời ngắn');
    await teacherPage.getByLabel('Nội dung câu hỏi / câu dẫn').fill('Thủ đô của Việt Nam là gì?');
    await teacherPage.getByLabel('Điểm tối đa').fill('4.5');
    await teacherPage.getByLabel('Đáp án được chấp nhận (mỗi đáp án một dòng)').fill('Hà Nội');
    await teacherPage.getByRole('button', { name: /Thêm câu/ }).click();
    await expect(dialog.getByText('Tổng điểm: 10đ / 10')).toBeVisible();

    const created = teacherPage.waitForResponse(response => response.url().endsWith('/v1/api/exams') && response.request().method() === 'POST');
    await dialog.getByRole('button', { name: 'Tạo đề thi', exact: true }).click();
    expect((await created).status()).toBe(201);
    const examRow = teacherPage.getByRole('row').filter({ hasText: examTitle });
    await expect(examRow).toBeVisible();
    const published = teacherPage.waitForResponse(response => response.url().includes('/v1/api/exams/') && response.request().method() === 'PUT');
    await examRow.getByRole('button', { name: 'Mở đề', exact: true }).click();
    expect((await published).status()).toBe(200);
    await expect(teacherPage.getByText('Đã mở đề', { exact: true })).toBeVisible();

    await login(studentPage, 'student0');
    await studentPage.goto('/exams');
    const studentExamRow = studentPage.getByRole('row').filter({ hasText: examTitle });
    await studentExamRow.getByRole('button', { name: 'Làm bài', exact: true }).click();
    await studentPage.getByRole('radio', { name: 'A. 2', exact: true }).check();
    for (let index = 0; index < 4; index += 1) {
      await studentPage.getByRole('radio', { name: index === 1 || index === 3 ? 'Sai' : 'Đúng', exact: true }).nth(index).check();
    }
    await studentPage.getByLabel('Trả lời câu 1').fill('hà nội');
    const submitted = studentPage.waitForResponse(response => response.url().includes('/submit') && response.request().method() === 'POST');
    await studentPage.getByRole('button', { name: 'Nộp bài', exact: true }).click();
    expect((await submitted).status()).toBe(200);
    await expect(studentPage.getByText(/Nộp bài thành công.*10\/10.*10\/10/)).toBeVisible();
  } finally {
    await teacherContext.close().catch(() => {});
    await studentContext.close().catch(() => {});
  }
});
