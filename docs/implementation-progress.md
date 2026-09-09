# Tiến trình triển khai

## Phase 2.2 - Online homework

- Branch `feat/phase2-online-assignments`, based on `integration/phase1`.
- Implemented homework lifecycle, scoped student submissions, resubmission before grading, teacher grading/feedback, late policy, close policy, permissions, API and React page. API path is `/v1/api/homeworks` to preserve the existing teacher-assignment endpoints at `/v1/api/assignments`.
- Tests: backend homework **7/7**, full backend suite **172/172**, frontend policy **10/10**, build passed, dedicated E2E **2/2**, full E2E **31/31**.
- Details and continuation notes: [phase2-online-assignments.md](phase2-online-assignments.md).

## Phase 2.3 - Periodic contact book

- Branch `feat/phase2-contact-book`, based on `feat/phase2-online-assignments`.
- Added scoped weekly/monthly/term contact-book entries, teacher draft/publish flow and parent reply at `/contact-book`; API is `/v1/api/contact-books`.
- Dedicated backend test: **3/3**; full backend **175/175**, frontend policy **10/10**, build passed, dedicated E2E **1/1**, full E2E **32/32**. Details: [phase2-contact-book.md](phase2-contact-book.md).

## Phase 2.4 - Class activities and parent meetings

- Branch `feat/phase2-parent-meetings`, based on `feat/phase2-contact-book`.
- Added class activity publishing, online parent-meeting scheduling/cancellation and parent RSVP at `/class-life`; APIs are `/v1/api/class-activities` and `/v1/api/parent-meetings`.
- Dedicated backend test: **2/2**, frontend policy **10/10**, build passed, dedicated E2E **1/1**. Details: [phase2-parent-meetings.md](phase2-parent-meetings.md).
- Full backend regression after this branch: **177/177**.

## Phase 2.5 - CLB and retake requests

- Branch `feat/phase2-clubs-retakes`, based on `feat/phase2-parent-meetings`.
- Added school-scoped clubs with capacity/registration and student retake requests with administrative review at `/activities`.
- Dedicated backend test **1/1**, build passed, dedicated E2E **1/1**. Details: [phase2-clubs-retakes.md](phase2-clubs-retakes.md).

Cập nhật: 08/09/2026. Đã hoàn tất và kiểm thử nhánh tổng hợp Phase 1 (`integration/phase1`): backend 165/165, policy frontend 10/10, E2E Phase 0 + Phase 1 29/29, build đạt. Chi tiết merge và phạm vi xem [bàn giao Phase 1](phase1-integration.md). Phase 2 tiếp tục ở nhánh chức năng riêng; chưa merge main.

## Nhánh tổng hợp Phase 1

- `integration/phase1` được tạo từ `integration/phase0` tại `cdbdb11`, merge tuần tự bốn nhánh Phase 1 bằng `--no-ff`. Các merge commit lần lượt là `0073e94`, `dbd607a`, `2e09242`, `418a4ee`.
- Kiểm thử trên đúng cây tổng hợp: backend **165/165**, frontend policy **10/10**, E2E **29/29**, build đạt và `git diff --check` đạt.
- Phase 2.1 xin nghỉ dạy/dạy bù đang ở `feat/phase2-teaching-schedule`, không đưa vào `integration/phase1`.

## Phase 1 — 1.4 Backup/Restore

- Nhánh bàn giao `feat/phase1-backup-restore`, nền `feat/phase1-auth-security` tại `2ee28d1`; không merge main/integration/phase0.
- Đã commit/push code, test và runbook tại `142dc50` lên `origin/feat/phase1-backup-restore`; dùng nhánh này làm nền phiên tiếp theo.
- Thêm `npm run backup -- create|verify|restore`: sao lưu logic toàn database ứng dụng + file FileAsset local/S3, raw BSON, index, collection rỗng, validator/collation. Archive AES-256-GCM, kiểm tra lại toàn bộ trước khi công bố file đích; không ghi đè backup cũ.
- Restore mặc định chỉ lập kế hoạch, `--apply --maintenance` mới ghi. Đích bắt buộc DB rỗng khác tên nguồn và thư mục local mới; không drop/overwrite hoặc tự chuyển cấu hình. Toàn bộ tag mã hóa/cấu trúc/checksum/tenant/quota được kiểm tra trước khi ghi; lỗi index/validator hoặc lỗi ghi vẫn có thể xảy ra và giữ marker chặn đích.
- `restoreguard` claim bền vững chặn restore cạnh tranh; trạng thái COMPLETE là điểm commit sau khi DB/file/index/report hoàn tất. API/worker probe guard trước Mongoose tự tạo collection/index/seed; sai trạng thái hoặc fingerprint khóa thì không khởi động. Guard COMPLETE được giữ lại; backup tiếp theo kiểm tra và bỏ marker nội bộ khỏi archive.
- Bảo toàn ID/quan hệ/secret TOTP; buộc JWT secret mới, xóa challenge/setup/auth attempts và mã khôi phục cũ, chống phục hồi lại mã đã dùng sau snapshot. Người dùng 2FA đăng nhập bằng authenticator gốc và tạo mã khôi phục mới. Giữ lịch sử job, hủy QUEUED/RUNNING và tắt ý định email cũ để không tự gửi lại.
- Cấu trúc: Facade `backupService`, adapter `mongoSnapshot`/reader local-S3, codec streaming `archive`, state machine `snapshotValidator`, policy đường dẫn/kích thước và `restoreGuard`. Không thêm dependency, không thêm HTTP restore hoặc logic này vào controller nghiệp vụ.
- Kiểm thử: **165/165 backend toàn bộ**, gồm **20 test backup**. Test dùng replica set tạm, file thật, native BSON, CLI create/verify/plan/apply, lỗi giữa chừng, đích không rỗng, concurrent restore, sai khóa/tamper/checksum, symlink, startup API/worker và TOTP login/download qua API sau restore. S3 reader dùng adapter giả. `git diff --check` đạt; frontend không thay đổi và không chạy lại build/E2E trong đợt này.
- Chưa kết nối Atlas, chưa chạy backup/restore trên DB người dùng, chưa gửi mail hoặc truy cập bucket thật. Giữ các `.env` thực tế và hai file untracked ban đầu. `.env.example` bổ sung BACKUP_ENCRYPTION_KEY, BACKUP_STAGING_ROOT, BACKUP_MAX_BYTES và các biến RESTORE_*.
- Hướng dẫn cấu hình, lệnh, commit marker, lỗi và giới hạn: [phase1-backup-restore.md](phase1-backup-restore.md). Phải dừng API/worker/mọi writer khi tạo snapshot; --maintenance chỉ là xác nhận vận hành. Staging có plaintext tạm và cần ACL riêng; snapshot không chứa khóa JWT/TOTP/backup nên phải sao lưu khóa riêng.
- Giới hạn: công cụ bảo trì toàn instance, restore local mới; chưa có UI, scheduler/retention/offsite tự động, tenant-only restore, restore S3, PITR/oplog, key rotation hay UAT hạ tầng thật. Không gọi toàn bộ spec backup doanh nghiệp là hoàn tất.
- Điểm tiếp tục: code nền 1.1–1.4 đã có; tiếp tục nghiệp vụ còn thiếu theo spec từ nhánh này. Các kiểm chứng Atlas/S3/Google/SMTP và diễn tập restore hạ tầng thật vẫn là việc triển khai riêng, chưa được đánh dấu đạt.

