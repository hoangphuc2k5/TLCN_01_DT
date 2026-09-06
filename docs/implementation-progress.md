# Tiến trình triển khai

Cập nhật: 06/09/2026. Đang thực hiện Đợt 0: phân quyền, tenant và kiểm thử.

## Quy trình bàn giao

- Mỗi chức năng: sửa code → kiểm thử → ghi kết quả → tạo nhánh, commit và push origin.
- Chỉ stage file liên quan; không commit .env hoặc file cấu hình người dùng chưa kiểm tra.
- Không chạy seedDemo trên database người dùng. Kiểm thử bằng MongoDB tạm.
- Các nhánh tiếp theo có thể kế thừa nhánh trước; ghi rõ nhánh nền để review.

## Checklist Đợt 0

- [x] 0.1 Quyền API theo hành động ở các route dùng MANAGE_*, từ chối role vô hiệu hóa; kiểm thử hồi quy.
- [x] 0.2a Menu/route theo permission; nút user/role và quyền lưu/duyệt TKB, đơn từ.
- [x] 0.2b Chuyển các nút còn lại theo action và quy tắc nghiệp vụ; kiểm thử UI đầu cuối 22/22 đạt.
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
- Push: thành công lên origin, commit `3fd8973`.

## Điểm tiếp tục chính xác

### Bàn giao 0.2b — Quyền thao tác UI và E2E

- Nhánh `feat/phase0-ui-actions-e2e`, nền `feat/phase0-exam-access` (3613f88).
- Các trang điểm/điểm danh/phí/thi/học liệu/thư viện/CSVC/hạnh kiểm/mẫu/hỗ trợ kiểm tra action riêng; import/upsert cần create + update. Xuất báo cáo cho tài khoản chỉ xem/HS/PH theo cùng policy với API.
- Lịch/thông báo ẩn nút xóa theo quyền và chủ sở hữu/phạm vi. Đơn và CSVC ẩn tự duyệt. Thư viện tách cho mượn (create) và trả (execute). Thi hiển thị “Chưa công bố” khi API che điểm.
- Lớp học ẩn nút tạo khi không có classes.create; trang cụm/trường/subscription giữ các giới hạn vai trò nghiệp vụ tương ứng API. Những thao tác chỉ Super Admin/cấp quản trị không tự mở cho custom role chỉ vì có permission.
- Picker học sinh/GV ở phí, thư viện, lớp và TKB dùng danh bạ tối thiểu, không yêu cầu quyền quản lý user. Sửa role dựa thêm quyền sở hữu school/cluster; so sánh ID hỗ trợ cả chuỗi lẫn object từ auth/me.
- Thêm `ExpressJS/scripts/phase0-fixture.js`, `ReactJS/playwright.config.js`, `ReactJS/e2e/phase0.spec.js`. Fixture tạo MongoDB tạm riêng, chỉ listen 127.0.0.1:8091, không dùng DB từ .env hoặc seedDemo. Vite test dùng 5175 và API_PROXY_TARGET; không tái sử dụng server đang chạy.
- Kiểm thử: backend trước phần UI **78/78**, frontend policy **9/9**, production build đạt; E2E Chromium **22/22** (1,2 phút). Kiểm tra 15 màn hình chỉ xem, URL bị cấm, custom create-only, PH chỉ thấy con, HS nộp bài ẩn điểm, thủ thư chọn HS/duyệt người khác, GV lưu điểm, quyền sở hữu sau reload.
- Công cụ browser tích hợp lỗi môi trường `missing sandboxPolicy`; E2E thực chạy bằng Playwright cục bộ. Lượt đầu chỉnh locator theo bản dịch Ant Design; kết quả cuối không bỏ qua hoặc retry test thất bại.
- Cách chạy lại và giới hạn: [phase0-qa.md](phase0-qa.md). Còn rà cuối payment list theo cụm trước khi đánh dấu 0.5b hoàn thành.

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

1. Hoàn thành **0.2b**: các trang FeesPage, GradesPage, AttendancePage, MaterialsPage, ExamsPage, LibraryPage, FacilitiesPage, TemplatesPage còn dùng role/canManage để bật nhiều action chung. Tách từng create/update/delete/execute; đối chiếu route mới trước khi sửa.
2. Hoàn thành **0.5b**: scope export, JSON điểm/phí/điểm danh và workflow đã được sửa. Các module khác chưa được kiểm tra toàn bộ. Không coi kiểm thử 51 case là chứng minh toàn ứng dụng đã đúng tenant.
3. Kiểm tra toàn bộ ID tham chiếu khi ghi điểm/điểm danh, tạo invoice; tiếp đó CRUD học vụ/thi/thư viện/CSVC/mẫu. Helper có sẵn: `dataScope.js`; không áp dụng filter clusterId trực tiếp lên model chỉ có schoolId.
4. Hoàn thành **0.6**: thêm test endpoint tương ứng, chạy cả hai bộ test + frontend build; test browser với tài khoản fixture. Không dùng seedDemo hoặc DB từ .env để test.
5. Khi tất cả trên xong mới đánh dấu **Đợt 0 hoàn tất** và chuyển sang kho file/job/2FA. Các nhánh hiện tại là nhánh nối tiếp, chưa merge main.

Ghi chú môi trường: npm ghi nhận 7 cảnh báo vulnerability ở backend và 4 ở frontend từ cây dependency; chưa chạy audit fix vì có thể thay major/ngoài scope. File .env và hai file untracked ban đầu không thuộc các commit bàn giao.
