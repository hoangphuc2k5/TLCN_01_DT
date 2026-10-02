# Điều hướng trực tiếp sang VNPay

Nhánh `feat/vnpay-direct-redirect`, tách từ `integration/phase3`.

Khi người dùng nhấn **Thanh toán VNPay**, giao diện tạo giao dịch qua API. Nếu API trả về URL checkout hợp lệ, trình duyệt điều hướng URL đó ngay trong cùng tab bằng `window.location.assign`. Bỏ hộp thoại QR để không cần thêm thao tác mở cổng thanh toán.

Playwright kiểm tra điều hướng bằng cách giả lập trang `sandbox.vnpayment.vn` cục bộ. E2E tiếp tục kiểm tra URL có `vnp_TmnCode`, xác nhận IPN ký hợp lệ và từ chối Return sai chữ ký; không gửi giao dịch hoặc dữ liệu thẻ thật lên VNPay.

Kiểm thử trên nhánh:

- `ReactJS/npm test`: **11/11 đạt**.
- `ReactJS/npm run build`: đạt; Vite còn cảnh báo bundle JavaScript chính lớn hơn 500 kB.
- Playwright payment E2E: **2/2 đạt** trên fixture MongoDB cục bộ, dùng cổng tạm 8093/5178 vì các cổng E2E mặc định đang có dịch vụ local lắng nghe.

Điều hướng sang trang thanh toán không đồng nghĩa giao dịch sandbox đã được chấp nhận. Terminal hiện vẫn trả `code=71` (chưa được VNPay duyệt); VNPay cần duyệt terminal trước khi người dùng có thể chọn phương thức thanh toán.
