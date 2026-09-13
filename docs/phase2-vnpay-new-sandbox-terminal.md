# VNPay sandbox — terminal mới và khôi phục luồng Return cũ

Ngày thực hiện: 13/09/2026. Nhánh tính năng: `feat/vnpay-new-sandbox-terminal`; nhánh tích hợp: `integration/phase3`.

## Thay đổi

- Khôi phục adapter VNPay trước lần đồng bộ KeyhubStore: `vnp_OrderInfo` mô tả thanh toán học phí, có `vnp_ExpireDate`, checksum HMAC SHA-512 và Return URL do server quản lý.
- Khôi phục Return URL về trang frontend `/payments/vnpay-return`. Trang này gọi API backend để xác thực chữ ký và đọc trạng thái giao dịch.
- Giữ IPN công khai `/v1/api/online-payments/vnpay/ipn` làm nguồn cập nhật hóa đơn. IPN kiểm tra chữ ký, terminal, số tiền và trạng thái, sau đó ghi nhận bằng transaction idempotent.
- Thay terminal và hash secret sandbox mới trong `ExpressJS/.env` local. Secret không được commit vào Git, log hoặc tài liệu.
- Fixture sandbox tiếp tục dùng MongoDB tạm và dữ liệu giả; khi chạy chế độ sandbox, fixture chỉ đọc thông tin VNPay từ `.env`.

## Cấu hình

```dotenv
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_TMN_CODE=<terminal sandbox mới>
VNPAY_HASH_SECRET=<secret sandbox mới>
VNPAY_RETURN_URL=http://localhost:5173/payments/vnpay-return
```

Khi triển khai, Return URL phải dùng domain frontend thực tế. IPN phải là HTTPS công khai và được gửi cho VNPay theo dạng:

```text
https://<api-domain>/v1/api/online-payments/vnpay/ipn
```

## Kiểm thử

- Backend payment kiểm tra URL checkout, checksum, GMT+7, expiry, Return chỉ đọc và IPN ghi nhận đúng một lần.
- Playwright kiểm tra nút thanh toán chuyển cùng tab sang sandbox và luồng Return → IPN → hóa đơn đã thanh toán trên fixture local.
- Kiểm tra sandbox thật chỉ dùng hóa đơn thử 10.000 VND, không dùng dữ liệu học sinh hoặc hóa đơn thật.

## Kết quả sandbox thật

- URL checkout có terminal mới, expiry và Return URL frontend đúng cấu hình.
- Chromium được chuyển tới `/paymentv2/Transaction/PaymentMethod.html` và hiển thị màn hình **Chọn phương thức thanh toán (Test)**.
- Không còn lỗi `code=71` hoặc màn hình không tìm thấy website. Terminal sandbox mới đã có thể dùng để thử bước chọn ngân hàng và thẻ NCB.
- Backend payment: **11/11 đạt**. Hồi quy backend: **252/252 đạt**.
- Frontend unit/policy: **11/11 đạt**. Production build đạt; còn cảnh báo bundle chính lớn hơn 500 kB.
- Playwright E2E thanh toán: **2/2 đạt** trên MongoDB tạm và Vite proxy.