## Phase 1 — 1.3 2FA và password policy

- Nhánh bàn giao `feat/phase1-auth-security`, nền `feat/phase1-job-queue` tại `6cee993`. Không merge vào main hoặc integration/phase0.
- Đã commit/push code, test và tài liệu tại `56a4ce2` lên `origin/feat/phase1-auth-security`. Phiên sau checkout nhánh này để tiếp tục 1.4.
- TOTP qua QR/khóa nhập tay, xác nhận bật, tắt, cấp lại 10 mã khôi phục dùng một lần; màn hình đăng nhập xử lý challenge trước khi có JWT. Cả mật khẩu và Google đều đi qua 2FA nếu tài khoản đã bật.
- Secret mã hóa AES-256-GCM gắn user ID; challenge/recovery chỉ lưu hash. MongoDB CAS theo revision chống request đồng thời, mã dùng lại và ghi đè trạng thái mới; hạn setup 10 phút, challenge 5 phút. Throttle chia sẻ MongoDB theo tài khoản/IP, không reset hạn mức khi xin challenge mới.
- Policy chung cho tạo user/import/đổi/reset: tối thiểu 15 ký tự, tối đa 72 byte UTF-8, bcrypt cost 12, lịch sử 5 mật khẩu và chặn một số mẫu dễ đoán. Bỏ mật khẩu mặc định chung khi import/reset. Admin reset tạo mật khẩu tạm riêng và buộc đổi trước khi dùng nghiệp vụ; giữ 2FA.
- Bật/tắt/cấp lại mã/đổi/reset tăng sessionVersion và xóa challenge/setup; middleware thu hồi JWT cũ. Bí mật không xuất hiện trong profile/danh sách/audit body. API bảo mật chỉ thao tác chính tài khoản đang đăng nhập, admin reset giữ quyền/scope cũ.
- Cấu trúc: adapter `totpProvider`/`googleIdentity`, policy `passwordPolicy`, repository `authSecurityRepository`, service điều phối `authSecurityService`, cấp phiên riêng `authSessionService`; không có phụ thuộc vòng giữa cấp phiên và 2FA.
- Kiểm thử cuối: **145/145 backend** (thêm 22 test auth), **10/10 frontend policy**, **29/29 E2E đầy đủ**, production build đạt. E2E mới kiểm tra bật → nhập sai → recovery login → tắt → đổi mật khẩu; admin reset → redirect Tài khoản sau tải lại → bắt đổi mật khẩu. `git diff --check` đạt. Vite test chạy `CI=true` để không thoát khi stdin đóng trên Windows; không thay cấu hình Vite chạy thực tế.
- Tất cả test dùng MongoDB/file tạm và Google SDK giả; không kết nối Atlas, Google/Gmail/S3 thật. Không thay các `.env` người dùng hoặc file production example chưa track. Build còn cảnh báo chunk lớn (~1.54 MB).
- Cần cấu hình khóa `AUTH_MFA_ENCRYPTION_KEY` 64 hex trong môi trường thật để bật TOTP. Chưa có khóa thì enrollment báo chưa khả dụng; không tự bỏ qua 2FA đã bật. Cấu hình, API, giới hạn và khôi phục: [phase1-auth-security.md](phase1-auth-security.md).
- Tiếp theo: **1.4 Backup/restore** từ nhánh này. Thiết kế phải tính tới private storage, dữ liệu queue và User.security; sao lưu khóa 2FA riêng, giữ user ID khi restore, xử lý thu hồi phiên sau restore. Chưa chạy backup/restore hoặc worker trên DB người dùng.
- Giới hạn 1.3: TOTP tự nguyện, policy cố định dùng chung; chưa bắt buộc MFA theo tenant/role, chưa có WebAuthn/SMS OTP, kiểm tra mật khẩu rò rỉ đầy đủ, key rotation hoặc UAT Google thật. Không coi toàn bộ spec bảo mật doanh nghiệp là hoàn tất.

## Phase 1 — 1.2 Job/queue

