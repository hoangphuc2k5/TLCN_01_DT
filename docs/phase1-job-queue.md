# Phase 1.2 — Hàng đợi tác vụ nền

Nền: `feat/phase1-file-storage` tại `9f27526`. Nhánh bàn giao: `feat/phase1-job-queue`. MongoDB lưu hàng đợi; không thêm Redis hoặc dịch vụ cloud.

Đã push code/test tại `5a41949` lên origin. Nhánh kế thừa đầy đủ 1.1, chưa merge vào main/integration/phase0; tiến trình tiếp tục ở `implementation-progress.md`.

## Phạm vi đã làm

- Job bền vững với lịch chạy một lần, retry tăng thời gian chờ, giới hạn lượt thử, trạng thái và lease cho nhiều worker.
- Hai handler thực: **gửi email từ thông báo đã lưu** và **xóa file DELETING/hoàn dung lượng**. Không có handler giả chỉ đổi trạng thái.
- Trang **Tác vụ nền**: phân trang, lọc trạng thái, xem lỗi đã chuẩn hóa, thử lại ngay/theo lịch, hủy job đang chờ.
- Email của tin nhắn, điểm danh, thông báo lớp/trường và kết quả duyệt đơn đi qua queue; request không chờ SMTP. Notification có emailState=PENDING là ý định gửi bền vững. Worker quét và tạo job trước khi đổi thành ENQUEUED.
- Thông báo cũ không có emailState hoặc NOT_REQUESTED không được tự gửi lại. Bỏ giới hạn gửi email cho 50 người đầu của thông báo: worker xử lý từng người nhận qua từng job.

## Chạy API và worker

Từ ExpressJS, mở hai tiến trình riêng:

```powershell
npm start
```

```powershell
npm run worker
```

Worker dùng cùng MONGO_DB_URL và cấu hình storage/email với API; **API không tự khởi động worker**. Nếu chưa chạy worker, Notification giữ ý định gửi và file cần phục hồi vẫn giữ dung lượng. Worker khi khởi động lại sẽ đọc tiếp từ DB. Nhiều worker có thể dùng chung hàng đợi; với local storage phải mount cùng thư mục/volume FILE_LOCAL_ROOT của API. Không chạy worker bản cũ song song với bản có handler/quy ước mới khác nhau.

Biến mẫu trong `ExpressJS/.env.example`:

```dotenv
JOB_POLL_MS=2000
JOB_LEASE_MS=90000
JOB_MAX_ATTEMPTS=5
JOB_RETRY_MS=5000
JOB_FILE_DELETE_GRACE_MS=30000
```

Mỗi worker xử lý lần lượt một job, poll khi không có việc; có thể tăng số tiến trình để xử lý đồng thời. Lease heartbeat mỗi khoảng 1/3 thời hạn. Giữ đồng hồ các máy đồng bộ. SIGINT/SIGTERM dừng nhận việc mới, chờ handler đang chạy kết thúc, đóng transport/DB. SMTP có timeout kết nối/chào 15 giây và socket 30 giây; tác vụ storage vẫn phụ thuộc timeout của adapter.

Worker cần quyền đọc/ghi và tạo index cho Job/Notification. Queue dùng thao tác nguyên tử trên một Job nên phần hàng đợi không đòi transaction; handler hoàn dung lượng file vẫn cần replica set như Phase 1.1. Không đổi `.env`, khởi động worker thật hoặc kết nối Atlas trong lượt kiểm thử này.

## Trạng thái, chống trùng và phục hồi

`QUEUED → RUNNING → SUCCEEDED / SKIPPED`, hoặc quay về QUEUED để retry; hết lượt thành FAILED. QUEUED có thể CANCELLED. FAILED/CANCELLED có thể thử lại với số lượt của vòng mới về 0; totalAttempts giữ tổng số lần đã nhận việc.

- Unique index `(schoolId, kind, resourceId)` ngăn nhiều dispatcher tạo trùng cho cùng ý định. Job hoàn thành/hủy/thất bại được giữ để không tái tạo khi quét lại; không tự xóa bằng TTL. Chính sách lưu trữ lịch sử dài hạn chưa triển khai.
- Nếu crash sau enqueue nhưng trước khi đánh dấu nguồn ENQUEUED, lần quét sau tìm lại job cũ. File có deleteJobEnqueued để job lỗi không chiếm mãi đầu batch quét 100 bản ghi.
- Nhận việc bằng findOneAndUpdate có điều kiện trạng thái/thời gian/lượt thử. Lease hết hạn được worker khác nhận lại; hết lượt thì chuyển FAILED. lockToken và hạn lease phải còn khớp khi heartbeat/ack/fail, worker cũ không ghi đè worker mới.
- Retry theo `JOB_RETRY_MS × 2^(attempts−1)`, trần một giờ. Lưu mã lỗi chuẩn, không lưu stack/credentials hoặc thông báo lỗi thô từ SMTP/storage vào Job/API.
- Chưa cấu hình SMTP được ghi SMTP_UNCONFIGURED và retry, không báo gửi thành công. Người nhận không còn hoạt động/sai phạm vi hoặc địa chỉ không được chính sách email hỗ trợ thành SKIPPED. Worker đọc lại tài khoản/role trước khi gửi.
- Gửi SMTP là **at least once**: nếu nhà cung cấp đã nhận mail nhưng worker chết trước ack, retry có thể gửi trùng. Message-ID ổn định theo Job giúp truy vết, không bảo đảm nhà cung cấp deduplicate. SUCCEEDED nghĩa transport chấp nhận, không chứng minh thư đã vào inbox hay được đọc.
- Ý định email bền vững bắt đầu từ lúc Notification được lưu. Các domain event Observer vẫn ở trong bộ nhớ; crash sau khi lưu nghiệp vụ nhưng trước khi listener tạo Notification vẫn có thể mất thông báo. Chưa chuyển toàn bộ nghiệp vụ sang transactional outbox.

