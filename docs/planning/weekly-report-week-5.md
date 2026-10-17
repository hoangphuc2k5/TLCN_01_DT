# Báo cáo Tiến độ Tuần 5 — Đồ án EduMoet (TLCN)

* **Học kỳ / Năm học:** Học kỳ 1 (2026 – 2027)
* **Thời gian thực hiện:** 12/10/2026 – 18/10/2026 (Ngày bắt đầu tuần 1: 16/09/2026)
* **Epic thực hiện:** TLCN-130 — Nghiệp vụ Đào tạo & Liên thông Dữ liệu Học vụ
* **Nhánh Git:** `feat/ops-hardening-and-bundle-optimization` (chuẩn bị merge vào `Develop`)

---

## 1. Mục tiêu Tuần 5

- Hiện thực hóa luồng liên thông dữ liệu học vụ: chuyển đổi hồ sơ tuyển sinh trúng tuyển sang tài khoản học sinh chính thức.
- Tự động hóa đồng bộ điểm số bài tập trực tuyến vào sổ điểm và ma trận điểm lớp học (GPA Summary Matrix).
- Cung cấp tính năng gợi ý điểm danh thông minh theo Thời khóa biểu tuần để tối ưu thao tác cho giáo viên.
- Mở rộng phân hệ Khảo thí: hỗ trợ nhập hàng loạt ngân hàng câu hỏi và đề thi từ file Excel (.xlsx) và văn bản Word (.docx/txt).
- Chuẩn hóa toàn bộ trải nghiệm người dùng (UX), modal thao tác, nhãn điều hướng và thông báo tiếng Việt.
- Bảo đảm 100% kiểm thử hồi quy (regression) và hợp đồng định tuyến API (Route Contract) đều đạt chuẩn.

---

## 2. Kết quả công việc đã hoàn thành

### a. Liên thông Tuyển sinh sang Hồ sơ Học sinh (Student Enrollment Flow)
- **Quy trình nhập học tự động:** Bổ sung tính năng chuyển trạng thái hồ sơ tuyển sinh từ trúng tuyển (`APPROVED`) sang học sinh chính thức.
- **Tạo tài khoản & Phân lớp:** Tự động tạo bản ghi người dùng với vai trò `STUDENT`, cấp mã học sinh (`studentCode`), liên kết thông tin phụ huynh (`parent`), gắn vào lớp học tiếp nhận và lưu lịch sử nhập học trong audit log.
- **Bảo toàn dữ liệu tuyển sinh:** Giữ nguyên hồ sơ ứng tuyển gốc để đối chiếu khi cần và ngăn chặn tạo trùng lặp học sinh cho cùng một hồ sơ.

### b. Đồng bộ Điểm Bài tập Online & Ma trận GPA Lớp học
- **Đồng bộ điểm tự động:** Xây dựng cơ chế liên kết điểm bài tập trực tuyến (`HomeworkSubmission`) đã chấm sang sổ điểm thành phần của lớp học theo đúng môn học và học kỳ.
- **Ma trận tổng hợp GPA:** Bổ sung bảng tổng hợp điểm trung bình môn, điểm tích lũy học kỳ và phân loại học lực (Giỏi, Khá, Trung bình, Yếu) cho từng lớp học, phục vụ công tác đánh giá của giáo viên chủ nhiệm và ban giám hiệu.
- **Lọc điểm linh hoạt:** Cung cấp bộ lọc theo lớp, môn học, học kỳ và trạng thái nhập điểm trên giao diện quản lý điểm.

### c. Gợi ý Điểm danh Thông minh theo Thời khóa biểu
- **Smart Attendance Suggestion:** Tự động đối chiếu Thời khóa biểu tuần hiện tại của giáo viên/lớp học với ngày giờ thực tế để gợi ý nhanh môn học và tiết học cần điểm danh.
- **Tối ưu trải nghiệm:** Giáo viên chỉ cần một thao tác bấm để nạp sẵn danh sách học sinh theo lớp và tiết tương ứng, tránh việc phải chọn thủ công nhiều cấp dropdown.

### d. Import Ngân hàng Câu hỏi & Đề thi từ Excel / Word
- **API Import chuyên dụng:** Xây dựng 2 endpoint mới `POST /import/exams/parse` và `POST /import/exams` cho phép kiểm tra trước (preview) và nhập chính thức dữ liệu đề thi.
- **Parser đa định dạng:** Phát triển bộ tách câu hỏi (`exam-parser.js`) hỗ trợ các cú pháp câu hỏi tiếng Việt phổ biến, tự động bóc tách câu hỏi trắc nghiệm, các lựa chọn (A, B, C, D), đáp án đúng và câu hỏi tự luận.
- **Giao diện Import trực quan:** Tích hợp nút nhập file, khu vực xem trước câu hỏi đã parse, kiểm tra lỗi cú pháp trước khi lưu vào ngân hàng đề thi.