- Nhánh `feat/phase1-job-queue`, nền `feat/phase1-file-storage` tại `9f27526`. Chưa merge vào main hoặc integration/phase0.
- Đã push code/test tại `5a41949` lên `origin/feat/phase1-job-queue`. Lấy nhánh này làm nền cho Phase 1.3.
- Job MongoDB có unique key theo tenant/loại/nguồn; lịch runAt, atomic claim, lease/heartbeat, retry backoff, giới hạn attempts, giữ totalAttempts và mã lỗi an toàn. Worker cũ mất lease không ack/ghi đè worker mới.
- Handler thật: email từ Notification đã lưu và xóa file DELETING/hoàn quota. Dispatcher đọc ý định bền vững, khôi phục khoảng gián đoạn enqueue/đánh dấu nguồn. Không tự gửi notification cũ, không tự xóa UPLOADING.
- Email tin nhắn/điểm danh/thông báo/kết quả duyệt đơn chuyển khỏi request sang worker. Message API hỗ trợ emailRunAt một lần; SMTP chưa cấu hình được ghi lỗi/retry, không báo đã gửi.
- Thêm trang Tác vụ nền và quyền jobs.view/jobs.execute: xem/lọc/phân trang, thử lại ngay hoặc theo lịch, hủy job chờ. Scope trường/cụm áp dụng ở API; retry/hủy có audit. Role cũ không tự bị ghi đè quyền.
- Kiểm thử: **123/123 backend**, **10/10 frontend policy**, **27/27 E2E**, build đạt. Test dùng MongoDB tạm, file thật trong thư mục tạm, SMTP giả; chưa kết nối Atlas hoặc gửi email Gmail thật. Thêm guard dừng nhận việc khi worker được yêu cầu dừng.
- Chạy worker riêng từ ExpressJS bằng `npm run worker`, dùng cùng cấu hình DB/storage với API. Chưa khởi động worker trên môi trường người dùng. Cấu hình, trạng thái, giới hạn và cách vận hành: [phase1-job-queue.md](phase1-job-queue.md).
- Giới hạn: lịch một lần, SMTP có thể trùng nếu crash sau khi nhà cung cấp nhận thư nhưng trước ack; Observer trước bước lưu Notification chưa thành transactional outbox. UPLOADING vẫn xử lý khi bảo trì. Không coi 1.3/1.4 là đã làm.

## Phase 1 — 1.1 Kho file học liệu

- Nhánh `feat/phase1-file-storage`, nền `integration/phase0` tại `cdbdb11`. Không nhập code Phase 1 vào nhánh tổng hợp Phase 0.
- Đã commit/push code và test tại `f73ec42`; nhánh đang track `origin/feat/phase1-file-storage`. Phiên tiếp theo lấy nhánh này làm nền cho 1.2.
- Thêm FileAsset, storageUsedBytes, liên kết fileAssetId; adapter local/S3, API upload/metadata/download/usage; dùng scope và quyền học liệu hiện hành. File mới tải qua JWT, không expose thư mục public.
- Giao dịch MongoDB giữ chỗ dung lượng và metadata; chống vượt quota khi upload đồng thời. Xóa file trước khi hoàn quota; trạng thái UPLOADING/READY/DELETING và lệnh bảo trì giúp phục hồi gián đoạn.
- UI Học liệu hỗ trợ tải file hoặc liên kết, chia sẻ/riêng tư, hiển thị hạn mức, download đúng tên và xóa. Giữ tên file tiếng Việt.
- Thêm 13 test backend so với Phase 0: **106/106 đạt**. Frontend **9/9**, build đạt (còn cảnh báo chunk lớn). E2E đầy đủ **25/25**, gồm upload → download so sánh bytes → xóa; chạy lại riêng luồng file sau chỉnh phục hồi/tên file.
- Yêu cầu mới: MongoDB replica set cho upload/xóa. Test dùng replica set/thư mục tạm; không kết nối database người dùng, không đổi `.env`. S3 được kiểm tra bằng adapter test, chưa smoke test bucket thật. Local đã kiểm tra end-to-end.
- Cấu hình, API, quyền, lệnh phục hồi và giới hạn: [phase1-file-storage.md](phase1-file-storage.md). `.env.example` có biến mẫu mới; giữ nguyên file production example chưa track và package-lock ở root của người dùng.

### Checklist Phase 1

- [x] 1.1 Kho file theo tenant tích hợp học liệu: code, kiểm thử local, adapter S3 và tài liệu.
- [x] 1.2 Job/queue: retry, idempotency, trạng thái, lịch chạy một lần và handler email/xóa file; phục hồi DELETING, giữ UPLOADING cho bảo trì.
- [x] 1.3 TOTP/recovery + password policy chung, thu hồi phiên và bắt đổi mật khẩu tạm; giới hạn triển khai ghi ở mục 1.3.
- [x] 1.4 Backup/verify/restore bằng CLI bảo trì, archive mã hóa và DB/local root mới; giới hạn ở mục 1.4.
- [ ] Smoke test S3/IAM thực tế trước khi chọn triển khai adapter S3; không chặn dùng local.

## Rà soát bổ sung sau tổng hợp Phase 0

- Nền `integration/phase0` (6baf465); nhánh sửa `fix/phase0-read-path-audit`.
- Sửa scope/quyền dashboard, đọc đơn của custom role, học liệu chưa chia sẻ, thi theo môn và đề toàn trường, lịch/thông báo theo lớp/vai trò nhận, hạnh kiểm lớp chủ nhiệm. Thu gọn hồ sơ trong tra cứu học vụ; đồng bộ nút duyệt CSVC với API.
- Thêm 11 test backend tái hiện lỗi; thêm 2 E2E với fixture có liên kết con khác trường và học liệu riêng. Chạy lại đầy đủ: **93/93 backend, 9/9 frontend, 24/24 E2E**, build đạt; `git diff --check` đạt.
- Đây là kết quả nền tảng 0.1–0.6 trong phạm vi ghi nhận; không xác nhận mọi tổ hợp quyền hoặc toàn bộ nghiệp vụ/spec. Giới hạn và hướng tiếp tục: [phase0-review-2026-09-06.md](phase0-review-2026-09-06.md), [phase0-qa.md](phase0-qa.md).
- Đã push nhánh sửa tại `e75aaa0` và merge/push `integration/phase0` tại `8b7441a`. Cây file sau merge giống hệt nhánh đã kiểm thử; không có xung đột. Giữ nguyên `main` và hai file cấu hình người dùng chưa track.

