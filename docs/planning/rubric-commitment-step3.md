# BẢN CAM KẾT SẢN PHẨM CUỐI CÙNG VÀ BỘ METRIC ĐÁNH GIÁ (BƯỚC 3)
*Quy chuẩn theo Rubric Đồ án Công nghệ Phần mềm — Bộ môn Công nghệ Phần mềm*

---

## 1. THÔNG TIN CHUNG

* **Tên đề tài:** Hệ thống Quản lý Trường học Đa trường (EduMoet — Multi-tenant School Management System)
* **Chuyên ngành:** Công nghệ Phần mềm — Khoa Công nghệ Thông tin
* **Học kỳ / Năm học:** Học kỳ 1 (2026 – 2027)
* **Thời điểm xác lập:** Tuần 5 — Trước mốc 50% thời gian thực hiện (Đáp ứng Quy tắc chặn G1)
* **Sinh viên thực hiện:** 
* **Giảng viên hướng dẫn:** 

---

## 2. CAM KẾT PHẠM VI SẢN PHẨM (SCOPE COMMITMENT)

### 2.1. Phạm vi cam kết chính thức (In-Scope — Mức `MUST` — Đánh giá TC2.2)
Toàn bộ các phân hệ dưới đây được cam kết hoàn thiện 100% chức năng, hoạt động ổn định và demo không lỗi:

1. **Nền tảng Đa trường (Multi-tenancy) & Phân quyền (RBAC):**
   * Cô lập dữ liệu 3 cấp (`GLOBAL` $\rightarrow$ `CLUSTER` $\rightarrow$ `SCHOOL`), triệt tiêu 100% rủi ro truy cập chéo dữ liệu giữa các trường.
   * Phân quyền phân cấp Level 0–60 (Super Admin $\rightarrow$ Cluster Admin $\rightarrow$ School Admin $\rightarrow$ Giáo viên $\rightarrow$ Kế toán $\rightarrow$ Thư viện $\rightarrow$ Học sinh $\rightarrow$ Phụ huynh).
   * Phiên làm việc JWT an toàn, thu hồi phiên tức thì (`sessionVersion`), chống tấn công brute-force.

2. **Quản lý Đào tạo & Hồ sơ Học sinh:**
   * Hồ sơ học sinh, giáo viên, phân lớp, phân công giảng dạy.
   * Quy trình liên thông Tuyển sinh trực tuyến $\rightarrow$ Nhập học $\rightarrow$ Cấp tài khoản học sinh tự động.
   * Nghiệp vụ Chuyển lớp bảo toàn điểm số bằng Transaction MongoDB Replica Set.
   * Xuất học bạ điện tử, chứng nhận học tập định dạng PDF phân trang và DOCX Unicode chuẩn.

3. **Khảo thí & Dạy học trực tuyến:**
   * Điểm danh học sinh, gợi ý điểm danh thông minh theo Thời khóa biểu tuần.
   * Sổ điểm điện tử, ma trận điểm GPA tổng hợp lớp học, đồng bộ điểm bài tập tự động vào bảng điểm.
   * Bài tập trực tuyến (Homework lifecycle): giao bài, nộp bài đính kèm đa file (`FileAsset`), chấm điểm và nhận xét.
   * Thi trực tuyến (Online Exam): ngân hàng đề thi import từ Excel/Word, trộn thứ tự câu hỏi theo lượt làm bài, đồng hồ đếm ngược, lưu nháp tự động và tự động nộp bài khi hết giờ.
   * Soạn thảo và quy trình duyệt giáo án điện tử có lưu vết lịch sử (Revisions & Audit).

4. **Vận hành Trường học & Tài chính:**
   * Quản lý khoản thu, phát hành hóa đơn gom theo lớp học, nhắc nợ học phí.
   * Tích hợp thanh toán trực tuyến qua cổng VNPay có tự động polling và đối soát biên lai.
   * Sổ liên lạc điện tử định kỳ, quản lý sinh hoạt lớp, đăng ký họp phụ huynh.
   * Lịch nghỉ phép và lịch dạy bù tự động phản ánh vào Thời khóa biểu tuần.

