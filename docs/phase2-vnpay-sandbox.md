# VNPay sandbox — tích hợp và kiểm thử

Ngày kiểm tra: 09/09/2026. Nhánh tính năng: `feat/phase2-vnpay-sandbox`; nhánh tổng hợp: `integration/phase2`.

## Thay đổi

- Tách adapter VNPay khỏi gateway factory. URL thanh toán dùng HMAC SHA-512, số tiền VND nhân 100, mã giao dịch chữ/số, giờ GMT+7, thời gian hết hạn và IP khách hàng lấy từ Express. Return URL lấy từ cấu hình server.
- Trang học phí có nút **Thanh toán VNPay**, số tiền, link mở cổng và trạng thái đang tạo giao dịch. Sửa chữ tiếng Việt bị lỗi ở hộp thanh toán.
- `GET /v1/api/online-payments/vnpay/ipn`: callback công khai, kiểm tra chữ ký, mã website, số tiền, mã đơn và cả response code/transaction status. Trả trực tiếp JSON `RspCode`/`Message` theo giao thức VNPay.
- `GET /v1/api/online-payments/vnpay/return`: xác thực kết quả và đọc trạng thái đã lưu, không thu tiền. Trang `/payments/vnpay-return` hiển thị đã ghi nhận/chờ xác nhận/thất bại và cho kiểm tra lại. Return sai chữ ký không xóa phiên đăng nhập đang có.
- IPN dùng transaction để ghi OnlinePayment, Payment và hóa đơn; callback đồng thời/lặp chỉ tạo một phiếu thu. Nếu hóa đơn đã được thu bằng cách khác, transaction rollback, IPN trả `99` để cần đối soát.
- Thu tiền mặt/chuyển khoản cũng dùng transaction, kiểm tra dư nợ để tránh đua dữ liệu với IPN. Không cho ghi tay phiếu thu `ONLINE`. Các thao tác thu tiền cần MongoDB replica set.
- Chặn MOCK ngoài môi trường test/development. Ràng buộc request id với hóa đơn/provider.
- Rà soát lại sửa đổi CSVC ở lần tổng hợp trước: bỏ truy vấn không có tenant chỉ để phân biệt 403/404; trường ngoài phạm vi trả 404. Test riêng vai trò không có quyền vẫn nhận 403.
- `npm test` backend mặc định chạy các file tuần tự để tránh nhiều MongoMemoryServer khởi động cùng lúc trên máy phát triển. Các ca concurrency trong từng file vẫn chạy như thiết kế.

## Cấu hình local

Đã lưu mã terminal và khóa được cung cấp vào `ExpressJS/.env` (Git ignore). Không đưa checksum secret vào mã nguồn, tài liệu hoặc fixture. `.env.example` chỉ có trường cấu hình rỗng.

```dotenv
VNPAY_TMN_CODE=<terminal sandbox>
VNPAY_HASH_SECRET=<secret sandbox>
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:5173/payments/vnpay-return
PAYMENT_DEFAULT_PROVIDER=VNPAY
ONLINE_PAYMENT_TTL_MS=900000
```

Khởi động lại backend sau khi đổi cấu hình. Khi dùng domain/tunnel, đổi `VNPAY_RETURN_URL` sang URL frontend tương ứng. Với proxy, `req.ip` hiện là IP kết nối trực tiếp; chỉ cấu hình trust proxy theo topology được triển khai để lấy IP khách hàng từ proxy tin cậy.

Đăng ký với VNPay một IPN URL **HTTPS công khai** dạng `https://<api-domain>/v1/api/online-payments/vnpay/ipn`. VNPay gọi trực tiếp URL này, không có JWT. Không dùng địa chỉ localhost cho IPN. Chỉ có Return URL mà chưa đăng ký IPN thì trang kết quả vẫn chờ xác nhận và hóa đơn chưa được ghi nhận.

## Kết quả gọi sandbox thật

Đã tạo URL có chữ ký từ cấu hình local và gửi GET tới sandbox, số tiền kiểm tra 10.000 VND, không gửi dữ liệu học sinh hay ghi hóa đơn thật. VNPay trả HTTP 200 nhưng chuyển sang `/paymentv2/Payment/Error.html?code=71`, nội dung **“The terminal (website) not approved”**. Terminal `TL083WJX` hiện chưa được VNPay duyệt.

Vì vậy chưa thể xác nhận giao dịch ngân hàng/OTP/IPN thật thành công. Cần duyệt terminal và đăng ký IPN HTTPS, sau đó kiểm thử lại cả thanh toán thành công, hủy, quay về trước IPN và đối soát. Test tự động dùng terminal/secret giả độc lập, không gọi VNPay hoặc Atlas.

Nguồn giao thức: [Hướng dẫn PAY chính thức của VNPay](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html).

## Kiểm thử

- Test backend thanh toán: 11/11 đạt, gồm checkout encoding/time/expiry, return chỉ đọc, IPN lặp/đồng thời, chữ ký sai, query trùng, sai merchant/amount/reference, hủy/thất bại, rollback khi đã thu, thu tay đồng thời, request id sai hóa đơn và cấu hình thiếu.
- Hồi quy backend `npm test`: **231/231 đạt**; frontend **10/10 đạt**; build thành công (còn cảnh báo bundle lớn).
- Playwright chạy riêng với fixture sạch: **39/39 đạt**, 0 flaky/skipped. Có luồng UI tạo checkout → Return đang chờ → IPN → kiểm tra lại đã ghi nhận, và Return giả không xóa phiên. Lần E2E trước mất kết nối Vite sau 24 ca đạt khi chạy đồng thời với backend; lần chạy lại đã hoàn thành toàn bộ.