## Nhánh tổng hợp Đợt 0

- Nhánh bàn giao chung: `integration/phase0`, tạo từ `origin/main` (306c72c).
- Đã merge riêng từng nhánh bằng `--no-ff`, theo thứ tự:
  1. `feat/phase0-api-permissions`
  2. `feat/phase0-export-scope`
  3. `feat/phase0-workflow-scope`
  4. `feat/phase0-permission-navigation`
  5. `feat/phase0-academic-read-scope`
  6. `feat/phase0-academic-write-scope`
  7. `feat/phase0-resource-role-ownership`
  8. `feat/phase0-exam-access`
  9. `feat/phase0-ui-actions-e2e`
  10. `feat/phase0-scope-final-check`
- Không có xung đột. Kiểm tra ancestry xác nhận đủ cả 10 nhánh; `git diff --exit-code origin/feat/phase0-scope-final-check HEAD` trước cập nhật tài liệu xác nhận toàn bộ cây file giống bản đã kiểm thử (681acb8). Không chạy lại test vì merge không thay đổi code.
- Dùng `integration/phase0` làm nền tiếp tục Đợt 1; `main` chưa được merge Đợt 0.

### Dọn nhánh phụ sau bàn giao — 06/09/2026

- Theo yêu cầu người dùng, đã xóa 10 nhánh `feat/phase0-*` nêu trên và `fix/phase0-read-path-audit` ở cả local và origin.
- Trước khi xóa đã fetch origin và kiểm tra từng đầu nhánh local/remote là ancestor của `origin/integration/phase0` tại `5737d51`; cả 11 nhánh đã được merge đầy đủ. Remote được xóa atomic kèm kiểm tra SHA để không xóa nhánh vừa có commit mới; local dùng `git branch -d`.
- Giữ `integration/phase0` và `main`. Toàn bộ commit, code và lịch sử merge Phase 0 vẫn nằm trong nhánh tổng hợp; không cần chạy lại test vì chỉ dọn ref Git và cập nhật tài liệu.
- Các tên nhánh trong mục bàn giao bên dưới là thông tin lịch sử. Khi review sau khi dọn nhánh, dùng commit SHA đã ghi hoặc lịch sử merge của `integration/phase0`.

## Quy trình bàn giao

- Mỗi chức năng: sửa code → kiểm thử → ghi kết quả → tạo nhánh, commit và push origin.
- Chỉ stage file liên quan; không commit .env hoặc file cấu hình người dùng chưa kiểm tra.
- Không chạy seedDemo trên database người dùng. Kiểm thử bằng MongoDB tạm.
- Các nhánh tiếp theo có thể kế thừa nhánh trước; ghi rõ nhánh nền để review.

## Checklist Đợt 0

- [x] 0.1 Quyền API theo hành động ở các route dùng MANAGE_*, từ chối role vô hiệu hóa; kiểm thử hồi quy.
- [x] 0.2a Menu/route theo permission; nút user/role và quyền lưu/duyệt TKB, đơn từ.
- [x] 0.2b Chuyển các nút còn lại theo action và quy tắc nghiệp vụ; kiểm thử UI đầu cuối mới nhất 24/24 đạt.
- [x] 0.3 Scope báo cáo Excel: tenant, lớp/môn, bản thân/con em, lọc records điểm danh.
- [x] 0.4 Scope duyệt đơn, TKB, gửi tin nhắn; chống tự duyệt/duyệt lặp.
- [x] 0.5a Đồng bộ scope API xem điểm/điểm danh/học phí với export, lọc records điểm danh trước trả JSON.
- [x] 0.5b Rà ID/quan hệ khi ghi học vụ, thi, học liệu, thư viện, CSVC, user/role, template; bổ sung payment scope và nhất quán trường/lớp.
- [x] 0.6 Lượt rà lại: backend 93/93, frontend 9/9, production build đạt; chạy đầy đủ E2E 24/24 trên bản sửa mới.

## Trạng thái bắt đầu

- Code từ lượt trước chưa tồn tại ở workspace hiện tại, bắt đầu lại từ main (306c72c).
- Có file người dùng chưa track: package-lock.json ở root và ExpressJS/.env.production.example; không đưa vào commit triển khai.
- Bộ test và docs cũ không có trong workspace hiện tại.
- Không được đánh dấu hoàn tất toàn Đợt 0 khi checklist vẫn còn việc.

## Tiếp tục ở phiên sau

Đọc file này trước, chạy git status và xem nhánh hiện tại; tiếp tục mục chưa hoàn thành theo thứ tự trên. Không ghi đè thay đổi chưa commit của người dùng. Chi tiết kết quả và lệnh kiểm thử sẽ được bổ sung sau từng chức năng.

## Bàn giao 0.1 — Quyền API theo action

- Nhánh: `feat/phase0-api-permissions`, nền: `main` tại `306c72c`.
- Thay đổi: middleware `authorizePermissionAction`; các route MANAGE_* kiểm tra view/create/update/delete/execute cụ thể. Upsert/import yêu cầu create + update để không lách quyền sửa qua POST.
- Role không tồn tại/không ACTIVE bị chặn ở authenticate; cache không tự cấp quyền static khi role bị khóa hoặc collection không có role active.
- Tách `src/app.js` khỏi server startup để test không kết nối DB người dùng hay seed dữ liệu.
- Thêm `npm test` dùng Node test runner và MongoDB tạm qua mongodb-memory-server; lần chạy đầu cần tải binary MongoDB.
- Kết quả: `cd ExpressJS; npm test` — 11/11 đạt (API thật với JWT, MongoDB tạm).
- Không cần migration; giữ role/quyền đang lưu. Server vẫn khởi tạo role hệ thống theo cơ chế cũ khi thiếu.
- Giới hạn: route khóa bằng authorizeRoles và kiểm tra role trong service chưa chuyển hết; các endpoint GET chưa có guard vẫn cần scope/permission theo module ở các mục tiếp theo. Không coi 0.1 là đã hoàn thành toàn bộ Đợt 0.
- Push: thành công lên origin, commit `431762e`.

