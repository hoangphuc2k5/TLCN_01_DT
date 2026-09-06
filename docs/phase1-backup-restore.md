# Phase 1.4 — Backup/Restore

Cập nhật: 07/09/2026. Nền: `feat/phase1-auth-security` tại `2ee28d1`. Nhánh bàn giao: `feat/phase1-backup-restore`. Kết quả kiểm thử cuối và commit xem [implementation-progress.md](implementation-progress.md).

## Chức năng

CLI dành cho người vận hành có quyền truy cập database và khóa mã hóa:

- `create`: sao lưu toàn bộ database ứng dụng, các collection rỗng, index, validator/collation và file vật lý được FileAsset quản lý. Giữ nguyên BSON/ID, cả các trường mật khẩu/2FA mà Mongoose thường ẩn. Đọc file local thật hoặc qua adapter S3 hiện có.
- `verify`: xác thực AES-GCM toàn bộ archive, kiểm tra cấu trúc BSON, thứ tự/số lượng record, từng file SHA-256/kích thước, school ID/key và tổng quota. Không cần kết nối MongoDB.
- `restore`: mặc định chỉ lập kế hoạch. Khi có `--apply`, ghi vào **database mới rỗng, khác tên database nguồn**, và **thư mục local mới chưa tồn tại**. Không drop database, không ghi đè file hoặc tự chuyển môi trường đang chạy.
- Sau phục hồi: giữ ID/quan hệ, mật khẩu và secret TOTP; xóa challenge/setup, mã khôi phục cũ và bộ đếm thử đăng nhập; yêu cầu JWT secret mới. Job QUEUED/RUNNING chuyển CANCELLED, email PENDING/ENQUEUED chuyển NOT_REQUESTED để không tự gửi lại thư cũ.

Đây là sao lưu logic **trong thời gian bảo trì**: dừng tất cả API, worker, seed/import và các chương trình ghi dữ liệu trước khi tạo bản sao, rồi giữ trạng thái đó đến khi lệnh kết thúc. `--maintenance` là xác nhận của người vận hành, không phải cơ chế tự dừng tiến trình hoặc khóa mọi writer. CLI từ chối FileAsset chưa READY và job RUNNING; vẫn cần dừng các writer khác. Không tuyên bố snapshot nhất quán nếu vẫn có ghi đồng thời.

## Cấu trúc code

| File | Vai trò |
| --- | --- |
| `scripts/backup.js` | CLI: parse chặt tham số, kết nối native driver, mặc định dry run, xuất báo cáo không chứa URI/khóa |
| `src/backup/backupService.js` | Facade điều phối đọc DB/file, tạo/verify/restore, giới hạn batch và commit điểm phục hồi |
| `mongoSnapshot.js` | Adapter MongoDB: raw BSON cursor, metadata/index, các biến đổi auth/queue khi restore |
| `archive.js` | Stream mã hóa/giải mã AES-256-GCM, frame BSON giới hạn kích thước, staging riêng và công bố file hoàn chỉnh |
| `snapshotValidator.js` | State machine kiểm tra thứ tự record, checksum, số lượng, liên kết tenant và quota |
| `restoreGuard.js` | Dấu tiến trình/commit bền vững, kiểm tra khóa cấu hình trước khởi động API/worker |
| `safety.js` | Quy tắc đường dẫn, kích thước, tên database/collection, key và mã lỗi an toàn |

Không thêm dependency: dùng Node crypto/streams và MongoDB/BSON do dependency Mongoose hiện có cung cấp. Không dựng thêm tầng Factory/Strategy khi chỉ có một định dạng backup và một đích restore local.

## Định dạng và tài nguyên

