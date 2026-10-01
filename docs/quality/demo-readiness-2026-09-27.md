# Kiểm tra sẵn sàng demo — 27/09/2026

## Phạm vi và môi trường

- Nhánh: `integration/phase3`.
- Commit được kiểm thử: `cfc61d28734d447af1897848870db5688a776720`.
- Môi trường local: Windows, Node.js `v24.15.0`, npm `11.12.1`.
- Backend test dùng MongoDB Memory Server/ReplSet theo từng suite; Playwright dùng MongoDB Memory ReplSet riêng, API `127.0.0.1:8091`, Vite `127.0.0.1:5175`, Chromium headless, một worker, không retry.
- Không chạy seed/reset trên database ứng dụng. Không deploy hoặc thực hiện giao dịch thanh toán thật.
- Kết quả local không thay thế CI Linux/Node.js 22, UAT người dùng hoặc kiểm thử dịch vụ bên ngoài.

## Kết quả regression

| Kiểm tra | Lệnh và thư mục | Kết quả |
| --- | --- | --- |
| Backend | `npm test` tại `ExpressJS` | 256/256 đạt, không bỏ qua; 180,06 giây; exit 0 |
| Frontend unit | `npm test` tại `ReactJS` | 11/11 đạt, không bỏ qua |
| Production build | `npm run build` tại `ReactJS` | Đạt; cảnh báo chunk trên 500 kB |
| Playwright | `npm run test:e2e` tại `ReactJS` | 46/46 đạt; 3,1 phút; exit 0 |

Kết luận: toàn bộ suite hiện có và production build đạt trên môi trường local. Không phát hiện test thất bại cần sửa trong lượt này. Chưa xác nhận sẵn sàng staging/production; coverage, UAT và các bước trình diễn bổ sung bên dưới chưa được đo/thực hiện trong lượt regression.

Log của lượt chạy được lưu cục bộ:

- [Backend](../tmp/regression-backend-20260927.log)
- [Frontend unit](../tmp/regression-frontend-20260927.log)
- [Build](../tmp/regression-build-20260927.log)
- [E2E](../tmp/regression-e2e-20260927.log)
- Báo cáo HTML: `ReactJS/playwright-report/index.html`.

Log và báo cáo HTML là artifact local bị Git ignore; cần upload riêng nếu dùng làm minh chứng CI/UAT. Các dòng `[Error] ApiError` có thể là kết quả mong đợi của test âm; xác định thành công/thất bại bằng tổng kết runner và exit code.

## Đối chiếu năm luồng demo

| Luồng | Bằng chứng tự động hiện có | Phần cần kiểm tra bổ sung trước buổi demo |
| --- | --- | --- |
| Đăng nhập và phân quyền | `permissions.test.js`, `auth-security.test.js`; `phase0.spec.js` kiểm tra role chỉ đọc, chặn URL trực tiếp, phụ huynh chỉ thấy con mình; `phase1-auth-security.spec.js` | Đăng nhập bằng tài khoản demo thực tế trên môi trường trình diễn; xác nhận trường/lớp và menu đúng |
| Điểm danh và xem điểm | `export-scope.test.js` kiểm tra phạm vi và dữ liệu sai lớp; `phase0.spec.js` kiểm tra giáo viên cập nhật điểm trên UI và phụ huynh xem điểm/chuyên cần | Điểm danh mới bằng UI giáo viên rồi chuyển sang phụ huynh để kiểm tra kết quả; suite UI hiện chưa chứng minh đầy đủ chuỗi này |
| Giao, nộp và chấm bài | `homework.test.js` kiểm tra tạo/publish, nộp, chấm, hạn nộp và quyền; `phase2-online-assignments.spec.js` kiểm tra học sinh nộp file bằng UI | Chạy liền mạch UI giáo viên tạo bài → học sinh nộp → giáo viên chấm → học sinh xem phản hồi; chưa có một E2E bao phủ toàn bộ chuỗi UI |
| Học phí | `online-payment.test.js` kiểm tra chữ ký, số tiền, IPN lặp và tranh chấp thu tiền; `phase3-fee-line-items.spec.js` kiểm tra lập hóa đơn; `phase2-online-payments.spec.js` kiểm tra checkout và cập nhật sau IPN fixture | Nếu trình diễn VNPay thật, xác minh credentials, callback công khai và IPN sandbox trước buổi demo; lượt regression này chỉ dùng gateway giả lập |
| Xuất học bạ | `student-dossiers-certificates.test.js` kiểm tra PDF/DOCX và phạm vi; `phase3-transcript-docx.spec.js` kiểm tra tải DOCX và bản lịch sử | Mở file tải về để kiểm tra bố cục, tiếng Việt, dữ liệu và số trang trên bộ dữ liệu demo thực tế |

