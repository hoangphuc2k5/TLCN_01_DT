# Phase 3 - Theo dõi người tải học liệu

## Phạm vi

- Mỗi lần tải file học liệu tạo một bản ghi gồm trường, học liệu, file, tài khoản, thời điểm, dung lượng, IP và user-agent.
- Bản ghi có vòng đời `STARTED`, `COMPLETED`, `FAILED`; báo cáo chỉ tính lượt truyền file thành công.
- Người đăng học liệu và quản trị có thể xem tổng lượt tải, số người tải duy nhất và danh sách chi tiết.
- Học sinh/phụ huynh chỉ được tải tài liệu trong phạm vi lớp/con em; không được đọc danh sách người tải.
- Giáo viên không được xem lịch sử của tài liệu do giáo viên khác đăng nếu không có vai trò quản trị.
- Khi xóa file học liệu, lịch sử gắn với file cũng được xóa trong cùng giao dịch dọn metadata.
- Lượt mở metadata, tải hồ sơ học sinh và tải file bài làm không bị tính vào thống kê học liệu.

## Cấu trúc

- `MaterialDownload` lưu sự kiện tải tách khỏi `AuditLog` chung để truy vấn và tổng hợp theo học liệu ổn định.
- `materialDownloadService` chịu trách nhiệm tạo, hoàn tất, đánh dấu lỗi và kiểm tra quyền đọc báo cáo.
- `fileController` ghi sự kiện quanh luồng stream; frontend hiển thị báo cáo trong modal tại trang Học liệu.

## Kiểm thử

- Backend kiểm tra ba lượt tải của hai tài khoản, tổng số người duy nhất, metadata không tạo lượt tải, phân quyền trường/lớp/chủ sở hữu và xóa cascade.
- Frontend unit và production build kiểm tra tích hợp giao diện/API.

Kết quả hồi quy cuối được ghi trong `implementation-progress.md` trước khi gộp nhánh.
