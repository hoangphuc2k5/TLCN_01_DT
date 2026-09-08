# Phase 1.1 — Kho file học liệu theo trường

Nền: `integration/phase0` tại `cdbdb11`. Nhánh chức năng: `feat/phase1-file-storage`. Đây là chức năng đầu tiên của Phase 1; queue, 2FA/password policy và backup/restore chưa được triển khai trong nhánh này.

Đã push code/test tại `f73ec42` lên `origin/feat/phase1-file-storage`. Bản này được bàn giao trên nhánh riêng, chưa merge vào main hoặc integration/phase0.

## Thay đổi người dùng thấy

Trang Học liệu có lựa chọn liên kết hoặc tải file, công tắc chia sẻ, dung lượng trường và giới hạn mỗi file. File đã upload được tải bằng nút **Tải file**, có JWT; không tạo URL public. Xóa học liệu sẽ xóa file và hoàn dung lượng sau khi xóa vật lý thành công. Luồng học liệu dạng link hiện có vẫn hoạt động.

Nhận PDF, PNG/JPG, UTF-8 TXT, DOCX/XLSX/PPTX. Mặc định tối đa 10 MiB/file; kiểm tra extension, MIME và chữ ký đầu file. Office chỉ kiểm tra lớp vỏ ZIP, không phân tích toàn bộ tài liệu hay quét virus. File luôn tải dạng attachment/octet-stream/nosniff, không render trực tiếp trong trang. Tên file tiếng Việt được giữ; tên người dùng không được dùng làm đường dẫn lưu trữ.

## API và quyền

| API | Nội dung / quyền |
| --- | --- |
| `POST /v1/api/materials/upload` | Multipart: `file`, `title`; tùy chọn `classId`, `subjectId`, `schoolId`, `topic`, `description`, `isShared`. Cần materials.create; tham chiếu trường/lớp/môn theo Phase 0 |
| `GET /v1/api/files/usage?schoolId=...` | Dung lượng đã dùng/giữ chỗ, hạn mức, maxFileBytes; materials.view, chỉ trường trong scope |
| `GET /v1/api/files/:id` | Metadata tối thiểu: tên, MIME, bytes, SHA-256, ngày tạo; không trả key/bucket/driver |
| `GET /v1/api/files/:id/download` | Stream file sau kiểm tra quyền hiện hành và scope học liệu; Cache-Control private/no-store |
| `DELETE /v1/api/materials/:id` | materials.delete và chủ sở hữu/Admin trường/Super Admin trong tenant; xóa file đính kèm nếu có |

Quyền đọc file dùng materials.view hoặc own_data.view của HS/PH, sau đó giao với scope học liệu. HS/PH chỉ xem bản chia sẻ của lớp mình/con hoặc toàn trường. Staff xem học liệu chia sẻ trong trường; bản chưa chia sẻ chỉ tác giả, Admin trường, Giáo vụ, Super Admin trong scope. Tài khoản chỉ có quyền đọc không upload/xóa được. Admin toàn hệ thống/cụm cần gửi schoolId cho API tạo/usage nếu tài khoản chưa gán trường; chưa bổ sung bộ chọn trường upload riêng cho các tài khoản này trên UI.

## Lưu trữ, hạn mức và lỗi gián đoạn

- `FileAsset` lưu schoolId, người upload, mục đích MATERIAL, tên/MIME/size/SHA-256, driver/bucket/key và trạng thái. Key do server sinh: `<schoolId>/<UUID>`.
- `LearningMaterial.fileAssetId` liên kết một file mới; JSON tạo link không nhận fileAssetId do client gửi. Chưa tự nhập lại các fileUrl cũ vào kho.
- `School.storageUsedBytes` gồm file sẵn sàng và dung lượng đã giữ chỗ; trường cũ thiếu bộ đếm được coi là 0. Gói ACTIVE còn hạn dùng `Subscription.storageGb × 1024³`. Không có gói/gói hết hạn/hủy dùng hạn mức mặc định 5 GiB. Giảm gói không xóa file cũ; upload tiếp theo bị chặn khi vượt hạn mức, vẫn cho tải/xóa.
- Giao dịch MongoDB cùng tạo metadata/học liệu và tăng bộ đếm có điều kiện. Hai upload đồng thời cùng trường không vượt hạn mức. Không gọi storage bên trong callback transaction có thể retry.
- Upload: giữ chỗ với UPLOADING → ghi file → READY. Lỗi ghi storage sẽ xóa file dở/metadata và trả dung lượng; nếu cleanup lỗi, metadata và dung lượng được giữ để phục hồi.
- Xóa: chuyển DELETING bằng transaction → xóa vật lý → transaction xóa metadata/học liệu và trừ bytes. Lỗi storage không trả dung lượng sớm. Thử lại không trừ dung lượng hai lần.
- Process crash có thể để lại UPLOADING/DELETING. Chưa có worker tự phục hồi; dùng lệnh bảo trì dưới đây. Không tự hết hạn giữ chỗ vì có thể đụng upload còn đang ghi.

## Cấu hình vận hành

