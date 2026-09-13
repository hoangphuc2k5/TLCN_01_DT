# QR thanh toán VNPay

Nhánh: `feat/vnpay-checkout-qr` (tạo từ `integration/phase3`).

- Hộp thoại thanh toán học phí hiển thị QR SVG tạo trực tiếp trên trình duyệt từ `checkoutUrl` đã được backend ký.
- Người trả quét mã để mở trang checkout VNPay rồi chọn ngân hàng/phương thức được VNPay hỗ trợ. QR này mã hóa URL checkout; không giả lập QR chuyển khoản ngân hàng và không gửi URL giao dịch qua dịch vụ tạo mã QR bên thứ ba.
- Giữ liên kết mở checkout trong tab mới để dùng khi không quét được QR.
- Bổ sung Playwright E2E xác nhận QR SVG và liên kết checkout vẫn trỏ đến VNPay sandbox.

Kiểm thử:

- `ReactJS/npm test`: **11/11 đạt**.
- `ReactJS/npm run build`: đạt; còn cảnh báo bundle JavaScript lớn hơn 500 kB đã có trước tính năng này.
- `ReactJS/npx playwright test e2e/phase2-online-payments.spec.js`: **2/2 đạt** trên fixture local; bao gồm QR SVG, URL sandbox, luồng IPN và từ chối Return sai chữ ký.

QR được sinh cục bộ bằng thành phần `QRCode` có sẵn trong Ant Design; không thêm dependency.
