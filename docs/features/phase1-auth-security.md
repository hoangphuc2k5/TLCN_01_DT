# Phase 1.3 — 2FA và chính sách mật khẩu

Ngày: 06/09/2026. Nền: `feat/phase1-job-queue` tại `6cee993`. Nhánh bàn giao: `feat/phase1-auth-security`. Kết quả cuối: backend **145/145**, frontend policy **10/10**, E2E **29/29**, production build đạt; commit được ghi trong `implementation-progress.md`.

## Phạm vi đã triển khai

- Trang Tài khoản có bảo mật: đổi mật khẩu; thiết lập TOTP bằng QR hoặc khóa nhập tay; xác nhận bật; tắt; cấp lại mã khôi phục. Cần xác minh lại mật khẩu hiện tại hoặc Google trước thao tác nhạy cảm; khi 2FA đã bật, cần thêm mã TOTP/mã khôi phục cho đổi mật khẩu, tắt 2FA hoặc cấp lại mã.
- Đăng nhập mật khẩu và Google đều đi qua cùng bước kiểm tra 2FA. Chưa xác minh yếu tố thứ hai thì không có access token/user payload. UI giữ challenge trong bộ nhớ, không lưu xuống localStorage. TOTP chuẩn 6 số/30 giây, cửa sổ lệch một bước; không chấp nhận lại counter đã dùng.
- Thiết lập có hiệu lực 10 phút, challenge đăng nhập 5 phút. Mỗi tài khoản chỉ có một challenge hiện hành; đăng nhập lại thay challenge cũ. Thời hạn được kiểm tra trong truy vấn, không phụ thuộc tiến trình dọn TTL.
- 10 mã khôi phục ngẫu nhiên, mỗi mã 128 bit, chỉ hiện một lần và chỉ lưu SHA-256. Dùng mã khôi phục vẫn phải vượt qua mật khẩu/Google trước đó. Bật/tắt/cấp lại mã, đổi/reset mật khẩu đều tăng phiên bản phiên và xóa challenge/setup cũ. Reset bởi admin giữ nguyên 2FA.
- Mật khẩu mới: tối thiểu 15 ký tự Unicode, tối đa 72 byte UTF-8 để tránh bcrypt cắt ngầm; bcrypt cost 12; chặn một số mẫu phổ biến, lặp một ký tự và chứa nguyên email; không dùng lại 5 mật khẩu gần nhất. Cho phép khoảng trắng/cụm từ, không ép đổi định kỳ hoặc bắt buộc phối hợp loại ký tự.
- Tạo user và import dùng chung policy. Import khi đăng nhập mật khẩu được bật phải có mật khẩu riêng trong cột `password`; không tự gán `Password@123`. Mật khẩu đang tồn tại vẫn đăng nhập được, policy áp dụng khi tạo/đổi/reset.
- Reset tạo mật khẩu tạm ngẫu nhiên riêng mỗi lần, trả một lần cho người có quyền quản lý tài khoản. Bắt buộc đổi mật khẩu trước khi truy cập nghiệp vụ; API chỉ cho đọc hồ sơ/bảo mật và đổi mật khẩu. UI chuyển về Tài khoản cả khi tải lại trang hoặc nhập URL khác.
- Bộ đếm MongoDB chia sẻ giữa các API instance: 10 lần thử sai mỗi cửa sổ 10 phút cho mật khẩu/xác minh lại, và 10 lần cho yếu tố thứ hai. Request đang xử lý cũng chiếm một lượt; thành công chỉ hoàn lượt của chính request đó, không xóa lỗi đồng thời của request khác. Đổi challenge không xóa bộ đếm. Giới hạn IP 120 request xác thực/10 phút, tính cả thành công. TTL chỉ dọn dữ liệu cũ.

## Cấu trúc và tính nhất quán