- File `.edubak` có magic `EDUBAK01`, IV ngẫu nhiên 12 byte, ciphertext và tag GCM 16 byte. Header được xác thực làm AAD. Payload là các frame BSON: manifest → collection/document/end → file/chunk/end → end.
- Đây là định dạng ứng dụng phiên bản 1, **không phải archive của mongodump**; dùng CLI này để verify/restore. Không lưu `.env`, JWT secret, khóa mã hóa backup, khóa TOTP, thông tin đăng nhập MongoDB hoặc AWS trong archive. DB vẫn chứa hash mật khẩu và ciphertext TOTP nên archive luôn cần được bảo vệ.
- Bản sao được stream mã hóa ra file tạm; đọc lại, giải mã và verify trước khi công bố tên đích bằng hard link trong cùng thư mục, không ghi đè. Thư mục backup phải nằm trên filesystem hỗ trợ hard link (đã kiểm thử NTFS); không ghi backup vào bên trong private file root.
- Giải mã toàn bộ sang thư mục staging riêng trước; chỉ sau khi tag GCM hợp lệ mới parse và kiểm tra nội dung. Chỉ sau verify/preflight mới ghi database/file đích. Staging chứa plaintext nhạy cảm, được xóa khi lệnh kết thúc kể cả lỗi thông thường; mất điện/SIGKILL có thể để lại staging, cần xử lý thủ công khi chắc chắn không còn tác vụ đang dùng.
- Mặc định tối đa 10 GiB payload/archive gần tương đương, cấu hình tối đa 50 GiB; không nén. Chunk file tối đa 64 KiB, BSON document tối đa 16 MiB; batch insert tối đa 100 document hoặc khoảng 4 MiB (document đơn lớn hơn vẫn được xử lý). Validator giữ metadata tối đa 100.000 file, không giữ toàn bộ database/file trong RAM. Tối đa 1.000 collection, 64 secondary index mỗi collection.
- Cần đủ dung lượng cho archive mã hóa, một bản plaintext staging và dữ liệu/file đích khi restore. Trên POSIX, file/staging dùng mode 0600/0700. Trên Windows phải cấp ACL thư mục chỉ cho tài khoản vận hành, ưu tiên volume mã hóa; mode POSIX không thay thế ACL Windows. Không đặt staging/backup trong web root hoặc thư mục đồng bộ công khai.

## Cấu hình

Chỉ `.env.example` được bổ sung mẫu; không có `.env` thực tế nào bị chỉnh. Cấp giá trị bằng môi trường/secret manager của phiên vận hành, không đặt secrets trên command line hoặc commit Git.

| Biến | Sử dụng |
| --- | --- |
| `BACKUP_ENCRYPTION_KEY` | Bắt buộc: 32 byte ngẫu nhiên biểu diễn bằng 64 hex. Giữ và sao lưu tách biệt với file backup; mất khóa thì không giải mã được |
| `BACKUP_STAGING_ROOT` | Thư mục staging riêng; mặc định `ExpressJS/storage/backup-staging` |
| `BACKUP_MAX_BYTES` | Mặc định 10737418240; giới hạn payload; không vượt 50 GiB |
| `MONGO_DB_URL` | Nguồn khi create; URI cần chọn đúng database ứng dụng |
| `JWT_SECRET` | Khóa của nguồn, dùng fingerprint trong manifest để yêu cầu thay khóa khi restore |
| `AUTH_MFA_ENCRYPTION_KEY` | Khóa TOTP nguồn; bắt buộc nếu có tài khoản bật 2FA, chỉ fingerprint được ghi vào archive |
| `FILE_LOCAL_ROOT` | Root file nguồn local; các metadata driver S3 dùng bucket/key và AWS credential chain hiện có |
| `RESTORE_DB_URL` | Kết nối MongoDB đích riêng; bắt buộc khi plan/apply restore. Không tự lấy MONGO_DB_URL làm đích |
| `RESTORE_JWT_SECRET` | Khóa JWT **mới**, ít nhất 32 ký tự, khác fingerprint khóa nguồn |
| `RESTORE_MFA_ENCRYPTION_KEY` | Phải khớp khóa TOTP nguồn nếu archive có MFA; không tự đổi khóa này |

Các khóa cần có entropy ngẫu nhiên và được quản lý riêng; không dùng khóa minh họa trong test cho triển khai. Verify độc lập chỉ cần BACKUP_ENCRYPTION_KEY và staging; không cần JWT/MFA key hoặc database.

## Quy trình vận hành

Chạy từ thư mục ExpressJS. Đường dẫn ví dụ là đường dẫn tuyệt đối cần thay theo môi trường; các lệnh dưới không được chạy trên database người dùng trong đợt triển khai này.

1. Dừng API/worker và mọi writer của nguồn; chờ tác vụ đang chạy hoàn tất. Nếu còn UPLOADING/DELETING, áp dụng quy trình phục hồi kho file đã có trong `phase1-file-storage.md` sau khi kiểm tra. Job RUNNING còn lại do crash cần được người vận hành đối chiếu tác động bên ngoài và sửa trạng thái theo quy trình quản trị; CLI backup không tự đoán email đã gửi hay chưa.
2. Cấp cấu hình nguồn/khóa trong môi trường riêng, tạo và kiểm tra bản sao:

