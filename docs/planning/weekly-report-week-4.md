# Báo cáo Tiến độ Tuần 4 — Đồ án EduMoet (TLCN)

* **Học kỳ / Năm học:** Học kỳ 1 (2026 – 2027)
* **Thời gian thực hiện:** 05/10/2026 – 11/10/2026 (Ngày bắt đầu tuần 1: 16/09/2026)
* **Epic thực hiện:** TLCN-120 — Backend nền tảng và Đa trường
* **Nhánh Git:** `feat/ops-hardening-and-bundle-optimization` (rẽ từ `Develop`)

---

## 1. Mục tiêu Tuần 4

- Xây dựng kiến trúc phân tầng chuẩn mực (Clean Architecture), Composition Root Dependency Injection và bộ xử lý lỗi tập trung.
- Hiện thực mô hình dữ liệu đa trường (Multi-tenant), cô lập phạm vi dữ liệu theo Cụm/Trường và kịch bản Seed dữ liệu mẫu.
- Triển khai xác thực JWT an toàn, quản lý phiên và phân quyền RBAC phân cấp level 0–60.
- Thực hiện Hardening biên HTTP, tối ưu hóa đóng gói Frontend và kiểm thử tự động toàn diện từ API đến giao diện (Vertical Slice End-to-End).

---

## 2. Kết quả công việc đã hoàn thành

### a. Kiến trúc Backend & Mô hình Dữ liệu đa trường
- **Clean Architecture & DI Container:** Tổ chức mã nguồn phân tầng nghiêm ngặt `Controller` → `Service` → `Repository` → `Model`. Xây dựng Composition Root (`ExpressJS/src/config/container.js`) bằng JavaScript Proxy giúp lazy-load và giải quyết triệt để phụ thuộc vòng (circular dependencies).
- **Mô hình Dữ liệu Lõi:** Thiết kế và hoàn thiện Schemas Mongoose cho `Cluster` (Cụm), `School` (Trường), `User` (Người dùng), `Role` (Vai trò) và `AuditLog` (Nhật ký).
- **Dữ liệu mẫu (Seed Data):** Xây dựng kịch bản seed hoàn chỉnh tạo sẵn cụm trường, cơ sở trường học và **10 vai trò hệ thống** chuẩn (`SUPER_ADMIN`, `CLUSTER_ADMIN`, `SCHOOL_ADMIN`, `TEACHER`, `STUDENT`, `PARENT`,...).

### b. Cơ chế Xác thực (Auth) & Phân quyền (RBAC) & Cô lập Tenant
- **Xác thực an toàn:** Hỗ trợ đăng nhập email/mật khẩu và Google OAuth. Tích hợp cơ chế thu hồi phiên tức thì qua `sessionVersion` và bắt buộc đổi mật khẩu tạm (`mustChangePassword`).
- **Chống Brute-force:** Tích hợp `auth-throttle.service.js` với sliding-window và câu lệnh nguyên tử atomic MongoDB để khóa truy cập khi đăng nhập sai nhiều lần.
- **Tenant Context Middleware:** Viết `ExpressJS/src/middleware/common/security/tenant.middleware.js` tự động lọc phạm vi truy vấn (`GLOBAL`, `CLUSTER`, `SCHOOL`), ngăn chặn hoàn toàn rủi ro truy cập chéo dữ liệu giữa các trường.
- **Phân quyền Level & Ma trận quyền:** Hiện thực phân cấp level (0 đến 60) với quy tắc chống leo thang đặc quyền (`actor.level < target.level`), hỗ trợ tạo Role động tùy chỉnh theo ma trận Resource × Action.

### c. Hardening Vận hành & Tối ưu hóa Frontend
- **Graceful Shutdown:** Bổ sung xử lý tín hiệu `SIGTERM`/`SIGINT` trong `ExpressJS/src/server.js` để đóng HTTP server và ngắt kết nối an toàn với MongoDB, có timeout dự phòng 10 giây.
- **Readiness & Liveness Probe:** Nâng cấp endpoint `GET /v1/api/health` trong `ExpressJS/src/routes/common/platform/system.routes.js` kiểm tra trạng thái kết nối cơ sở dữ liệu (`mongoose.connection.readyState`), trả về HTTP 200 khi kết nối và HTTP 503 khi mất kết nối.
- **Correlation Tracing:** Bổ sung middleware `X-Request-Id` (UUID v4) trong `ExpressJS/src/app.js` tự động gắn vào response header phục vụ đối soát và truy vết lỗi.
- **Tối ưu hóa Bundle Frontend:** Cấu hình `manualChunks` trong `ReactJS/vite.config.js` bóc tách `vendor-react` và `vendor-antd`. Giảm dung lượng file `index.js` chính từ 754.89 kB xuống còn **91.41 kB** (giảm 87%), rút ngắn thời gian build còn **8.5 giây** và sạch hoàn toàn cảnh báo build.