## Bàn giao 0.3 — Xuất Excel đúng phạm vi

- Nhánh: `feat/phase0-export-scope`, kế thừa `feat/phase0-api-permissions` (`431762e`).
- Thêm helper `dataScope` dùng chung và policy export ở service để cả lời gọi trực tiếp cũng kiểm tra quyền.
- HS chỉ xuất bản thân; PH chỉ xuất con trong trường; GV xuất lớp/môn/năm được phân công, GVCN có thêm lớp chủ nhiệm. Quản lý cụm chỉ các trường thuộc cụm; custom role có reports.view xuất trong trường được gán.
- Query trường/HS/lớp chỉ thu hẹp phạm vi, không ghi đè scope. ID sai trả 400. Export học phí nhận query từ controller.
- Điểm danh lọc từng records.studentId trong file, không chỉ lọc buổi điểm danh.
- Kiểm thử: `cd ExpressJS; npm test` — 38/38 đạt, gồm 27 test export đọc file XLSX thật với 2 cụm/3 trường và 11 test quyền API.
- `cd ReactJS; npm run build` — đạt; còn cảnh báo chunk trên 500 kB từ ứng dụng hiện tại.
- Không migration. Giới hạn 1.000 dòng điểm/phí và 200 buổi điểm danh vẫn giữ; xử lý export lớn thuộc đợt báo cáo sau. Phạm vi lớp điểm danh của GV là các lớp được phân công.
- Push: thành công lên origin, commit `5d4d30a`.

## Bàn giao 0.4 — Đơn, TKB và tin nhắn

- Nhánh: `feat/phase0-workflow-scope`, kế thừa `feat/phase0-export-scope` (`5d4d30a`).
- Đơn: kiểm tra trường/cụm; GVCN chỉ xem/duyệt nghỉ học của lớp chủ nhiệm; không tự duyệt, không duyệt lặp; cập nhật PENDING có điều kiện nguyên tử; kiểm tra khoảng ngày và trường của HS khi tạo.
- TKB: giới hạn lớp HS/con PH/GV; HS/PH chỉ xem bản APPROVED; duyệt đúng trường và chỉ từ DRAFT. API lưu không nhận APPROVED; sửa đưa về nháp và xóa người duyệt cũ; xác minh lớp/năm học/GV/môn thuộc trường.
- Tin nhắn: chỉ trong trường hoặc liên lạc quản trị cấp trên thuộc cụm/Super Admin; reply phải thuộc đúng cặp người gửi/nhận. Đây là chính sách phạm vi ban đầu, chưa thêm quan hệ GV-PH theo lớp.
- Test: `cd ExpressJS; npm test` — 48/48 đạt; có duyệt đồng thời (một 200, một 409), đối chiếu DB không đổi khi bị chặn, TKB/reply giả và khoảng ngày sai.
- Không migration. Chưa tự cập nhật lịch bù hoặc kiểm tra xung đột TKB giữa các lớp (Đợt 2). Giữ quy tắc người duyệt theo role hệ thống hiện có, đồng thời kiểm tra permission execute; custom approver cần thiết kế riêng để không vô tình cho GV tự có quyền duyệt.
- Push: thành công lên origin, commit `df819a6`.

## Bàn giao 0.2a — Menu, route và điều khiển quản trị

- Nhánh: `feat/phase0-permission-navigation`, kế thừa `feat/phase0-workflow-scope` (`df819a6`).
- Helper `can` và `canVisit`; menu lấy từ catalog hiện có rồi lọc theo permission, không khóa role tùy chỉnh khỏi menu. PrivateRoute dùng cùng policy để chặn truy cập URL trực tiếp.
- Bỏ RoleRoute chỉ-SuperAdmin trên trang clusters/subscriptions; quyền xem từ permission, API vẫn kiểm tra riêng.
- Nút user/role kiểm tra create/update/delete; import user yêu cầu create + update. TKB lưu cần create + update; duyệt và đơn từ xét thêm execute.
- Kiểm thử frontend: `cd ReactJS; npm test` — 7/7 đạt (custom role, chỉ xem, HS/PH, quyền quản lý, URL không biết). Build production đạt; cảnh báo chunk lớn vẫn còn.
- Đây là kiểm thử policy + build, chưa phải kiểm thử trình duyệt/E2E. Nút nghiệp vụ ở các màn hình khác vẫn cần chuyển đổi ở 0.2b.
- Push: thành công lên origin, commit `86da9a8`.

## Bàn giao 0.5a — Scope API đọc dữ liệu học vụ

- Nhánh: `feat/phase0-academic-read-scope`, kế thừa `feat/phase0-permission-navigation` (`86da9a8`).
- `listGrades`, `listInvoices`, `listAttendance` dùng chung policy với export. Scope cụm được resolve thành schoolIds; HS/PH chỉ nhận dữ liệu của mình/con.
- Điểm danh lọc records trước trả JSON, không mutate dữ liệu lưu; kiểm tra ngày không hợp lệ. Query status học phí chỉ nhận enum hợp lệ.
- Test: `cd ExpressJS; npm test` — 51/51 đạt; thêm đối chiếu JSON điểm/phí/điểm danh cho HS, PH và quản lý cụm. Bộ frontend 7/7 và build đã đạt ở 0.2a.
- Không migration. Chưa bao gồm scope khi ghi điểm/điểm danh/tạo invoice; xử lý ở 0.5b.
- Push: thành công lên origin, commit `3fd8973`.

