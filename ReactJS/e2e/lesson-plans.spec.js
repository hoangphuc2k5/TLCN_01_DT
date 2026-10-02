import { test, expect } from '@playwright/test';

async function login(page, account) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(`${account}@test.invalid`);
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Phase0@Test123');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function choose(page, dialog, label, value) {
  await dialog.getByLabel(label, { exact: true }).click();
  await page.getByText(value, { exact: true }).last().click();
}

test('teacher submits a structured lesson plan and academic staff approves it', async ({ browser }) => {
  const teacherContext = await browser.newContext();
  const academicContext = await browser.newContext();
  try {
    const teacher = await teacherContext.newPage();
    const academic = await academicContext.newPage();
    await login(teacher, 'teacher0');
    await teacher.goto('/lesson-plans');
    await teacher.getByRole('button', { name: 'Soạn giáo án', exact: true }).click();
    const dialog = teacher.getByRole('dialog');
    await dialog.getByLabel('Tiêu đề', { exact: true }).fill('Giáo án QA phương trình');
    await choose(teacher, dialog, 'Lớp', 'QA Class 0');
    await choose(teacher, dialog, 'Môn', 'QA Math');
    await choose(teacher, dialog, 'Năm học', '2026-2027');
    await dialog.getByLabel('Ngày dạy', { exact: true }).fill('2026-09-15');
    await dialog.getByLabel('Mục tiêu', { exact: true }).fill('Học sinh vận dụng được kiến thức vào bài tập.');
    await dialog.getByLabel('Chuẩn bị', { exact: true }).fill('Phiếu học tập.');
    await dialog.getByLabel('Nội dung trọng tâm', { exact: true }).fill('Ôn tập và vận dụng phương trình.');
    await dialog.getByLabel('Tên hoạt động', { exact: true }).fill('Luyện tập nhóm');
    await dialog.getByLabel('Hoạt động của giáo viên', { exact: true }).fill('Giao nhiệm vụ và hướng dẫn.');
    await dialog.getByLabel('Hoạt động của học sinh', { exact: true }).fill('Thảo luận và trình bày lời giải.');
    await dialog.getByLabel('Cách đánh giá', { exact: true }).fill('Nhận xét sản phẩm nhóm.');
    const created = teacher.waitForResponse(response => response.url().endsWith('/v1/api/lesson-plans') && response.request().method() === 'POST');
    await dialog.locator('.ant-modal-footer button').last().click();
    expect((await created).status()).toBe(201);
    await expect(dialog).toBeHidden();

    let row = teacher.getByRole('row').filter({ hasText: 'Giáo án QA phương trình' });
    const submitted = teacher.waitForResponse(response => response.url().includes('/lesson-plans/') && response.url().endsWith('/submit'));
    await row.getByRole('button', { name: 'Gửi duyệt', exact: true }).click();
    expect((await submitted).status()).toBe(200);
    await expect(row.getByText('SUBMITTED', { exact: true })).toBeVisible();

    await login(academic, 'admin0');
    await academic.goto('/lesson-plans');
    row = academic.getByRole('row').filter({ hasText: 'Giáo án QA phương trình' });
    await row.getByRole('button', { name: 'Duyệt', exact: true }).click();
    const reviewDialog = academic.getByRole('dialog');
    await reviewDialog.getByLabel('Nhận xét', { exact: true }).fill('Đạt yêu cầu chuyên môn.');
    const approved = academic.waitForResponse(response => response.url().includes('/lesson-plans/') && response.url().endsWith('/review'));
    await reviewDialog.locator('.ant-modal-footer button').last().click();
    expect((await approved).status()).toBe(200);
    await expect(reviewDialog).toBeHidden();
    await expect(row.getByText('APPROVED', { exact: true })).toBeVisible();
    await expect(row.getByText('Đạt yêu cầu chuyên môn.', { exact: true })).toBeVisible();
  } finally {
    await Promise.allSettled([teacherContext.close(), academicContext.close()]);
  }
});

test('student cannot open the lesson-plan management page', async ({ page }) => {
  await login(page, 'student0');
  await page.goto('/lesson-plans');
  await expect(page).toHaveURL(/\/dashboard$/);
});
