# Tiến trình triển khai

Cập nhật: 05/09/2026. Đang thực hiện Đợt 0: phân quyền, tenant và kiểm thử.

## Quy trình bàn giao

- Mỗi chức năng: sửa code → kiểm thử → ghi kết quả → tạo nhánh, commit và push origin.
- Chỉ stage file liên quan; không commit .env hoặc file cấu hình người dùng chưa kiểm tra.
- Không chạy seedDemo trên database người dùng. Kiểm thử bằng MongoDB tạm.
- Các nhánh tiếp theo có thể kế thừa nhánh trước; ghi rõ nhánh nền để review.

## Checklist Đợt 0

- [x] 0.1 Quyền API theo hành động ở các route dùng MANAGE_*, từ chối role vô hiệu hóa; kiểm thử hồi quy.
- [ ] 0.2 Menu/route/nút thao tác theo permission, role tùy chỉnh.
- [x] 0.3 Scope báo cáo Excel: tenant, lớp/môn, bản thân/con em, lọc records điểm danh.
- [ ] 0.4 Scope duyệt đơn, TKB, gửi tin nhắn; chống tự duyệt/duyệt lặp.
- [ ] 0.5 Rà các service còn lại theo ID và quan hệ: học vụ, thi, học liệu, thư viện, CSVC, user/role, template.
- [ ] 0.6 Kiểm thử API nhiều cụm/trường/role, frontend build và ghi hạn chế còn lại.

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
- Push: kiểm tra nhánh remote sau commit.
