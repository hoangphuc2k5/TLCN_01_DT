# Phase 4 — báo cáo đối chiếu liên trường

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