### e. Chuẩn hóa UX, Giao diện & Việt hóa Toàn diện
- **Loại bỏ hộp thoại nguyên thủy:** Thay thế toàn bộ các lệnh `window.prompt` bằng Modal chuẩn Ant Design (bắt buộc nhập lý do khi từ chối hồ sơ tuyển sinh hoặc hủy tài liệu).
- **Thu phí gom theo lớp:** Cho phép kế toán chọn nhanh toàn bộ học sinh của một lớp để tạo đợt thu học phí hàng loạt.
- **VNPay Auto-polling:** Bổ sung cơ chế tự động thăm dò trạng thái giao diện thanh toán VNPay để cập nhật tức thì khi có kết quả từ cổng thanh toán.

### f. Kiểm thử tự động hóa toàn diện (Full Test Suite)
- Khắc phục độ lệch hợp đồng định tuyến trong `route-contract.fixture.json` cho 2 endpoint import đề thi mới.
- Kết quả kiểm thử toàn diện:
  * **Backend Tests:** 290 / 290 tests PASSED (100%).
  * **Frontend Unit Tests:** 13 / 13 tests PASSED (100%).
  * **Frontend Production Build:** 100% thành công, 0 lỗi, 0 warning (Main bundle 91.58 kB).
  * **Tổng cộng kiểm thử tự động:** 303 / 303 bài kiểm thử unit & integration đạt kết quả tuyệt đối.

---

## 3. Khó khăn gặp phải & Giải pháp xử lý

- **Khó khăn 1:** Khi bổ sung 2 endpoint mới cho import đề thi (`/import/exams/parse`, `/import/exams`), bài test hợp đồng định tuyến `route-contract.test.js` báo lỗi do snapshot fixture cũ chưa cập nhật.
  * **Giải pháp:** Đối chiếu diff giữa danh sách routes thực tế trên `api.routes.js` và `route-contract.fixture.json`, bổ sung chính xác 2 route vào fixture để bảo đảm kiểm soát hợp đồng API chặt chẽ.
- **Khó khăn 2:** Cú pháp đề thi trong file Word/Text thực tế tại các trường học rất đa dạng (ví dụ: `Câu 1.`, `Câu 1:`, `1.`, `A.`, `A/`,... kèm khoảng trắng ngắt dòng).
  * **Giải pháp:** Thiết kế bộ regex parser linh hoạt với cơ chế chuẩn hóa khoảng trắng và xử lý lỗi mềm (graceful fallback), đồng thời bổ sung 2 kịch bản unit test riêng cho parser trong `parse-exam-text.test.js` để đảm bảo độ tin cậy.

---

## 4. Kế hoạch Tuần 6 (Epic TLCN-130: Dạy học trực tuyến nâng cao & Khởi động Staging)

- Merge nhánh `feat/ops-hardening-and-bundle-optimization` (9 commits) vào nhánh `Develop` trên GitHub.
- Kiểm tra toàn diện vòng đời thi trực tuyến: giới hạn thời lượng server, đếm ngược tự nộp bài, chống gian lận nộp muộn và trộn câu hỏi ngẫu nhiên theo lượt thi.
- Kiểm thử luồng nộp bài tập đính kèm đa file (`FileAsset`) và quy trình duyệt giáo án điện tử có lưu lịch sử revision.
- Khởi động kiểm thử môi trường Preview / Staging tự động qua Docker Compose và GitHub Actions theo cam kết tiêu chí Mức 5.
- Lập danh sách ứng viên UAT ($\ge 10$ người dùng mục tiêu) và chuẩn bị kịch bản đo độ hoàn thành nhiệm vụ và chỉ số SUS.

---

## 5. Khai báo Sử dụng AI (AI Usage Log)

* **Công cụ AI:** Antigravity AI Assistant
* **Phiên bản / Model:** Gemini 3.8 Flash (High)
* **Prompt đã dùng:**
  > "Đọc toàn bộ dự án, đọc cả plan, đánh giá hiện trạng và đề xuất việc cần làm tiếp theo; khắc phục lỗi route contract test cho import đề thi và lập báo cáo tuần 5 chuẩn theo rubric CNPM 15 tuần."
* **Nội dung AI tạo ra:**
  - Cập nhật file snapshot hợp đồng định tuyến `ExpressJS/src/tests/common/contracts/route-contract.fixture.json` bổ sung 2 endpoint import đề thi.
  - Tổng hợp và soạn thảo báo cáo tiến độ Tuần 5 trong `docs/planning/weekly-report-week-5.md` phản ánh đầy đủ 9 commits đã hoàn thành trong tuần.
* **Phần sinh viên đã sửa / hoàn thiện:**
  - Rà soát toàn bộ kết quả chạy test của backend (290/290 tests) và frontend build.
  - Kiểm tra tính chính xác của các số liệu tiến độ, đối chiếu với backlog Jira Epic TLCN-130.
  - Chuẩn bị merge code vào nhánh `Develop`.
