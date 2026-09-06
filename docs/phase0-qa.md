# Kiểm thử Đợt 0

Ngày chạy: 06/09/2026. Phần UI: 22/22 E2E, 9/9 policy, build production đạt. Backend bản chốt: 82/82; sau bản chốt chạy lại 4/4 luồng E2E bị ảnh hưởng đều đạt. Chi tiết nhánh và thay đổi xem implementation-progress.md.

## Chạy lại

Từ ExpressJS chạy `npm ci` và `npm test`. Từ ReactJS chạy:

```powershell
npm ci
npx playwright install chromium
npm test
npm run build
npm run test:e2e
```

Lần đầu cần mạng để tải Chromium và MongoDB binary. E2E tự khởi động/dừng API fixture và Vite. Cổng 8091/5175 phải trống; cấu hình chủ động từ chối tái dùng server khác. Fixture không đọc URI database để kết nối và không gọi seedDemo. Dữ liệu tạo trong MongoDB tạm, không giữ lại sau lượt test.

Tài khoản fixture: `reader0`, `creator0`, `teacher0`, `student0`, `parent0`, `librarian0`, `admin0` thêm `@test.invalid`; mật khẩu thử `Phase0@Test123`. Đây là dữ liệu giả, không được tạo trong production. Trường thứ hai có hậu tố 1.

## Phạm vi đã kiểm tra trên trình duyệt

- Tài khoản chỉ xem: 15 trang không có nút ghi tương ứng; vẫn xuất được báo cáo học vụ.
- Truy cập URL role trực tiếp bị đưa về dashboard khi thiếu quyền.
- Custom role chỉ có materials.view/create tạo học liệu thành công, không có nút xóa.
- Phụ huynh chỉ thấy con trong điểm/học phí và records điểm danh, không thấy HS cùng lớp hay trường khác.
- Học sinh làm/nộp đề; điểm chưa công bố vẫn bị ẩn.
- Thủ thư lấy được HS cùng trường mà không có users.view; không tự duyệt, duyệt yêu cầu người khác thành công.
- Giáo viên lưu điểm đúng lớp được phân công; kết quả mới hiển thị trong bảng.
- Admin trường sửa được role riêng; role dùng chung và role trường khác không có nút sửa; quyền vẫn đúng sau auth/me trả ID đã populate.

## Bằng chứng và giới hạn

`ReactJS/playwright-report/index.html` lưu báo cáo lượt chạy gần nhất. Chạy đầy đủ tạo ảnh reader-grades.png, parent-attendance.png, teacher-grade-saved.png trong `ReactJS/test-results/`; khi lỗi có screenshot và trace. Chạy chọn lọc ghi đè báo cáo và chỉ giữ ảnh của các ca đã chạy. Các artifact này bị gitignore; chạy lại để tái tạo, không commit dữ liệu runtime.

Đây là test Chromium trên dữ liệu giả, không phải UAT với dữ liệu production hay kiểm thử tải. Không xác nhận tích hợp Google/SMTP/SMS/Zalo/cổng thanh toán, nhập Excel mọi định dạng, in học bạ hoặc backup. Build còn cảnh báo chunk JS lớn. Các luồng thu tiền/tồn kho cần kiểm thử giao dịch đồng thời ở đợt nghiệp vụ tương ứng; bài thi chưa có tự nộp theo thời lượng.

Các kiểm tra vai trò nghiệp vụ của cụm/trường/subscription và người duyệt được giữ theo API. Calendar hiện dùng action của announcements; chưa có resource calendar riêng. Role cũ không có schoolId/clusterId được coi là dùng chung, chỉ Super Admin sửa; không tự đoán quyền sở hữu để migration.