| Thành phần | Trách nhiệm |
| --- | --- |
| `passwordPolicy` | Một policy dùng chung cho mọi đường ghi mật khẩu; kiểm tra sức mạnh, lịch sử, hash và tạo mật khẩu tạm |
| `totpProvider` | Adapter cho OTPAuth; tạo/kiểm tra TOTP, mã hóa AES-256-GCM và tạo mã khôi phục |
| `googleIdentity` | Adapter Google ID token; audience/verified email, yêu cầu token cấp trong 5 phút khi xác minh lại |
| `authSecurityRepository` | Lưu trạng thái theo optimistic concurrency; so sánh revision và cập nhật một document nguyên tử |
| `authSecurityService` | Điều phối vòng đời yếu tố xác thực, challenge, password và thu hồi phiên |
| `authSessionService` | Cấp JWT access sau khi đã đủ yếu tố; tách khỏi điều phối để không tạo phụ thuộc vòng |
| `authThrottle` / `AuthAttempt` | Atomic increment bộ đếm, khóa theo tài khoản/IP và cửa sổ thời gian |

Trạng thái bảo mật nằm trong `User.security`, mặc định không được select và bị loại khỏi `toSafeObject` kể cả khi service chủ động select. Mã TOTP được mã hóa bằng AES-256-GCM với user ID làm AAD; sao chép ciphertext sang tài khoản khác không giải mã được. Challenge token 256 bit chỉ lưu hash. Middleware loại security khỏi user trước khi chuyển tới controller nghiệp vụ.

Mọi thay đổi bảo mật tăng revision. Kiểm tra mã và mutation được commit cùng một cập nhật có điều kiện; hai request đọc cùng snapshot chỉ một request ghi được, request còn lại nhận 409. Không dùng transaction nhiều document, nên phần auth dùng được cả MongoDB standalone; chức năng file Phase 1.1 vẫn cần replica set. Không dựng thêm hierarchy Strategy/Factory khi mới có một policy hoặc một loại TOTP.

## API

Tiền tố `/v1/api`. Các route dưới `/auth` dùng `Cache-Control: no-store`; audit thao tác thay đổi chỉ ghi tên trường, không ghi nội dung mật khẩu/mã/khóa. Endpoint reset mật khẩu cũng không cache và không đưa mật khẩu vào thông báo EM.

| Method / route | Xác thực / dữ liệu |
| --- | --- |
| POST `/auth/login`, `/auth/google` | Public; trả session hoặc `{mfaRequired, challengeToken, expiresAt}` |
| POST `/auth/mfa/verify` | Public; `{challengeToken, code}`; trả session khi mã hợp lệ, chưa sử dụng |
| GET `/auth/security` | Access token; chỉ DTO trạng thái, số mã còn lại, policy, có mật khẩu/Google và khả dụng thiết lập |
| POST `/auth/mfa/setup` | Access token; `{currentPassword}` hoặc `{credential}`; trả QR URI/secret một lần |
| POST `/auth/mfa/confirm` | Access token; `{code}` của setup còn hạn; trả mã khôi phục một lần |
| POST `/auth/mfa/disable` | Access token; proof mật khẩu/Google + `code` |
| POST `/auth/mfa/recovery` | Access token; proof mật khẩu/Google + `code`; thay toàn bộ mã khôi phục |
| POST `/auth/password` | Access token; proof mật khẩu/Google + `newPassword`, thêm `code` nếu có 2FA |
| POST `/users/:id/reset-password` | Giữ quyền/scope/hierarchy quản lý user hiện hành; trả `defaultPassword` (tên trường tương thích API cũ, giá trị giờ là mật khẩu tạm ngẫu nhiên) |

Sau thay đổi bảo mật, không cấp phiên thay thế ngay. Người dùng lưu mã khôi phục rồi đăng nhập lại. Mã TOTP dùng lúc bật 2FA đã tiêu thụ, cần đợi mã tiếp theo hoặc dùng mã khôi phục để đăng nhập ngay.

## Cấu hình và triển khai

