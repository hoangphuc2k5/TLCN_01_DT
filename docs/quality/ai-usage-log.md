# NHẬT KÝ SỬ DỤNG AI & KIỂM SOÁT ĐẦU RA (AI USAGE LOG)
*Minh chứng đáp ứng Tiêu chí TC2.3 (Thang điểm 5) — Rubric Đồ án CNPM*

---

## 1. QUY TRÌNH KIỂM SOÁT ĐẦU RA AI (AI GOVERNANCE PROCESS)

Nhóm áp dụng quy trình kiểm soát 4 bước nghiêm ngặt trước khi đưa bất kỳ đoạn mã hoặc đề xuất nào của AI vào hệ thống:

```
[Prompt AI] ──> [Đối chiếu Tài liệu / Specs] ──> [Code Review & Sửa thủ công] ──> [Chạy Test & CI]
```

1. **Checklist Review:**
   * Không đưa thông tin nhạy cảm (Private Key, Password thật, Token thật) vào Prompt.
   * Kiểm tra giấy phép mã nguồn (License compliance): Chỉ sử dụng thư viện mã nguồn mở MIT, Apache 2.0, BSD; không sao chép code vi phạm bản quyền.
   * Rà soát đối chiếu tài liệu chính thức (Official Documentation: Mongoose 8.x, Express 4.x, React 18, Ant Design 5.x, Vite 5.x).
2. **Nguyên tắc làm chủ:**
   * Sinh viên là người trực tiếp chạy, giám sát và kiểm chứng kết quả assertion của từng bài kiểm thử.
   * Mọi đoạn mã AI tạo ra đều phải giải thích được bản chất và cơ chế hoạt động.

---

## 2. NHẬT KÝ SỬ DỤNG AI THEO TIẾN ĐỘ TUẦN

| Tuần | Công cụ / Model | Mục đích sử dụng | Phạm vi / Module | Phần do AI sinh | Phần sinh viên sửa & kiểm chứng | Commit liên quan |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **Tuần 4** | Antigravity AI (Gemini 3.8 Flash) | Thiết lập HTTP boundary hardening và tối ưu bundle | `server.js`, `system.routes.js`, `vite.config.js` | Khung Graceful shutdown, DB readiness probe, cấu hình `manualChunks` | Sửa cảnh báo circular chunk, kiểm tra probe `/health` trên cổng test, viết 2 integration tests | `9b51c3e` |
| **Tuần 5** | Antigravity AI (Gemini 3.8 Flash) | Liên thông tuyển sinh sang học sinh, import đề thi | `AdmissionsPage.jsx`, `ExamsPage.jsx`, `import.service.js` | Đoạn mã parser regex cho câu hỏi trắc nghiệm/tự luận, khung chuyển đổi hồ sơ | Viết unit test riêng cho parser, sửa lỗi snapshot route contract, thay thế prompt bằng Ant Design Modal | `31bb098`, `cf580e5` |
| **Tuần 6** | Antigravity AI (Gemini 3.8 Flash) | Cải tiến Dashboard Phụ huynh/Học sinh, đo Coverage | `DashboardPage.jsx`, `package.json` | Khung hiển thị bảng điểm và hóa đơn học phí trên Dashboard | Rà soát phân quyền theo vai trò (Student vs Parent), thêm quick shortcuts, bổ sung script `test:coverage` | `feat/TLCN-131-...` |

---

## 3. DANH SÁCH 5 LỖI / ẢO GIÁC CỦA AI ĐÃ TỰ PHÁT HIỆN VÀ SỬA (TC2.3 MỨC 5)

Dưới đây là 5 lỗi kỹ thuật thực tế do AI đề xuất không phù hợp hoặc sinh lỗi mà sinh viên đã phát hiện, phân tích nguyên nhân và trực tiếp sửa:

### Lỗi 1: Phụ thuộc vòng lặp khi bóc tách Chunks trong Vite Rollup
* **Ảo giác / Đề xuất sai của AI:** Khi tối ưu dung lượng frontend, AI cấu hình `manualChunks` tách riêng `@ant-design/icons` thành một chunk độc lập với `antd`. Điều này vi phạm cấu trúc gói của Ant Design, dẫn đến cảnh báo lỗi phụ thuộc vòng lặp (Circular Chunk Dependency) giữa hai file bundle.
* **Nguyên nhân kỹ thuật:** Các component trong `antd` sử dụng trực tiếp các icons nội bộ, trong khi các icons lại tham chiếu ngược lại token theme của `antd`.
* **Sinh viên phát hiện & Sửa lỗi:** Phát hiện cảnh báo đỏ khi chạy `npm run build`. Sinh viên đã tinh chỉnh cấu hình `manualChunks` trong `ReactJS/vite.config.js`, gộp chung `antd` và `@ant-design` vào cùng một chunk `vendor-antd` và nâng `chunkSizeWarningLimit: 1200`, giúp build sạch 100% không còn warning.
* **Commit đối chiếu:** `9b51c3e` (`feat(ops): add graceful shutdown, db readiness probe, request correlation and bundle chunking`).

