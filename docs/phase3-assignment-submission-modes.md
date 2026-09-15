# Phase 3 - Nộp bài trực tuyến/file và yêu cầu thi lại/học lại

## Phạm vi

- Học sinh chọn một trong hai cách nộp: nhập nội dung trực tiếp trên web hoặc tải file bài làm.
- Bài nộp trên web bắt buộc có nội dung. Bài nộp bằng file bắt buộc hoàn tất tải file trước khi được coi là đã nộp.
- Bài đang tải file có trạng thái `UPLOADING`; giáo viên không nhìn thấy trong danh sách chấm và không thể chấm sớm.
- Khi file đã được lưu và metadata chuyển sang `READY`, bài mới chuyển sang `SUBMITTED`. Nếu lưu file lỗi, học sinh có thể tải lại.
- Bài chỉ có file không được xóa file cuối cùng. Bài đã chấm không thể sửa nội dung hoặc file.
- Hình thức thực tế được lưu là `WEB`, `FILE` hoặc `MIXED` để giáo viên biết cách học sinh nộp.
- Yêu cầu thi lại và học lại được chuyển từ trang CLB sang trang Bài tập, đồng thời được phân biệt bằng `RETAKE_EXAM` và `REPEAT_COURSE`.
- Chặn yêu cầu trùng theo học sinh, môn, năm học và loại yêu cầu khi yêu cầu cũ còn đang xử lý; vẫn cho phép một yêu cầu thi lại và một yêu cầu học lại riêng biệt.

## Cấu trúc

- `HomeworkSubmission` lưu `submissionMode` và trạng thái trung gian `UPLOADING`.
- `homeworkService` kiểm tra dữ liệu theo hình thức nộp và lọc bài chưa tải file khỏi danh sách chấm.
- `fileService` dùng kho file/quota hiện có, chỉ hoàn tất bài nộp sau khi ghi file thành công và bảo vệ file cuối của bài chỉ nộp file.
- `RetakeRequest` lưu `requestType`; `clubService` xác thực loại yêu cầu và chống trùng theo từng loại.
- `AssignmentsPage` gom bài tập, nộp file/làm trên web và yêu cầu thi lại/học lại. `ActivitiesPage` chỉ còn CLB/môn tự chọn.

## Kiểm thử

- Backend mục tiêu kiểm tra nội dung web bắt buộc, trạng thái tải file, ẩn bài chưa hoàn tất khỏi giáo viên, hoàn tất sau upload, bảo vệ file cuối và phân biệt hai loại yêu cầu.
- Backend toàn bộ: **255/255 đạt** trên MongoDB local memory replica set.
- Frontend unit: **11/11 đạt**.
- Production build: đạt; Vite còn cảnh báo bundle chính lớn hơn 500 kB.
- Playwright mục tiêu: bài tập/thi lại **2/2 đạt**; CLB **1/1 đạt**. Toàn bộ E2E: **46/46 đạt**.

Kết quả CI trên nhánh tích hợp được bổ sung vào `implementation-progress.md` sau khi gộp.