Không suy ra “5/5 luồng đã UAT” từ việc suite tự động đạt. Bảng trên phân biệt bằng chứng đã có với các bước trình diễn còn cần thực hiện.

## Checklist trước demo

- [ ] MongoDB của môi trường demo hoạt động với replica set; không dùng standalone cho luồng cập nhật điểm.
- [ ] Backend khởi động và `/v1/api/health` trả thành công; frontend truy cập được API.
- [ ] Có tài khoản giáo viên, học sinh, phụ huynh, kế toán và quản trị với quan hệ trường/lớp/con em đúng.
- [ ] Có dữ liệu mẫu cho năm luồng; ngày/hạn nộp phù hợp ngày trình diễn.
- [ ] Hoàn thành các bước bổ sung trong bảng năm luồng, ghi người kiểm tra và kết quả thực tế.
- [ ] Nếu dùng sandbox/dịch vụ thật, xác minh callback, file storage, email/SSO tương ứng; nêu rõ phần nào chỉ giả lập.
- [ ] Chuẩn bị phương án local và dữ liệu riêng; chỉ seed khi chủ động tạo lại database demo.
- [ ] Lưu screenshot, báo cáo test và lỗi còn tồn tại cho đúng phiên bản code.

## Backlog ưu tiên sau regression

| Mức ưu tiên | Phát hiện | Tiêu chí hoàn thành |
| --- | --- | --- |
| P1 — trước staging công khai | Đã sửa CORS theo `FRONTEND_URL`/`CORS_ALLOWED_ORIGINS`, bật CSP mặc định và che thông báo lỗi 5xx trong production; test âm tại `http-boundary.test.js` | Khi cấu hình staging, đặt đúng origin giao diện và kiểm tra từ trình duyệt trên domain thật |
| P1 — chất lượng có số đo | Workflow hiện chạy backend, frontend/build và E2E; chưa có lint, coverage hoặc security scan trong workflow | Thêm quality gate và artifact; đo coverage thực tế trước khi đặt kết luận đạt rubric |
| P1 — triển khai | Chưa có cấu hình Docker/Compose và job CD trong repo được kiểm tra | Chọn đích staging, đóng gói API/frontend/worker, healthcheck, rollback và thực hành restore trên dữ liệu riêng |
| P2 — hiệu năng frontend | Bundle chính 1.651,12 kB, gzip 513,52 kB; Vite cảnh báo >500 kB | Tách route/module phù hợp, đo lại build và tải trang; không tăng ngưỡng cảnh báo để che vấn đề |
| P2 — đồng bộ kế hoạch | Hai bản kế hoạch đang dùng mã Epic khác nhau: ví dụ `TLCN-180` là bảo vệ trong rubric plan nhưng là kiểm thử trong lịch 15 tuần | Chọn một mapping Jira chính thức rồi đồng bộ trước khi import/tạo issue |

## Sửa lỗi HTTP boundary sau regression

- `app.js` chỉ gửi CORS headers cho origin trong `FRONTEND_URL` hoặc `CORS_ALLOWED_ORIGINS`; request không có Origin vẫn dùng API được. CSP mặc định của Helmet đã bật.
- `errorHandler.js` trả thông báo chung cho lỗi 5xx ở production; lỗi nghiệp vụ 4xx vẫn giữ thông báo cần thiết cho người dùng.
- Thêm `http-boundary.test.js` kiểm tra origin cho phép/bị từ chối, preflight, CSP và nội dung lỗi production.
- Sau sửa: backend **258/258** đạt khi chạy riêng, E2E **46/46** đạt. Một lượt chạy backend đồng thời với E2E có 1 ca backup CLI thất bại do tiến trình con Windows thoát `3221226505` mà không có stderr; ca đó đạt khi chạy backup suite riêng **20/20** và trong lượt backend chạy riêng **258/258**. Chưa tái hiện lỗi trong điều kiện chạy riêng; tránh chạy hai suite cùng lúc trên máy demo Windows.
- Log local của lượt xác minh: `tmp/http-hardening-backend-sequential-20260927.log`, `tmp/http-hardening-e2e-20260927.log` và `tmp/http-hardening-backup-isolated-20260927.log`.

README đã được chỉnh để phản ánh backup/restore, WebSocket, VNPay sandbox, adapter SSO/OTP, menu theo quyền và yêu cầu replica set. Các bản kế hoạch cùng file chưa theo dõi có sẵn được giữ nguyên trong lượt kiểm tra này.