## Điểm tiếp tục chính xác

### Bản chốt Đợt 0 — Thanh toán theo cụm và nhất quán tham chiếu

| Nhánh đã push origin | Commit triển khai |
| --- | --- |
| feat/phase0-exam-access | 3613f88 |
| feat/phase0-ui-actions-e2e | b223634 |
| feat/phase0-scope-final-check | 2a5076b |

- Nhánh `feat/phase0-scope-final-check`, nền `feat/phase0-ui-actions-e2e` (b223634). Nhánh này chứa toàn bộ chuỗi thay đổi Đợt 0, chưa merge main.
- Payment list dùng schoolScope để tài khoản quản trị cụm được cấp fees.view không đọc toàn hệ thống; query invoice chỉ thu hẹp phạm vi. Không thay đổi luồng hạch toán.
- Tạo học liệu/đề/lịch/thông báo lớp bắt buộc classId thuộc đúng schoolId được chọn, kể cả Super Admin. Thông báo suy cluster từ trường, không nhận clusterId giả từ payload; thông báo cụm kiểm tra cụm tồn tại.
- Login từ chối role vô hiệu/ngoài tenant trước khi phát token, bên cạnh kiểm tra từng request đã có.
- Backend `npm test`: **82/82 đạt**. Sau các thay đổi cuối, E2E chạy lại **4/4** luồng liên quan (tạo học liệu, nộp bài, ghi điểm, quyền admin sau reload) đạt. Bộ đầy đủ **22/22**, frontend policy **9/9** và build đã đạt trên b223634; không có thay đổi UI sản phẩm sau đó.
- Ca giáo viên được chạy lại thêm 1/1 sau khi chờ modal đóng trước chụp ảnh; ảnh xác nhận bảng đã cập nhật điểm 9 và thông báo lưu thành công. Server fixture/Vite đã dừng sau kiểm thử.
- Đã hoàn thành checklist nền tảng 0.1–0.6 trong tài liệu này. Không đồng nghĩa đã làm tất cả chức năng thiếu của spec hoặc kiểm thử mọi kịch bản nghiệp vụ. Danh sách giới hạn xem [phase0-qa.md](phase0-qa.md).

### Bàn giao 0.2b — Quyền thao tác UI và E2E

- Nhánh `feat/phase0-ui-actions-e2e`, nền `feat/phase0-exam-access` (3613f88).
- Các trang điểm/điểm danh/phí/thi/học liệu/thư viện/CSVC/hạnh kiểm/mẫu/hỗ trợ kiểm tra action riêng; import/upsert cần create + update. Xuất báo cáo cho tài khoản chỉ xem/HS/PH theo cùng policy với API.
- Lịch/thông báo ẩn nút xóa theo quyền và chủ sở hữu/phạm vi. Đơn và CSVC ẩn tự duyệt. Thư viện tách cho mượn (create) và trả (execute). Thi hiển thị “Chưa công bố” khi API che điểm.
- Lớp học ẩn nút tạo khi không có classes.create; trang cụm/trường/subscription giữ các giới hạn vai trò nghiệp vụ tương ứng API. Những thao tác chỉ Super Admin/cấp quản trị không tự mở cho custom role chỉ vì có permission.
- Picker học sinh/GV ở phí, thư viện, lớp và TKB dùng danh bạ tối thiểu, không yêu cầu quyền quản lý user. Sửa role dựa thêm quyền sở hữu school/cluster; so sánh ID hỗ trợ cả chuỗi lẫn object từ auth/me.
- Thêm `ExpressJS/scripts/phase0-fixture.js`, `ReactJS/playwright.config.js`, `ReactJS/e2e/phase0.spec.js`. Fixture tạo MongoDB tạm riêng, chỉ listen 127.0.0.1:8091, không dùng DB từ .env hoặc seedDemo. Vite test dùng 5175 và API_PROXY_TARGET; không tái sử dụng server đang chạy.
- Kiểm thử: backend trước phần UI **78/78**, frontend policy **9/9**, production build đạt; E2E Chromium **22/22** (1,2 phút). Kiểm tra 15 màn hình chỉ xem, URL bị cấm, custom create-only, PH chỉ thấy con, HS nộp bài ẩn điểm, thủ thư chọn HS/duyệt người khác, GV lưu điểm, quyền sở hữu sau reload.
- Công cụ browser tích hợp lỗi môi trường `missing sandboxPolicy`; E2E thực chạy bằng Playwright cục bộ. Lượt đầu chỉnh locator theo bản dịch Ant Design; kết quả cuối không bỏ qua hoặc retry test thất bại.
- Push thành công: `b223634`. Cách chạy lại và giới hạn: [phase0-qa.md](phase0-qa.md). Payment list đã được bổ sung ở bản chốt phía trên.

### Bàn giao tiếp: thi online và các đường truy cập còn hở

