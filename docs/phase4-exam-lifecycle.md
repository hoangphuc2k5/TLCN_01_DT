# Phase 4 — vòng đời thi online

## Phạm vi

Bổ sung các phần còn mỏng của chức năng thi online trong đặc tả: giới hạn thời lượng ở server, tự chốt lượt quá hạn, trộn câu hỏi theo từng lượt và hiển thị đồng hồ đếm ngược cho học sinh.

## Thay đổi

- `Exam.durationMinutes` được kiểm tra là số nguyên từ 1 đến 1.440 phút; `maxAttempts` từ 1 đến 10.
- `ExamAttempt` lưu `expiresAt`, `questionOrder`, `autoSubmitted` và `submissionReason` (`MANUAL` hoặc `TIMEOUT`). Hạn nộp được tính lúc bắt đầu và không bị kéo dài nếu đề thi được sửa sau đó; nếu đề có `endAt` sớm hơn thì dùng `endAt`.
- Server chấm phần trắc nghiệm và chuyển lượt quá hạn sang `SUBMITTED` với lý do `TIMEOUT`. Việc cập nhật dùng điều kiện trạng thái `IN_PROGRESS`, nên nộp đồng thời chỉ ghi nhận một lần.
- Khi lấy danh sách lượt làm, các lượt đã hết hạn nhưng chưa gửi request nộp cũng được chốt tự động.
- React sắp xếp câu hỏi theo `questionOrder`, hiển thị thời gian còn lại và tự nộp khi đồng hồ về 0.
- Bản nháp được lưu qua `PATCH /v1/api/exam-attempts/:attemptId/draft` sau mỗi thay đổi có debounce; mở lại đề trong khi lượt còn hiệu lực sẽ tiếp tục đúng lượt và khôi phục câu trả lời. Khi request đến sau hạn, server chỉ chốt dữ liệu đã lưu trước hạn, không nhận câu trả lời gửi muộn.

## Kiểm thử

- Backend `export-scope.test.js`: **88/88** (bao gồm kiểm thử bản nháp, resume và không nhận payload gửi muộn).
- Toàn bộ backend regression trên MongoDB local: **242/242**.
- Frontend policy: **11/11**; Vite production build đạt.

## Giới hạn môi trường

Kiểm thử dùng MongoDB Memory Server/ReplSet local. Việc chạy thật cần tiếp tục UAT với trình duyệt, callback thanh toán và các dịch vụ bên ngoài theo tài liệu đặc tả.