---

### Lỗi 2: Lệch Hợp đồng Định tuyến API (Route Contract Snapshot Regression)
* **Ảo giác / Sơ suất của AI:** Khi hiện thực tính năng tải lên đề thi từ Excel/Word, AI đã khai báo 2 endpoint mới (`POST /import/exams/parse` và `POST /import/exams`) trong `import.routes.js` nhưng không cập nhật file snapshot kiểm thử hợp đồng `route-contract.fixture.json`.
* **Nguyên nhân kỹ thuật:** Dự án có bài test `route-contract.test.js` dùng để phát hiện mọi thay đổi route ngoài ý muốn. Do snapshot cũ không có 2 route mới, test báo lỗi `AssertionError: deepStrictEqual`.
* **Sinh viên phát hiện & Sửa lỗi:** Chạy `npm test` phát hiện 1 test thất bại (289/290). Sinh viên đã dùng lệnh script kiểm tra diff giữa `router.stack` và fixture, bổ sung chính xác 2 route vào `route-contract.fixture.json`, đưa bộ test về 100% Pass (290/290).
* **Commit đối chiếu:** `cf580e5` (`test(contracts): align route fixture with exam imports and add week 5 progress report`).

---

### Lỗi 3: Crash ứng dụng do sử dụng Transaction trên MongoDB Standalone
* **Ảo giác / Đề xuất sai của AI:** AI đề xuất sử dụng Mongoose `session.withTransaction` cho các nghiệp vụ Chuyển lớp và Ghi điểm số đồng thời, nhưng mặc định môi trường phát triển local chạy MongoDB ở chế độ Standalone.
* **Nguyên nhân kỹ thuật:** MongoDB chỉ hỗ trợ Multi-document ACID Transactions khi chạy ở chế độ **Replica Set**. Khi chạy standalone, MongoDB ném ngoại lệ nghiêm trọng: `Transaction numbers are only allowed on a replica set member or mongos`.
* **Sinh viên phát hiện & Sửa lỗi:** Sinh viên phát hiện lỗi khi chạy test tích hợp, đã bổ sung cơ chế kiểm tra `session.transaction.state` trong service transaction guard, trả về lỗi HTTP 503 có giải thích nếu thiếu replica set. Đồng thời, sinh viên viết cấu hình `docker-compose.yml` khởi tạo tự động MongoDB Replica Set 1 node (`rs0`) để phục vụ kiểm thử transaction mượt mà.
* **Commit đối chiếu:** `fca1cd4` (`fix(ux): add vnpay auto-polling, timetable range shortcuts and replica-set compose`).

---

### Lỗi 4: Sử dụng `window.prompt` gây lỗi trải nghiệm và treo kiểm thử E2E
* **Ảo giác / Đề xuất cẩu thả của AI:** Khi làm tính năng từ chối hồ sơ tuyển sinh hoặc hủy hồ sơ học sinh, AI dùng nhanh hàm trình duyệt nguyên thủy `window.prompt("Nhập lý do từ chối:")`.
* **Nguyên nhân kỹ thuật:** `window.prompt` là hàm chặn (blocking call), giao diện thô sơ, không tương thích với thiết bị di động, không hỗ trợ validation độ dài lý do và khiến kịch bản kiểm thử tự động Playwright E2E bị treo (timeout) do không có handler xử lý dialog native.
* **Sinh viên phát hiện & Sửa lỗi:** Sinh viên đã thay thế triệt để `window.prompt` bằng Modal chuẩn của Ant Design có Form TextArea, bắt buộc nhập lý do từ chối (bắt buộc tối thiểu 5 ký tự) và đóng gói state an toàn.
* **Commit đối chiếu:** `f1f9591` (`fix(ui): vietnamize admissions/documents, replace window.prompt with modal, require rejection note`).

---

### Lỗi 5: Lệch Selector Text giữa Test E2E và Giao diện sau khi Việt hóa
* **Ảo giác / Sai lệch của AI:** Khi viết các ca kiểm thử Playwright E2E cho phân hệ Tuyển sinh và Giáo án, AI sinh selector tìm nút bấm bằng tiếng Anh cứng (`getByRole('button', { name: 'Approve' })`, `Reject`), trong khi mã nguồn giao diện đã được sinh viên Việt hóa thành `"Phê duyệt"`, `"Từ chối"`.
* **Nguyên nhân kỹ thuật:** AI không đọc đồng bộ ngữ cảnh ngôn ngữ hiển thị trên component React dẫn đến mismatch selector trong Playwright.
* **Sinh viên phát hiện & Sửa lỗi:** Sinh viên rà soát failure trace của Playwright, chuẩn hóa lại toàn bộ `aria-label` và text selector trong các file E2E, bảo đảm 46/46 kịch bản Playwright E2E đều pass 100%.
* **Commit đối chiếu:** `4449652` (`fix(e2e): align modal titles and button aria labels with e2e test selectors`).