- Nhánh `feat/phase0-exam-access`, kế thừa `feat/phase0-resource-role-ownership` (9176122).
- Thi: giới hạn theo trường/lớp/phân công; che đáp án với HS/PH và tài khoản chỉ xem; chỉ chủ bài được nộp, không nhận câu hỏi trùng/ngoài đề. Chấm lại tự luận tính lại tổng, kiểm tra trần điểm. Không sửa câu hỏi sau khi đã có bài làm.
- Lượt thi mới có attemptNumber và unique partial index để chặn tạo trùng đồng thời. Bản ghi cũ không bắt buộc backfill; khi triển khai cần bảo đảm index được tạo trước khi nhận lượt thi mới.
- Các API đọc thi/học liệu/thư viện/CSVC/hạnh kiểm/mẫu kiểm tra quyền view (HS/PH có ngoại lệ own_data). Lịch tạo/xóa dùng quyền announcements tương ứng; duyệt CSVC cần execute và vai trò nghiệp vụ.
- Subscription invoice, audit, tìm kiếm/lịch áp dụng tenant scope; tạo thông báo/lịch kiểm tra tham chiếu lớp. Tạo trường chỉ nhận trường dữ liệu được phép, xác minh cụm.
- Xác thực chặn role thuộc tenant khác. Danh bạ chỉ trả thông tin liên hệ tối thiểu; mật khẩu mặc định bị loại khỏi truy vấn/populate, đăng nhập chọn lại trường mật khẩu một cách tường minh.
- Kiểm thử backend `npm test`: **78/78 đạt** trên MongoDB tạm, gồm đăng nhập mật khẩu, không lộ hash, role sai tenant, đồng thời tạo lượt thi và chấm lại.
- Chưa coi đây là kiểm thử toàn bộ nghiệp vụ thi: thời lượng tự nộp, UI chấm tự luận và các chức năng mới vẫn ở đợt riêng. Tiếp tục 0.2b và 0.6 trước khi đóng Đợt 0.

### Bàn giao tiếp: ghi dữ liệu học vụ

- Nhánh `feat/phase0-academic-write-scope`, nền `feat/phase0-academic-read-scope` (79f3e1f).
- Thêm writeScope: resolve trường, lấy document trong scope, xác minh quan hệ lớp/môn/năm/HS và phân công GV; whitelist trường được sửa.
- Ghi điểm, thêm cột điểm, điểm danh, tạo invoice kiểm tra quan hệ trước ghi. Số tiền thu phải hữu hạn và > 0.
- Sửa môn/xóa phân công/truy cập danh sách HS nhận actor từ controller; kiểm tra tenant. Không còn tự đổi role một user bất kỳ khi gán GVCN; chỉ nhận giáo viên hợp lệ.
- Academic year/class/subject/assignment tạo mới dùng whitelist; đổi schoolId qua payload không chuyển dữ liệu sang trường khác.
- Kiểm thử `npm test` backend: **61/61 đạt**, thêm ca ghi đúng phân công, ghi sai lớp/HS/trường, nâng role qua gán GVCN, thu tiền âm/0 và danh sách HS của PH.
- Không migration. Tiếp theo: quyền ghi các module tài nguyên, thi, user/role và UI còn lại. Chưa đánh dấu hoàn tất 0.5b.
- Push thành công: `dcd384a`.

### Bàn giao tiếp: quyền sở hữu tài nguyên và role

- Nhánh `feat/phase0-resource-role-ownership`, kế thừa `feat/phase0-academic-write-scope`.
- Thư viện/học liệu/CSVC: lấy bản ghi trong scope trước sửa/xóa/duyệt/mượn/trả; người mượn phải cùng trường. Sửa sách chỉ nhận metadata, không cho sửa tenant hoặc tồn kho tùy ý. CSVC kiểm tra trạng thái và không tự duyệt.
- Mẫu: chỉ Super Admin sửa mẫu hệ thống, quản lý cụm sửa mẫu của cụm; apply kiểm tra mẫu tồn tại/active và đúng cụm của trường.
- User: kiểm tra school/class/parentOf trước tạo/sửa, suy cluster từ trường, ngăn chuyển trường ngoài scope và gán role tenant khác.
- Role mới thêm schoolId/clusterId; người quản lý chỉ sửa/xóa role do phạm vi mình sở hữu, không cấp permission mình không có. Role cũ không có metadata coi là role dùng chung, chỉ Super Admin sửa; không đoán và tự backfill quyền sở hữu. Cần Super Admin tạo bản role riêng cho trường nếu muốn chỉnh role dùng chung.
- Schema thêm trường nullable, không cần migration phá dữ liệu. Cache/API trả scope role để frontend kiểm tra nút quản lý.
- `npm test` backend: **68/68 đạt**. Chưa hoàn tất thi online và nút nghiệp vụ/E2E.

## Việc tiếp theo — sau nền tảng Phase 1

1. Tiếp tục từ `feat/phase1-backup-restore`; kiểm tra git status trước khi sửa. File kế hoạch cũ `docs/feature-gap-implementation-plan.md` không tồn tại trong checkout này; tài liệu này là điểm bàn giao hiện hành.
2. Kho file local và adapter S3 đã có. Không tự chuyển storage hoặc chạy lệnh bảo trì apply trên database đang phục vụ; đọc hướng dẫn vận hành trước. Chưa chọn dịch vụ cloud hoặc cấp secret mới.
3. Job/queue đã có, đọc `phase1-job-queue.md` trước khi bổ sung handler. API không tự chạy worker; không tự gửi email thử tới người dùng hoặc chạy job trên DB thật trong phiên code.
4. 2FA/password policy và backup/restore đã có trong phạm vi mục 1.3/1.4. Đọc runbook trước khi vận hành; không tự chạy restore --apply trên DB thật. Chọn nghiệp vụ tiếp theo từ danh sách spec còn thiếu, lập phạm vi cụ thể rồi kiểm thử, tạo nhánh/push và ghi tài liệu sau từng chức năng.
5. Giữ riêng các việc nghiệp vụ: thời lượng/tự nộp thi, giao dịch đồng thời học phí/tồn kho, di chuyển trường giữa cụm và migration dữ liệu liên quan, bộ duyệt custom role, Google/SMTP/SMS/Zalo/payment thật. Chưa có kết quả UAT cho các phần này.

Ghi chú môi trường: npm ghi nhận 7 cảnh báo vulnerability ở backend và 4 ở frontend từ cây dependency; chưa chạy audit fix vì có thể thay major/ngoài scope. File .env và hai file untracked ban đầu không thuộc các commit bàn giao.


## Phase 2.6 - Thanh toan hoc phi online (8.4)