```powershell
npm run backup -- create --file 'D:\SchoolOps\backups\school-2026-09-07.edubak' --maintenance
npm run backup -- verify --file 'D:\SchoolOps\backups\school-2026-09-07.edubak'
```

3. Khi lệnh create kết thúc thành công, có thể khởi động lại nguồn. Sao chép archive sang nơi lưu trữ độc lập và verify lại bản sao chép. CLI không tự upload archive, xóa bản cũ hoặc quản lý retention.
4. Chuẩn bị database đích và root file đích mới; không chạy API/worker trỏ vào đích trong khi restore. Cấp RESTORE_DB_URL, RESTORE_JWT_SECRET, RESTORE_MFA_ENCRYPTION_KEY qua môi trường. Xem kế hoạch trước:

```powershell
npm run backup -- restore --file 'D:\SchoolOps\backups\school-2026-09-07.edubak' --target-db school_recovered_20260907 --storage-root 'D:\SchoolOps\recovered\files-20260907' --maintenance
```

5. Kiểm tra báo cáo đích/collections/số file/bytes và các biến đổi dự kiến. Để thực hiện, chạy cùng tham số với `--apply`:

```powershell
npm run backup -- restore --file 'D:\SchoolOps\backups\school-2026-09-07.edubak' --target-db school_recovered_20260907 --storage-root 'D:\SchoolOps\recovered\files-20260907' --maintenance --apply
```

6. Lệnh thành công trả `applied: true`. Dấu MongoDB `restoreguard`, `_id: restore` phải có trạng thái COMPLETE; file `.restore-report.json` trong root mới chỉ là báo cáo dữ liệu đã sao chép, không thay thế trạng thái commit trong DB. Giữ marker COMPLETE, không xóa; nó chặn lượt restore cạnh tranh đến muộn và kiểm tra cấu hình khi khởi động. Khi backup lại database đã restore, marker nội bộ này được kiểm tra rồi bỏ khỏi archive.
7. Cấu hình một instance API kiểm tra trỏ tới DB mới; `JWT_SECRET` bằng RESTORE_JWT_SECRET vừa dùng, `AUTH_MFA_ENCRYPTION_KEY` bằng khóa gốc, `FILE_STORAGE_DRIVER=local`, `FILE_LOCAL_ROOT` bằng root mới. Guard được kiểm tra bằng native connection trước Mongoose auto-create/index/seed; sai trạng thái hoặc fingerprint khóa thì API/worker không khởi động. Không tự đổi DNS, URI hay `.env` của môi trường đang chạy.
8. Kiểm tra đăng nhập/quyền theo tenant, hồ sơ/điểm/học phí và tải file; đối chiếu báo cáo. JWT cũ phải bị từ chối. Người có 2FA dùng authenticator gốc, đợi mã ở bước thời gian sau restore; mã khôi phục cũ bị vô hiệu hóa và cần tạo bộ mã mới tại Tài khoản. Mật khẩu khôi phục theo snapshot; nếu phục hồi sau sự cố bảo mật, đơn vị cần đánh giá/reset các mật khẩu liên quan.
9. Chỉ chuyển người dùng sang đích sau khi kiểm tra. Giữ worker dừng đến khi đã đối chiếu queue và cấu hình gửi mail. Job chờ đã CANCELLED/RESTORE_REVIEW_REQUIRED; notification cũ không tự được gửi lại, kể cả retry job cũ sẽ được handler bỏ qua. Muốn gửi lại một thông báo, tạo ý định gửi mới sau khi người vận hành xác nhận. Không gửi email thật trong smoke test tự động.

## Khi gặp lỗi