1. Cài dependency qua `npm ci` tại ExpressJS; OTPAuth 9.5.2 phụ thuộc Node >=20.19. Dùng Node hiện hành tương thích với backend. `.env.example` bổ sung `AUTH_MFA_ENCRYPTION_KEY`; các `.env` thực tế không bị sửa.
2. `AUTH_MFA_ENCRYPTION_KEY` phải là 32 byte ngẫu nhiên mã hóa thành **64 ký tự hex**. Tạo trong môi trường quản lý bí mật, giữ ngoài Git và sao lưu riêng. Mọi API instance dùng cùng khóa, JWT secret và DB; đồng bộ đồng hồ. Không thay khóa tùy tiện: khóa cũ cần để giải mã enrollment đã tồn tại. Đợt này chưa có công cụ luân chuyển khóa hàng loạt.
3. Chưa có khóa: UI báo thiết lập chưa khả dụng, backend từ chối setup/TOTP bằng 503; tài khoản đã bật 2FA không được tự bỏ qua bước này. Mã khôi phục vẫn dùng được, vì chỉ cần hash; người dùng có thể tắt 2FA bằng proof hiện hành + một mã khôi phục chưa dùng.
4. Server khởi tạo index AuthAttempt TTL. User có index hash challenge. User cũ không cần migration dữ liệu; security/sessionVersion thiếu được hiểu là 0. JWT cũ không có purpose/version còn dùng được ở version 0 cho đến lần thay đổi bảo mật đầu tiên hoặc hết hạn. JWT khác purpose access bị từ chối; chỉ nhận HS256. Rollout cần triển khai đồng bộ các API instance, không để bản cũ cấp token/bỏ qua kiểm tra phiên bản.
5. Chỉ public chính xác login/Google/config/health/MFA verify; bỏ miễn xác thực bằng so sánh prefix. Cần HTTPS khi triển khai. JWT vẫn theo cơ chế localStorage có sẵn của ứng dụng; đợt này chưa chuyển sang cookie HttpOnly.
6. IP lấy từ `req.ip` và cấu hình Express hiện hành. Không tự tin header X-Forwarded-For. Trước production sau proxy/NAT lớn, cấu hình proxy tin cậy và đánh giá hạn mức IP 120/10 phút cho môi trường thực tế; chưa có limiter phân tán ở edge.

## Kiểm thử và giới hạn

Lệnh đã chạy thành công: `npm test` tại ExpressJS và ReactJS; `npm run test:e2e` và `npm run build` tại ReactJS; `git diff --check`. Báo cáo trình duyệt: `ReactJS/playwright-report/index.html` (artifact local, không commit). Build vẫn cảnh báo chunk lớn khoảng 1.54 MB.

Test backend auth dùng MongoMemoryServer riêng, khóa thử, fake Google SDK, không truy cập Atlas/Gmail/Google thật. Kiểm tra policy/history, dữ liệu cũ, encryption/AAD, nhập sai/hết hạn, concurrent redeem, replay, thu hồi phiên, reset bắt đổi mật khẩu, Google cũng cần MFA, throttle nguyên tử, chống inject security và ẩn bí mật. E2E dùng replica set tạm, account security0/security1 riêng; quét khóa bằng thư viện TOTP trong test, thao tác các bước qua UI. `CI=true` chỉ cho Vite webserver kiểm thử để tránh tự thoát khi stdin đóng trên Windows.

Giới hạn còn lại: TOTP tự nguyện theo tài khoản, chưa enforce bắt buộc theo tenant/role; chưa có WebAuthn, SMS OTP, danh sách mật khẩu rò rỉ đầy đủ hoặc policy tùy chỉnh từng trường. Blocklist hiện nhỏ, không tuyên bố tuân thủ đầy đủ NIST/ASVS. Google mới kiểm thử qua adapter/SDK giả, chưa UAT OAuth thật. Audit dùng cơ chế hiện hành, chưa có thông báo riêng qua email khi thay yếu tố. Mất cả authenticator lẫn mã khôi phục cần quy trình xác minh danh tính của đơn vị; không có API admin tắt 2FA bỏ qua proof. Chưa kiểm thử tải lớn hoặc key rotation. Backup/restore thuộc Phase 1.4, chưa triển khai.

Tham chiếu thiết kế: [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [OWASP MFA](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html), [OTPAuth](https://github.com/hectorm/otpauth). Tham chiếu để chọn hành vi xác thực/lưu mã; không thay thế audit bảo mật độc lập.