### 2.2. Phạm vi mở rộng / Ngoại vi (Out-of-Scope / `SHOULD/COULD`)
Các thành phần dưới đây thuộc diện nâng cao hoặc phụ thuộc bên thứ ba (được đánh giá ở mức điểm thưởng nếu có):
* Thanh toán VNPay trên Merchant Production thực tế (cam kết hoàn thành ở mức Sandbox/Testnet).
* Tích hợp SMS Brandname / Zalo ZNS (sử dụng Adapter thông báo nội bộ qua SSE và Email).
* Đồng bộ Single Sign-On (SSO) doanh nghiệp ngoài Google Sign-In.

---

## 3. BỘ 5 KPI NGHIỆP VỤ ĐỊNH LƯỢNG (CAM KẾT ĐO LƯỜNG TẠI UAT — TC1 & TC2.7)

Các KPI này được chốt cố định tại Bước 3 và được đo lường thực tế với người dùng:

| STT | KPI Nghiệp vụ | Chỉ số mục tiêu | Phương pháp đo lường |
| :---: | :--- | :---: | :--- |
| **KPI 1** | Tỉ lệ giáo viên tạo lớp, soạn giáo án và giao bài tập thành công theo kịch bản | **$\ge 95\%$** | Đo trên kịch bản tác vụ UAT của giáo viên |
| **KPI 2** | Tỉ lệ học sinh làm bài thi trực tuyến và nộp file bài tập thành công đúng hạn | **$\ge 95\%$** | Ghi nhận tự động qua hệ thống Exam & Homework |
| **KPI 3** | Tỉ lệ phụ huynh xem đúng điểm, chuyên cần và thanh toán học phí thành công | **$\ge 90\%$** | Đo lường trên nhóm thử nghiệm $\ge 10$ phụ huynh |
| **KPI 4** | Độ chính xác của quy trình chuyển lớp bảo toàn điểm số và liên thông tuyển sinh | **$100\%$** | Kiểm chứng bằng 100% bài test tích hợp Transaction |
| **KPI 5** | Mức độ hài lòng của người dùng thực tế theo thang đo chuẩn hóa SUS (System Usability Scale) | **$\ge 80 / 100$** | Phiếu khảo sát 10 câu hỏi chuẩn hóa SUS sau UAT |

---

## 4. BỘ YÊU CẦU PHI CHỨC NĂNG CÓ RÀNG BUỘC ĐỊNH LƯỢNG (NFRs — TC2.1)

1. **Thời gian phản hồi API (Latency):** Thời gian phản hồi trung bình cho các thao tác đọc/ghi thông thường $\le 200\text{ ms}$ trên 95% số request.
2. **Tối ưu hóa Đóng gói Frontend (Bundle Size):** Dung lượng file JavaScript chính sau khi build $\le 100\text{ kB}$ (thực tế hiện tại đạt **91.58 kB**, tách vendor React và Ant Design).
3. **Thời gian Build Production:** Quá trình đóng gói toàn bộ ứng dụng frontend hoàn thành trong $\le 30\text{ giây}$.
4. **Độ phủ Kiểm thử (Test Coverage):** Độ phủ dòng lệnh (Line Coverage) trên các mô-đun nghiệp vụ cốt lõi đạt **$\ge 70\%$**.
5. **Độ tin cậy của Pipeline CI:** Tỉ lệ build xanh (Pass rate) trên GitHub Actions đạt **$\ge 90\%$**; 100% test pass ở lần chạy kiểm thử nghiệm thu.

---

## 5. KÝ TÊN XÁC NHẬN CAM KẾT

*Bản cam kết này được lập thành 02 bản có giá trị như nhau, sinh viên và giảng viên hướng dẫn mỗi bên giữ 01 bản để làm căn cứ chấm điểm đồ án tại hội đồng bảo vệ.*

*Ngày ...... tháng 10 năm 2026*

| GIẢNG VIÊN HƯỚNG DẪN | SINH VIÊN THỰC HIỆN |
| :---: | :---: |
| *(Ký và ghi rõ họ tên)* | *(Ký và ghi rõ họ tên)* |
| <br><br><br> | <br><br><br> |
