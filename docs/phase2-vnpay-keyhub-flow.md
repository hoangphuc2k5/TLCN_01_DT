# Luồng VNPay theo KeyhubStore

> Trạng thái: đã hoàn tác trên nhánh `feat/vnpay-new-sandbox-terminal` theo yêu cầu khôi phục luồng Return frontend. Tài liệu này được giữ lại để đối chiếu lịch sử triển khai.

Ngày thực hiện: 13/09/2026. Nhánh tính năng: `feat/vnpay-keyhub-flow`; nhánh tích hợp: `integration/phase3`.

## Thay đổi

- Giữ hành vi nút thanh toán chuyển cùng tab thẳng đến URL VNPay như `CheckoutPage.jsx` của KeyhubStore.
- Đồng bộ cấu trúc yêu cầu PAY: `vnp_OrderInfo` dùng mã giao dịch, HMAC SHA-512 trên các trường `vnp_*` đã sắp xếp và form-encode, sau đó thêm `vnp_SecureHash` và `vnp_SecureHashType=SHA512`.
- Đổi Return URL về backend `/v1/api/online-payments/vnpay/return`. Với request trình duyệt, backend xác thực callback rồi redirect sang trang kết quả của frontend, giống cách controller KeyhubStore điều hướng sau thanh toán.
- Giữ mã giao dịch duy nhất, kiểm tra tenant/hóa đơn/số tiền, IPN và transaction idempotent của dự án. Return chỉ đọc trạng thái; IPN vẫn là nguồn cập nhật thanh toán để không tạo phiếu thu trùng.
- Cập nhật fixture local để Return đi qua đúng cổng API tạm và chuyển về đúng cổng frontend fixture.

## Cấu hình local

```dotenv
FRONTEND_URL=http://localhost:5173
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_TMN_CODE=<terminal sandbox>
VNPAY_HASH_SECRET=<secret sandbox>
VNPAY_RETURN_URL=http://localhost:8080/v1/api/online-payments/vnpay/return
```

Thông tin thật chỉ nằm trong `ExpressJS/.env` đã Git-ignore. Sau khi đổi cấu hình phải khởi động lại backend.

## Giới hạn môi trường ngoài

Việc đồng bộ request và redirect không thay đổi trạng thái terminal trên hệ thống VNPay. Trước khi sửa, cả URL do dự án hiện tại tạo và URL tạo đúng theo mã nguồn KeyhubStore đều được sandbox chuyển tới `Payment/Error.html?code=71`. Cần VNPay kích hoạt terminal sandbox trước khi có thể vào màn hình chọn ngân hàng/thẻ.

## Kiểm thử

- Test checkout xác nhận `vnp_OrderInfo`, `vnp_SecureHashType`, checksum và Return URL backend.
- Test callback với `Accept: text/html` xác nhận backend trả `302` đến đúng frontend và giữ nguyên tham số có chữ ký.
- Các test IPN tiếp tục kiểm tra chữ ký, merchant, số tiền, callback lặp/đồng thời và chỉ ghi nhận hóa đơn đúng một lần.
- Backend thanh toán: **12/12 đạt**. Hồi quy backend: **253/253 đạt**.
- Frontend unit/policy: **11/11 đạt**. Production build đạt; còn cảnh báo bundle chính lớn hơn 500 kB.
- Playwright E2E thanh toán: **2/2 đạt** trên MongoDB tạm và Vite proxy.
- Gọi sandbox bằng URL mới xác nhận có 14 tham số, `vnp_SecureHashType=SHA512` và Return URL backend; VNPay vẫn trả HTTP 200 tại `Payment/Error.html?code=71`.
