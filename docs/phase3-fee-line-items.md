# Phase 3 - Học phí chia theo khoản

## Phạm vi

- Một hóa đơn có tối đa 50 khoản thu, gồm mã, tên, loại, mô tả, số lượng và đơn giá.
- Backend tự tính thành tiền từng khoản và tổng hóa đơn; không tin tổng tiền do client gửi lên.
- Khi thu một phần hoặc nhận thanh toán online, tiền được phân bổ lần lượt vào các khoản còn nợ.
- API danh sách trả trạng thái và số dư của từng khoản: `UNPAID`, `PARTIAL`, `PAID`.
- Giao diện cho phép thêm/xóa khoản khi lập hóa đơn và mở rộng từng dòng để xem chi tiết.
- Excel học phí xuất từng khoản thành một dòng, đồng thời giữ tổng tiền và tổng đã thu của hóa đơn.
- Hóa đơn cũ không có `lineItems` tiếp tục được đọc, thu tiền và xuất báo cáo bình thường.

## Cấu trúc

- `FeeInvoice` giữ snapshot khoản thu ngay trong hóa đơn để lịch sử không đổi khi danh mục bên ngoài thay đổi.
- `feeInvoiceAccounting` chịu trách nhiệm chuẩn hóa, tính tổng, phân bổ thanh toán và tạo trạng thái hiển thị. Cả thu tiền mặt và thanh toán online dùng chung dịch vụ này.

## Kiểm thử

- Backend kiểm tra tổng tiền do server tính, phân bổ thu một phần, trạng thái/số dư từng khoản, dữ liệu không hợp lệ và nội dung Excel.
- Bộ thanh toán online được chạy cùng để kiểm tra luồng cũ không bị ảnh hưởng.
- Frontend có Playwright cho luồng lập và xem hóa đơn hai khoản; production build kiểm tra biên dịch.

Kết quả cuối và mã commit/CI được ghi trong `implementation-progress.md` sau khi nhánh được gộp.
