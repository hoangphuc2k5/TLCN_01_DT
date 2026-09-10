# Phase 3.1 — Soạn và duyệt giáo án

Cập nhật: 10/09/2026. Nhánh: `feat/phase3-lesson-plan-approval`, nền `integration/phase2`.

## Phạm vi hoàn thành

- Thêm giáo án có cấu trúc theo trường, lớp, môn, năm học và đúng phân công giáo viên; gồm mục tiêu, chuẩn bị, nội dung, ngày dạy, thời lượng và tối đa 20 hoạt động dạy học.
- Quy trình trạng thái: `DRAFT → SUBMITTED → APPROVED/REJECTED`. Giáo viên sửa và gửi lại bản bị từ chối; mỗi lần gửi tăng revision và lịch sử duyệt cũ được giữ lại.
- Chỉ giáo viên được phân công được soạn/sửa/xóa/gửi giáo án của mình. Ban giám hiệu hoặc giáo vụ duyệt trong phạm vi trường; không được tự duyệt. Từ chối bắt buộc có lý do.
- Các chuyển trạng thái duyệt, gửi, sửa và xóa dùng điều kiện trạng thái trong câu lệnh MongoDB để không ghi đè khi có thao tác đồng thời.
- Thêm notification cho giáo viên sau mỗi kết quả duyệt, quyền riêng `lesson_plans`, REST API `/v1/api/lesson-plans`, trang React `/lesson-plans` và menu theo permission.

## Kiểm thử local

- Backend riêng: `node --test test/lesson-plan.test.js` — **3/3 đạt**.
- Backend toàn bộ: `npm test` — **234/234 đạt**, chạy tuần tự với MongoDB Memory Server/Memory ReplSet.
- Frontend policy: `npm test` — **11/11 đạt**.
- Production build: `npm run build` — đạt; còn cảnh báo bundle chính lớn hơn 500 kB như trước.
- Playwright riêng: **2/2 đạt**. Playwright toàn bộ: **41/41 đạt**; luồng mới kiểm tra giáo viên soạn/gửi, quản trị duyệt và học sinh bị chặn.

Toàn bộ kiểm thử dùng MongoDB local tạm và fixture riêng, không kết nối Atlas hay sửa dữ liệu thật.

## Giới hạn và bước tiếp theo

- Giáo án hiện lưu nội dung có cấu trúc trong MongoDB; file đính kèm giáo án chưa nằm trong phạm vi mục này.
- Hạng mục tiếp theo là bổ sung file đính kèm cho bài nộp online qua kho `FileAsset`, đúng giới hạn đã ghi trong Phase 2.2.