| Mã lỗi | Cách xử lý |
| --- | --- |
| `MAINTENANCE_REQUIRED` | Dừng writer rồi dùng --maintenance; flag không tự dừng dịch vụ |
| `UNFINISHED_FILE_OPERATIONS` / `RUNNING_JOBS_REQUIRE_REVIEW` | Rà file/job đang dở; xử lý theo runbook, không sửa trạng thái bừa để bỏ qua kiểm tra |
| `FILE_CHECKSUM_MISMATCH` / `FILE_SIZE_MISMATCH` / `STORAGE_QUOTA_MISMATCH` | Đối chiếu metadata, file và quota nguồn trước khi sao lưu lại |
| `ARCHIVE_AUTHENTICATION_FAILED` | Sai khóa, file hỏng hoặc bị thay đổi; lấy lại đúng khóa/bản sao, không phục hồi plaintext từ staging |
| `UNSUPPORTED_COLLECTION*` | Không hỗ trợ view, timeseries, capped, collection hệ thống, encrypted collection hoặc tùy chọn ngoài phạm vi; dùng công cụ MongoDB phù hợp |
| `TARGET_DATABASE_NOT_EMPTY` / `NEW_STORAGE_ROOT_REQUIRED` | Chọn database/root mới; CLI không có --drop/overwrite |
| `ROTATED_JWT_SECRET_REQUIRED` / `MFA_KEY_MISMATCH` | Cấp JWT secret mới và đúng khóa TOTP gốc |
| `RESTORE_INCOMPLETE` | Marker chưa COMPLETE; không khởi động target hoặc tự xóa marker để chạy tiếp |
| `RESTORE_JWT_CONFIG_MISMATCH` / `RESTORE_MFA_CONFIG_MISMATCH` | Runtime chưa dùng đúng khóa đã được verify lúc restore |
| `BACKUP_OPERATION_FAILED` | CLI che lỗi driver/filesystem để không lộ bí mật. Kiểm tra quyền/kết nối/dung lượng/phiên bản theo môi trường và marker đích; không suy ra restore đã thành công |

Lỗi sau khi claim đích giữ marker FAILED/RESTORING và dữ liệu/file đích có thể dở dang; nguồn vẫn giữ nguyên. Không tự rollback bằng drop vì có thể ảnh hưởng tiến trình khác. Điều tra rồi dùng database và root **mới** cho lần thử tiếp; dọn đích cũ bằng quy trình quản trị riêng sau khi đã xác minh rõ đường dẫn/database. Hai restore cùng chọn một đích chỉ có một lượt claim thành công.

Marker COMPLETE lưu fingerprint khóa ở thời điểm restore. Nếu sau này chủ động xoay JWT/MFA key, cần kế hoạch cập nhật fingerprint của marker cùng cấu hình và chuyển đổi ciphertext TOTP nếu đổi khóa TOTP; chưa có CLI key rotation trong đợt này. Không xóa marker để né lỗi cấu hình.

## Kiểm thử và giới hạn

Kết quả: `npm test` tại ExpressJS **165/165 đạt**, gồm **20 test backup**; `git diff --check` đạt. Frontend không thay đổi trong đợt này nên không chạy lại các kiểm thử UI/build; kết quả 10 policy/29 E2E/build ở Phase 1.3 được giữ làm lịch sử, không gọi là lượt kiểm thử mới.

Test dùng MongoMemoryReplSet riêng, native MongoDB/BSON, file tạm thật và child process CLI/API/worker. Bao gồm raw BSON Long/Decimal/Binary/Timestamp, unique index/validator, collection rỗng, checksum/quota/tenant, sai khóa/cắt file/tamper, archive malformed, symlink/junction, dry run, đích không rỗng, fail giữa chừng, concurrent restore, startup guard, tạo backup từ target đã restore, đăng nhập TOTP và download bytes qua API sau restore. S3 đọc bằng adapter test giả, không kết nối bucket thật. Không kết nối Atlas, không gửi Gmail hoặc đổi cấu hình production.

Phạm vi hiện tại là backup toàn instance và restore sang local mới. Chưa có UI/HTTP restore, lịch tự động, retention, offsite replication, restore riêng một trường, restore trực tiếp vào S3, PITR/oplog, mã hóa KMS envelope/key rotation, resume restore bị ngắt, test tải hàng chục GiB hoặc test disaster recovery trên hạ tầng thật. Không sao lưu DB users/roles quản trị MongoDB, secret manager, external URL của học liệu cũ hoặc file không có FileAsset. Cần phiên bản MongoDB/BSON/index tương thích; `verify` kiểm tra integrity/cấu trúc nhưng không thay thế thử restore trên phiên bản DB đích (index/validator vẫn có thể bị DB từ chối lúc apply, marker sẽ giữ FAILED).

Tham chiếu: [MongoDB backup bằng công cụ](https://www.mongodb.com/docs/manual/tutorial/backup-and-restore-tools/), [BSON Node driver](https://www.mongodb.com/docs/drivers/node/current/data-formats/bson/), [Node crypto GCM](https://nodejs.org/api/crypto.html). Với yêu cầu backup nóng/PITR/hạ tầng lớn, dùng chiến lược MongoDB/Atlas tương ứng thay vì mở rộng tuyên bố của CLI bảo trì này.
