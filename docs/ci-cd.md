# CI/CD

Cập nhật: 10/09/2026.

## CI hiện tại

Workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) chạy khi push lên `main`, `integration/**`, `feat/**`, khi mở/cập nhật pull request vào `main` hoặc `integration/**`, và khi chạy thủ công.

Pipeline gồm ba job độc lập:

- Backend: `npm ci` và `npm test` trong `ExpressJS`.
- Frontend: `npm ci`, `npm test` và `npm run build` trong `ReactJS`.
- E2E: cài Chromium, chạy `npm run test:e2e`; fixture tự tạo MongoDB Memory ReplSet và server local, không dùng Atlas hay secret production.

Mỗi job dùng Node.js 22, cache npm theo lockfile và giới hạn thời gian. Khi E2E lỗi, Playwright report và test artifacts được upload để chẩn đoán.

## CD

Chưa bật deploy tự động. Khi chọn môi trường triển khai, thêm workflow CD riêng với các điều kiện:

1. Chỉ chạy sau khi CI pass và merge vào `main`.
2. Dùng GitHub Environment có approval và secrets riêng cho production.
3. Chạy health check sau deploy, giữ bản deploy trước để rollback và thực hiện backup theo quy trình Phase 1.
4. Không đưa MongoDB URI, JWT/MFA key, VNPay, S3, SMTP hoặc OAuth secret vào repository.

CI có thể dùng ngay trên `integration/phase3`; CD không cần bật khi Phase 3 chưa được merge vào `main`.
