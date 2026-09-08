# Bàn giao nhánh tổng hợp Phase 1

Cập nhật 08/09/2026. Nhánh `integration/phase1` được tạo từ `integration/phase0` (`cdbdb11`) và đã merge bằng `--no-ff` theo thứ tự:

1. `feat/phase1-file-storage` — merge `0073e94`
2. `feat/phase1-job-queue` — merge `dbd607a`
3. `feat/phase1-auth-security` — merge `2e09242`
4. `feat/phase1-backup-restore` — merge `418a4ee`

## Kiểm thử trên nhánh tổng hợp

- Backend: **165/165** (`ExpressJS/npm test`).
- Policy frontend: **10/10** (`ReactJS/npm test`).
- Frontend production build: đạt; còn cảnh báo bundle JavaScript lớn (~1.54 MB).
- E2E Phase 0 + Phase 1: **29/29** (`ReactJS/npx playwright test`).
- `git diff --check`: đạt.

Toàn bộ kiểm thử dùng MongoDB, file storage và SMTP giả/tạm. Không kết nối Atlas, S3, Gmail hoặc DB người dùng; không khởi động worker thật. E2E fixture tự tạo dữ liệu cô lập và dọn sau chạy.

## Phạm vi được gộp

- Kho file học liệu theo trường, quota và luồng xóa bền vững (1.1).
- Job queue, lease, retry, worker email/xóa file và giao diện tác vụ nền (1.2).
- TOTP 2FA, mã khôi phục, session revocation, throttle và chính sách mật khẩu (1.3).
- Backup/verify/restore mã hóa, guard restore, kiểm tra cấu trúc, quota và file (1.4).

Giới hạn từng phần vẫn giữ nguyên trong các tài liệu `docs/phase1-*.md`. Nhánh tổng hợp chưa merge vào `main`.

## Cách tiếp tục

Lấy `integration/phase1` làm nền cho chức năng sau Phase 1. Mỗi chức năng mới tiếp tục theo quy trình: nhánh riêng, kiểm thử, cập nhật tài liệu, commit/push rồi mới merge khi được yêu cầu.
