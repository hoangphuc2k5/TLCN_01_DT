# Phase 4 — báo cáo đối chiếu liên trường

## Bản sửa hoàn thiện — fix/school-comparison-complete

- Sửa lỗi ghi đè `_id`: giao điều kiện schoolScope với danh sách trường được chọn trên cả JSON/XLSX/PDF. Test từ chối school admin và cluster admin chọn trường ngoài phạm vi.
- Bộ lọc `academicYear` dùng tên năm học chung và ánh xạ sang ID riêng từng trường; từ chối nếu một trường không có năm này. Lọc lớp, điểm, hóa đơn theo năm; điểm danh theo khoảng ngày của năm mỗi trường.
- `semester=1|2` chỉ áp dụng bảng điểm. `fromDate/toDate=YYYY-MM-DD` áp dụng ngày điểm danh và hạn hóa đơn theo UTC+7, bao gồm toàn bộ ngày kết thúc. Kiểm tra ngày sai/khoảng đảo ngược.
- Nhân sự là số đang hoạt động hiện tại; điểm trung bình tính trên bảng điểm, giữ nguyên điểm 0. Tỷ lệ có mặt = PRESENT/tổng lượt; vắng và đi muộn riêng. Tiền đã thu là tổng hiện tại của hóa đơn được chọn, không phải dòng tiền trong kỳ.
- Excel có đủ chỉ số và sheet PhamVi; PDF thay bộ ghi tay bằng PDFKit, nhúng Noto Sans (OFL đi kèm), đầy đủ tiếng Việt và chỉ số, mỗi trường một trang với nhãn phạm vi.
- UI gửi cùng bộ lọc khi xem/xuất, xóa kết quả cũ khi đổi lọc, khóa thao tác khi chờ, hiển thị lỗi tải. JSON lỗi dạng Blob không còn bị tải nhầm thành file Excel/PDF.
- QA PDF: tạo mẫu 20 trường để kiểm tra phân trang; render và xem lại PDF tiếng Việt sau sửa mã hóa. Artifact kiểm tra nằm trong tmp/pdfs, không đưa vào Git.
- Kiểm thử mới: platform-hardening 5/5; frontend policy 11/11; kiểm thử UI riêng dùng phản hồi báo cáo có kiểm soát, backend dùng MongoDB local thật. Kết quả regression cuối ghi ở implementation-progress.md.

## Phạm vi

Hoàn thiện mục báo cáo so sánh trong đặc tả: bổ sung dữ liệu điểm danh và cho phép cụm trường tải báo cáo dạng Excel hoặc PDF.

## Thay đổi

- `schoolComparisonService.compare` tổng hợp thêm tổng bản ghi điểm danh, số lượt có mặt/vắng và tỷ lệ có mặt theo từng trường.
- Thêm `GET /v1/api/reports/schools/compare/export.xlsx` và `GET /v1/api/reports/schools/compare/export.pdf`; cả hai dùng cùng kiểm tra phạm vi cụm trường với báo cáo JSON.
- Màn hình `SchoolComparisonPage` hiển thị tỷ lệ có mặt và có nút xuất Excel/PDF.

## Kiểm thử

- Backend riêng `platform-hardening.test.js`: **3/3**.
- Frontend policy: **11/11**; Vite production build đạt.
- Kiểm thử xác nhận dữ liệu attendance, file XLSX đọc được và PDF có header `%PDF-`.

## Giới hạn môi trường

Kiểm thử dùng MongoDB Memory ReplSet local; dữ liệu chỉ tính trên các bản ghi điểm danh đã lưu trong hệ thống.
