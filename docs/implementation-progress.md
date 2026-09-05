# Tiến trình triển khai

Cập nhật: 05/09/2026. Đang thực hiện Đợt 0: phân quyền, tenant và kiểm thử.

## Quy trình bàn giao

- Mỗi chức năng: sửa code → kiểm thử → ghi kết quả → tạo nhánh, commit và push origin.
- Chỉ stage file liên quan; không commit .env hoặc file cấu hình người dùng chưa kiểm tra.
- Không chạy seedDemo trên database người dùng. Kiểm thử bằng MongoDB tạm.
- Các nhánh tiếp theo có thể kế thừa nhánh trước; ghi rõ nhánh nền để review.

## Checklist Đợt 0

- [x] 0.1 Quyền API theo hành động ở các route dùng MANAGE_*, từ chối role vô hiệu hóa; kiểm thử hồi quy.
- [x] 0.2a Menu/route theo permission; nút user/role và quyền lưu/duyệt TKB, đơn từ.
- [ ] 0.2b Chuyển các nút còn lại (điểm, điểm danh, phí, thi, học liệu, thư viện, CSVC, mẫu…) theo action; kiểm thử UI đầu cuối.
- [x] 0.3 Scope báo cáo Excel: tenant, lớp/môn, bản thân/con em, lọc records điểm danh.
- [x] 0.4 Scope duyệt đơn, TKB, gửi tin nhắn; chống tự duyệt/duyệt lặp.
- [x] 0.5a Đồng bộ scope API xem điểm/điểm danh/học phí với export, lọc records điểm danh trước trả JSON.
- [ ] 0.5b Rà các service còn lại theo ID và quan hệ khi ghi: học vụ, thi, học liệu, thư viện, CSVC, user/role, template.
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
- Push: kiểm tra nhánh remote sau commit.

## Điểm tiếp tục chính xác

1. Hoàn thành **0.2b**: các trang FeesPage, GradesPage, AttendancePage, MaterialsPage, ExamsPage, LibraryPage, FacilitiesPage, TemplatesPage còn dùng role/canManage để bật nhiều action chung. Tách từng create/update/delete/execute; đối chiếu route mới trước khi sửa.
2. Hoàn thành **0.5b**: scope export, JSON điểm/phí/điểm danh và workflow đã được sửa. Các module khác chưa được kiểm tra toàn bộ. Không coi kiểm thử 51 case là chứng minh toàn ứng dụng đã đúng tenant.
3. Kiểm tra toàn bộ ID tham chiếu khi ghi điểm/điểm danh, tạo invoice; tiếp đó CRUD học vụ/thi/thư viện/CSVC/mẫu. Helper có sẵn: `dataScope.js`; không áp dụng filter clusterId trực tiếp lên model chỉ có schoolId.
4. Hoàn thành **0.6**: thêm test endpoint tương ứng, chạy cả hai bộ test + frontend build; test browser với tài khoản fixture. Không dùng seedDemo hoặc DB từ .env để test.
5. Khi tất cả trên xong mới đánh dấu **Đợt 0 hoàn tất** và chuyển sang kho file/job/2FA. Các nhánh hiện tại là nhánh nối tiếp, chưa merge main.

Ghi chú môi trường: npm ghi nhận 7 cảnh báo vulnerability ở backend và 4 ở frontend từ cây dependency; chưa chạy audit fix vì có thể thay major/ngoài scope. File .env và hai file untracked ban đầu không thuộc các commit bàn giao.