**Upload/xóa cần MongoDB replica set hoặc sharded cluster hỗ trợ transaction.** Atlas hoặc replica set local đáp ứng mô hình này; standalone trả 503 rõ ràng khi upload, không lặng lẽ bỏ qua transaction. Không sửa `.env` hay khởi tạo lại database người dùng trong lượt triển khai.

Chạy `npm ci` trong ExpressJS sau khi lấy nhánh. Các biến mẫu được thêm vào `ExpressJS/.env.example`; file production example chưa track của người dùng được giữ nguyên.

```dotenv
FILE_STORAGE_DRIVER=local
FILE_LOCAL_ROOT=
FILE_MAX_BYTES=10485760
FILE_DEFAULT_QUOTA_BYTES=5368709120
```

Local mặc định `ExpressJS/storage/private`, đã gitignore, không expose bằng express.static. Khi triển khai, đặt FILE_LOCAL_ROOT là đường dẫn tuyệt đối trên volume bền vững chỉ API được ghi. Đổi root không tự di chuyển file cũ; cần di chuyển dữ liệu tương ứng khi bảo trì. Giới hạn cấu hình upload tối đa 64 MiB; multer giữ một file trong RAM nên cần tính số request đồng thời khi vận hành.

Để dùng S3:

```dotenv
FILE_STORAGE_DRIVER=s3
FILE_S3_BUCKET=your-private-bucket
AWS_REGION=us-east-1
FILE_S3_ENDPOINT=
FILE_S3_FORCE_PATH_STYLE=false
```

SDK dùng chuỗi credentials chuẩn của AWS, ưu tiên IAM role khi triển khai. Bucket phải private, bật Block Public Access; cấp GetObject/PutObject/DeleteObject cho prefix cần thiết, không cấp public-read. Không tạo bucket/cloud resource và không ghi khóa thật trong repo. Endpoint/path-style phục vụ S3 compatible khi cần. Mỗi FileAsset giữ driver/bucket nên đổi driver chỉ ảnh hưởng file upload mới; phải giữ quyền truy cập kho cũ cho file cũ. Bộ đếm tính bytes logic của file hiện hành, không tính phiên bản cũ/chi phí vật lý của bucket bật versioning.

Adapter thực hiện PutObject/GetObject/DeleteObject; tải đi qua API để kiểm tra quyền hiện hành, không trả presigned URL có thể tái dùng sau khi thu hồi quyền.

## Phục hồi file dở

Chạy từ ExpressJS. Mặc định chỉ liệt kê, không thay đổi:

```powershell
node scripts/recover-file-storage.js
```

Muốn phục hồi: **dừng tất cả API/worker đang ghi file trước**, dùng đúng database và storage config, rồi chạy:

```powershell
node scripts/recover-file-storage.js --apply --maintenance
```

Lệnh xóa các file UPLOADING/DELETING và metadata học liệu tương ứng, hoàn dung lượng bằng transaction; READY được giữ. `--maintenance` là xác nhận vận hành của người chạy, không tự dừng server. Nếu storage vẫn lỗi, lệnh dừng và giữ reservation để thử lại. Không chạy apply trên database người dùng trong phiên này. Không dùng lệnh này để sửa tùy tiện bộ đếm đã bị chỉnh trực tiếp trong DB.

## Kiểm thử và giới hạn

Kết quả 06/09/2026: backend **106/106**, frontend policy **9/9**, build production đạt; E2E đầy đủ **25/25**. Sau bản chỉnh phục hồi/tên file đã chạy lại backend và luồng E2E file bị ảnh hưởng. Build vẫn có cảnh báo chunk khoảng 1,50 MB.

- Backend: `cd ExpressJS`, `npm test`. Bộ mới kiểm tra replica set thật tạm, bytes local thật, tên tiếng Việt, scope trường/lớp/con, file riêng, quyền đọc/ghi, định dạng/kích thước, quota đồng thời, gói hết hạn, lỗi metadata/storage, xóa retry và phục hồi. Có thêm test standalone trả 503.
- Frontend: `cd ReactJS`, `npm test`, `npm run build`, `npm run test:e2e`. E2E mới upload file riêng, tải và so sánh bytes rồi xóa; chạy cùng 24 ca Phase 0. Fixture dùng replica set và thư mục tạm, ép driver local, không dùng database/storage của `.env`.
- S3 hiện được kiểm tra bằng client giả ở ranh giới SDK (loại lệnh, bucket/key/body); **chưa xác nhận bucket/IAM/network S3 thật**. Trước dùng S3 production cần smoke test với cấu hình thực tế. Local đã kiểm tra toàn luồng.
- Chưa có multipart/resumable upload file lớn, antivirus, workflow duyệt tài liệu, kho hồ sơ/học bạ, đồng bộ legacy URL, backup hoặc tự phục hồi bằng queue. Những việc này không được tính là đã xong.

Tài liệu kỹ thuật tham chiếu: [Mongoose transactions](https://mongoosejs.com/docs/transactions.html), [AWS SDK v3 S3 examples](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html).