- Nhanh: `feat/phase2-online-payments`.
- Them `OnlinePayment`, adapter gateway MOCK/VNPay/MoMo, request idempotency va webhook HMAC. Callback PAID dung transaction de cap nhat hoa don va tao duy nhat Payment ONLINE; callback lap khong tao thu trung.
- Hoc sinh/phu huynh duoc cap `PAY_ONLINE` va chi thanh toan hoa don cua ban than/con; ke toan/quan tri van xem giao dich qua quyen hoc phi.
- API: POST/GET `/online-payments`, GET `/online-payments/:id`, POST `/online-payments/webhook/:provider`. Fees page co nut tao checkout MOCK.
- Test rieng: `node --test test/online-payment.test.js` - **2/2**; frontend `npm run build` - dat.
- Cau hinh gateway qua `PAYMENT_MOCK_SECRET`, `VNPAY_*`, `MOMO_*`; khong commit secret. Chi tiet: [phase2-online-payments.md](phase2-online-payments.md).


## Phase 2.7 - Hen giao vien va khao sat hai long (8.6/8.8)

- Nhanh: `feat/phase2-appointments-surveys`.
- Them TeacherAppointment va SatisfactionSurvey; parent dat lich cho con, giao vien xac nhan/tu choi/hoan tat, parent huy va danh gia 1-5. Scope theo truong, child relation, teacher owner va unique survey.
- API: GET/POST `/appointments`, PATCH review/cancel, POST survey, GET surveys; React page `/appointments`.
- Test rieng: `node --test test/appointments-surveys.test.js` - **2/2**. Chi tiet: [phase2-appointments-surveys.md](phase2-appointments-surveys.md).


## Phase 2.8 - Khen thuong va ky luat (4.10)

- Nhanh: `feat/phase2-rewards-discipline`.
- Them RewardDisciplineRecord (REWARD/DISCIPLINE) tach khoi xep loai hanh kiem; giao vien tao cho lop duoc phan cong, quan ly duyet, HS/PH chi xem ban ghi APPROVED cua minh.
- API `/rewards` va giao dien React them tao/duyet, co scope truong va ca nhan.
- Test rieng: `node --test test/rewards-discipline.test.js` - **2/2**. Chi tiet: [phase2-rewards-discipline.md](phase2-rewards-discipline.md).


## Phase 2.9 - Tuyen sinh online (4.6)

- Nhanh: `feat/phase2-online-admissions`.
- Them AdmissionApplication, form public theo ma truong/subdomain, tracking code va tra cuu trang thai; staff scope theo truong/cum duyet UNDER_REVIEW/ACCEPTED/REJECTED/WAITLISTED.
- API public `/admissions/public`, quan ly `/admissions`; React form `/admissions/apply` va bang duyet.
- Test backend rieng **2/2**, Playwright E2E **1/1**, build dat. Chi tiet: [phase2-online-admissions.md](phase2-online-admissions.md).

## Phase 2.10 - Ho so scan va chung nhan dien tu (5.4-5.5)

- Nhanh: `feat/phase2-student-dossiers-certificates`.
- Them StudentDocument, upload tai lieu quet theo hoc sinh voi quota storage va phan quyen school/cluster; HS/PH chi xem tai lieu cua minh/con.
- Them xuat bang diem dien tu ket hop diem, hanh kiem va khen thuong/ky luat da duyet; PDF native nhe va Word-compatible RTF `.doc`.
- API: `/student-documents/upload`, `/student-documents`, `/student-documents/:id/download`, `/students/:studentId/certificate/:format`; React `/student-documents`.
- Test rieng backend **2/2**; production build dat. Chi tiet: [phase2-student-dossiers-certificates.md](phase2-student-dossiers-certificates.md).

## Phase 2.11 - Khoan thu khac, nhac no va quan ly luong (9.2, 9.4, 9.6)

- Nhanh: `feat/phase2-fees-payroll`.
- Mo rong hoa don voi category/description; danh sach cong no va nhac no hang ngay idempotent qua Notification cho hoc sinh + phu huynh.
- Them PayrollRecord theo thang, tinh net luong va quy trinh DRAFT -> APPROVED -> PAID.
- API `/fees/debtors`, `/fees/reminders/run`, `/payroll`; React them truong khoan thu, nut nhac no va trang bang luong.
- Test backend rieng **2/2**; production build dat. Chi tiet: [phase2-fees-payroll.md](phase2-fees-payroll.md).

## Phase 2.12 - Bao tri thiet bi chi tiet (10.4)

- Nhanh: `feat/phase2-equipment-maintenance`.
- Them EquipmentAsset va EquipmentMaintenance: ton kho, serial/vị tri/bao hanh, muc do uu tien, chi phi va quy trinh OPEN -> IN_PROGRESS -> RESOLVED/CANCELLED.
- Bao cao su co tu dong chuyen thiet bi sang MAINTENANCE; khi xu ly phieu cuoi cung thi tra ve AVAILABLE; phan quyen manager/nguoi bao cao tach rieng.
- API `/equipment`, `/equipment-maintenance`; React `/equipment-maintenance`.
- Test backend rieng **1/1**; production build dat. Chi tiet: [phase2-equipment-maintenance.md](phase2-equipment-maintenance.md).

## Phase 2.13 - SSO doanh nghiep, dang nhap so dien thoai va thong bao realtime (11.1-11.2)

- Nhanh: `feat/phase2-sso-phone-realtime`.
- Them signed enterprise SSO assertion, phone OTP 5 phut/5 lan va adapter SMS; them adapter SMS/Zalo/push co timeout, khong gui that khi chua cau hinh.
- Them SSE `/notifications/stream` co auth, hook Notification -> eventBus va endpoint yeu cau delivery; frontend co API/thunk va form OTP.
- Test backend rieng **2/2** (OTP, SSO, SSE, delivery); production build dat. Chi tiet: [phase2-sso-phone-realtime.md](phase2-sso-phone-realtime.md).
