# Phase 3.2 — File đính kèm bài nộp online

Cập nhật: 10/09/2026. Nhánh `feat/phase3-homework-file-submissions`, commit `8a09d63`; đã merge vào `integration/phase3` tại `1f36bec`.

## Phạm vi hoàn thành

- Học sinh có thể nộp lại nội dung và đính kèm file PDF, ảnh, TXT hoặc Office; mỗi bài nộp tối đa 5 file.
- File dùng `FileAsset` với purpose `HOMEWORK_SUBMISSION`, storage adapter local/S3 và hạn mức dung lượng theo subscription như học liệu/hồ sơ.
- Chỉ học sinh sở hữu bài nộp được thêm/xóa file trước khi chấm và trong cửa sổ nhận bài. Giáo viên phụ trách, học sinh và phụ huynh đúng quan hệ được tải file; truy cập khác lớp/trường trả 404.
- Khi xóa vật lý thành công, tham chiếu file được gỡ khỏi bài nộp và dung lượng trường được hoàn lại trong transaction. Nếu storage lỗi, trạng thái phục hồi hiện hành tiếp tục giữ reservation.
- Giao diện bài tập cho chọn file khi nộp, hiển thị file đã nộp để tải xuống và cho phép nộp lại khi chưa chấm.

## Kiểm thử local

- Backend bài tập: **8/8 đạt**; kiểm tra upload bytes thật, quota/storage metadata, download theo scope và khóa sửa file sau chấm.
- Backend bài tập + file storage: **20/20 đạt** với MongoDB Memory ReplSet và thư mục local tạm.
- Frontend policy: **11/11 đạt**; production build đạt, còn cảnh báo bundle lớn như trước.
- Playwright bài tập: **2/2 đạt**, gồm thao tác chọn file và xác nhận file xuất hiện sau khi nộp.

Không kết nối Atlas hoặc S3 thật; adapter local ghi file vào thư mục tạm và dọn sau test.