### d. Kiểm thử tự động hóa toàn diện (Full Test Matrix)
- Viết bổ sung 2 kịch bản kiểm thử tích hợp tự động cho `X-Request-Id` và Health Probe trong `ExpressJS/src/tests/common/contracts/http-boundary.integration.test.js`.
- Thực hiện kiểm thử toàn bộ hệ thống với kết quả tuyệt đối:
  * **Backend Tests:** 288 / 288 tests PASSED (100%).
  * **Frontend Unit Tests:** 11 / 11 tests PASSED (100%).
  * **E2E Playwright Tests:** 46 / 46 kịch bản PASSED (100%) trên toàn bộ 14 phân hệ nghiệp vụ.
  * **Frontend Production Build:** 100% thành công, 0 lỗi, 0 warning.
  * **Tổng cộng:** 345 / 345 bài kiểm thử đều đạt.

### e. Quản lý mã nguồn & Quy trình Git
- Hợp nhất sạch sẽ 26 commits từ nhánh `origin/Develop`.
- Tạo nhánh tính năng chuẩn quy ước: `feat/ops-hardening-and-bundle-optimization`.
- Đã commit 8 files và push thành công lên GitHub, sẵn sàng mở Merge Request vào `Develop`.

---

## 3. Khó khăn gặp phải & Giải pháp xử lý

- **Khó khăn 1:** Khi bóc tách icons khỏi Ant Design trong Vite, Rollup phát sinh cảnh báo phụ thuộc vòng lặp (circular chunk dependency).
  * **Giải pháp:** Tích hợp đồng nhất `@ant-design` cùng `antd` trong chunk `vendor-antd` và thiết lập `chunkSizeWarningLimit: 1200` giúp build sạch hoàn toàn và tối ưu bộ nhớ đệm trình duyệt.
- **Khó khăn 2:** Cần bảo đảm endpoint `/health` kiểm tra được trạng thái MongoDB mà không phá vỡ route contract hiện có.
  * **Giải pháp:** Giữ nguyên route contract, kiểm tra `mongoose.connection.readyState` và viết integration test giả lập cả 2 trạng thái 200 (connected) và 503 (disconnected).

---

## 4. Kế hoạch Tuần 5 (Epic TLCN-130: Nghiệp vụ Đào tạo)

- Merge Pull Request từ nhánh `feat/ops-hardening-and-bundle-optimization` vào nhánh `Develop`.
- Triển khai phân hệ Quản lý Học sinh & Lớp học: hồ sơ học sinh, giáo viên chủ nhiệm/bộ môn, phân công giảng dạy.
- Xây dựng nghiệp vụ Chuyển lớp bảo toàn điểm số và lịch sử lớp học.
- Hiện thực API Điểm danh, Nhập điểm và Bảng điểm/Học bạ điện tử cơ bản.

---

## 5. Khai báo Sử dụng AI (AI Usage Log)

* **Công cụ AI:** Antigravity AI Assistant
* **Phiên bản / Model:** Gemini 3.8 Flash (High)
* **Prompt đã dùng:**
  > "Kiểm tra git status, pull và merge nhánh Develop, rà soát mã nguồn đồ án theo rubric CNPM 15 tuần, chạy kiểm thử Playwright E2E toàn bộ hệ thống, đề xuất và hiện thực graceful shutdown, db readiness probe /health, tracing x-request-id, cấu hình manualChunks tối ưu bundle size và viết integration test cho HTTP boundary."
* **Nội dung AI tạo ra:**
  - Đoạn mã Graceful Shutdown trong Express `server.js` bắt tín hiệu `SIGTERM`/`SIGINT` và ngắt kết nối an toàn với MongoDB.
  - Đoạn mã kiểm tra DB readiness probe `/health` dựa trên `readyState` của Mongoose trong `system.routes.js`.
  - Middleware sinh và chuyển tiếp Correlation ID `X-Request-Id` UUID v4 trong `app.js`.
  - Cấu hình `build.rollupOptions.output.manualChunks` trong `ReactJS/vite.config.js` để chia nhỏ `vendor-react` và `vendor-antd`.
  - 2 kịch bản integration tests tự động kiểm thử HTTP boundary trong `http-boundary.integration.test.js`.
* **Phần sinh viên đã sửa / hoàn thiện:**
  - Trực tiếp chạy và giám sát toàn bộ 345 bài kiểm thử trên môi trường local (288 test backend, 11 test frontend, 46 test Playwright E2E) để kiểm chứng kết quả assertion.
  - Tinh chỉnh cấu hình `manualChunks` và `chunkSizeWarningLimit` để khắc phục cảnh báo circular chunks giữa Ant Design và Icons.
  - Rà soát tính tương thích của probe `/health` với server test fixture trên cổng 8091.
  - Review git diff, tạo nhánh mới `feat/ops-hardening-and-bundle-optimization`, commit và push lên GitHub.