## Phục hồi file

Sau khoảng chờ cấu hình, dispatcher chỉ nhận FileAsset **DELETING**, không tự chuyển/xóa UPLOADING hoặc READY. Handler gọi cùng purgeAsset của Phase 1.1: xóa vật lý rồi transaction xóa metadata/học liệu và hoàn quota; lặp lại không trừ bytes lần hai.

Nếu hết lượt, operator sửa nguyên nhân storage rồi thử lại job. Hủy job chỉ dừng việc tự retry, không khôi phục file đã xóa và không trả quota sớm. Có thể tiếp tục xóa qua API học liệu nếu còn đủ quyền. UPLOADING vẫn dùng `recover-file-storage.js` khi đã dừng API và **tất cả worker**. Không chạy maintenance apply đồng thời với worker.

## API và phân quyền

| API | Quyền / quy tắc |
| --- | --- |
| `GET /v1/api/jobs?status=FAILED&page=1&limit=25` | jobs.view; scope trường/cụm, Super Admin toàn hệ thống; limit tối đa 100; không trả lockToken |
| `POST /v1/api/jobs/:id/retry` | jobs.execute; chỉ FAILED/CANCELLED; body `{ "runAt": "ISO datetime" }` hoặc `{}` để chạy ngay |
| `POST /v1/api/jobs/:id/cancel` | jobs.execute; chỉ QUEUED; không hủy một handler đã chạy |
| `POST /v1/api/messages` | Luồng cũ thêm emailRunAt tùy chọn để trì hoãn email; in-app vẫn tạo ngay. Ngày quá khứ/sai định dạng/quá 366 ngày bị chặn trước khi ghi tin |

Không có API công khai để gửi payload/kind tùy ý cho worker. Retry/hủy có audit. Tài khoản chỉ xem không thấy nút thực thi và API trả 403; ID ngoài tenant trả 404.

Catalog thêm `jobs`/MANAGE_JOBS. Role quản trị trường/cụm **mới được seed** có view/execute mặc định; Super Admin có quyền quản trị. Role đã tồn tại vẫn giữ nguyên quyền đã chỉnh: Super Admin có thể cấp jobs.view/jobs.execute bằng trang Vai trò trước khi giao việc cho operator, không chạy seed force để ghi đè cả bộ quyền.

## Kiểm thử và bước tiếp

- Backend: `npm test` — **123/123 đạt**, thêm 17 ca cho queue/handler/API; MongoDB tạm và file local thật. Kiểm tra enqueue/claim đồng thời, lịch tương lai, lease cũ, mất worker ở lượt cuối, heartbeat, backoff, crash khi dispatcher đánh dấu nguồn, email mock, file xóa thật, quyền tenant, thao tác operator và dừng worker.
- Frontend policy: **10/10 đạt**. E2E đầy đủ: **27/27 đạt**, thêm trang jobs chỉ xem và admin retry/hủy; giữ các ca Phase 0/file storage.
- Production build đạt; còn cảnh báo chunk khoảng 1,51 MB. Sau E2E bổ sung đóng transport và guard dừng worker, đã chạy lại backend; không thay đổi luồng UI.
- Gmail SMTP/Atlas chưa được kiểm chứng. Mail dùng transport giả trong test, không gửi tới người dùng. Không có load test hay rollout production.
- Lịch hiện là chạy một lần bằng runAt, chưa có biểu thức cron/lịch lặp hoặc giao diện tạo job tùy ý. Khi làm backup/nhắc nợ cần thêm handler và producer có khóa idempotency theo lần chạy cụ thể.
- Mục tiếp theo: **Phase 1.3 — 2FA và chính sách mật khẩu**, sau đó 1.4 backup/restore. Giữ các giới hạn trên khi mở rộng worker.

Tham chiếu: [MongoDB atomic writes](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/), [Nodemailer SMTP/timeouts](https://nodemailer.com/smtp).
