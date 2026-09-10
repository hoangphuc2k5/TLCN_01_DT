# Rà soát lại Phase 0 — 06/09/2026

Nền kiểm tra: `integration/phase0` tại `6baf465`. Nhánh sửa: `fix/phase0-read-path-audit`. Đây là rà soát bổ sung cho checklist 0.1–0.6, không triển khai các chức năng mới của Đợt 1.

## Kết luận kiểm tra bản cũ

Bộ test cũ đạt 82/82 backend, 9/9 frontend và build thành công, nhưng chưa bao phủ đủ đường đọc phụ. Vì vậy không dùng kết quả đó để khẳng định mọi đường truy cập đều đã đúng. Lượt này thêm 11 test backend có ca được phép và bị từ chối; các ca mới đã tái hiện lỗi trước khi sửa.

## Phát hiện và thay đổi

| Phần | Lỗi trước sửa | Hành vi sau sửa |
| --- | --- | --- |
| Dashboard PH/HS | PH dùng nguyên parentOf, truy vấn học vụ thiếu schoolId | Xác minh học sinh còn thuộc trường; lọc trường cho điểm, phí, điểm danh và thống kê đơn cá nhân |
| Dashboard GV | Đếm theo teacherId, bao gồm bản ghi khác trường/lớp/môn | Giao phạm vi trường với phân công; điểm còn kiểm tra năm học |
| Quyền dashboard | Thu hồi quyền đọc vẫn nhận dữ liệu theo mã role | Bỏ thống kê/mảng không có quyền; HS/PH cần own_data.view, GV cần quyền module; thống kê đơn tự gửi vẫn được xem |
| Đơn từ | Staff/custom role không có leave.view vẫn đọc đơn người khác | Không có leave.view chỉ xem đơn tự gửi; giới hạn HS/PH/GV và lớp chủ nhiệm vẫn áp dụng |
| Học liệu | GV khác đọc được tài liệu isShared=false | Chỉ tác giả và Super Admin/Admin trường/Giáo vụ xem bản chưa chia sẻ, trong tenant; HS/PH chỉ xem bản chia sẻ đúng lớp hoặc toàn trường |
| Danh sách thi | HS không thấy đề toàn trường; query class/status bị ghi đè | Dùng cùng phạm vi với đọc chi tiết, query chỉ thu hẹp; đề PUBLISHED/CLOSED hợp lệ được liệt kê |
| Đề thi theo môn | GV được phân công một môn đọc/sửa đề môn khác cùng lớp | Cần phân công lớp/môn; đề không gán môn dùng phân công lớp; vai trò chủ nhiệm tự nó không cấp quyền đáp án/chấm thi |
| Lịch | Chỉ lọc trường, bỏ qua classId/targetRoles | HS/PH/GV chỉ xem lớp liên quan và sự kiện toàn trường; lọc vai trò nhận |
| Thông báo lớp | PH không có classId nên không nhận thông báo lớp con; targetRoles bị bỏ qua | Suy lớp từ con/phân công/chủ nhiệm; lọc vai trò cả danh sách và recipients trước khi phát event thông báo/email |
| Tra cứu học vụ | Roster và populate GV trả cả hồ sơ cá nhân | Roster chỉ tên/mã/lớp/trường/role; populate GV chỉ tên/mã/email |
| Hạnh kiểm | GVCN đọc cả trường | GVCN chỉ đọc lớp chủ nhiệm; GV khác theo phân công, HS/PH theo bản thân/con trong trường |
| Nút duyệt CSVC | Super Admin thấy nút nhưng API từ chối vai trò | UI chỉ hiện cho ba vai trò được API hỗ trợ và có facilities.execute |

Quản trị hệ thống/cụm/trường và Giáo vụ được xem nội dung nhắm vai trò khác trong phạm vi quản trị. Người tạo cũng được xem nội dung mình nhắm vai trò khác, nhưng vẫn bị giới hạn tenant/lớp. Staff ngoài nhóm GV/HS/PH xem dữ liệu lớp trong trường; quyền đọc module vẫn do route kiểm tra ở những module có guard. Học liệu đã chia sẻ vẫn là học liệu của trường đối với staff.

Các file chính: `dashboardFactory.js`, `dashboardService.js`, `dataScope.js`, `audienceScope.js`, `academicService.js`, `adminExtraService.js`, `announcementService.js`, `crossService.js`, `examService.js`, `leaveService.js`, `resourceService.js`, `FacilitiesPage.jsx`.

## Đối chiếu checklist

| Mục | Bằng chứng kiểm tra |
| --- | --- |
| 0.1 Quyền API | Bộ test quyền action, role vô hiệu, upsert create+update; thêm thu hồi quyền dashboard |
| 0.2 Menu/route/nút | Frontend policy và E2E các trang chỉ xem, truy cập URL trực tiếp, role create-only; sửa nút CSVC |
| 0.3 Export | Test đọc file XLSX thật theo trường/cụm/lớp/môn/HS/PH và query thu hẹp |
| 0.4 Workflow | Test scope đơn/TKB/tin nhắn, tự duyệt và duyệt đồng thời; thêm quyền đọc đơn và audience lịch/thông báo |
| 0.5a Đường đọc | JSON học vụ + dashboard + roster + hạnh kiểm + học liệu + thi; kiểm tra liên kết con sai trường |
| 0.5b Tham chiếu ghi | Bộ test hiện có cho user/role/học vụ/tài nguyên/thi/template/payment; thêm chặn sửa đề sai môn |
| 0.6 Kiểm thử tổng hợp | Backend 93/93; frontend policy 9/9; production build đạt; E2E Chromium 24/24 |

## Kiểm thử và bàn giao

- Backend: `cd ExpressJS`, `npm test` — **93/93 đạt**, không skip.
- Frontend: `cd ReactJS`, `npm test` — **9/9 đạt**; `npm run build` — đạt, vẫn có cảnh báo chunk JS lớn khoảng 1,49 MB.
- Browser: `npm run test:e2e` — **24/24 đạt** (1,2 phút), không skip/retry. Thêm PH có parentOf chứa học sinh trường khác và tài liệu riêng của quản trị vào fixture; thêm hai ca E2E tương ứng.
- `git diff --check` đạt. Test dùng MongoDB tạm và tài khoản giả, không chạy seedDemo hay kết nối database người dùng.
- Đã commit/push `fix/phase0-read-path-audit` tại `e75aaa0`, merge/push `integration/phase0` tại `8b7441a`. `git diff --exit-code fix/phase0-read-path-audit HEAD` ngay sau merge xác nhận cây file không đổi so với bản được kiểm thử. Giữ các nhánh chức năng để review. Không merge `main`.

## Giới hạn để tiếp tục

Đây là kiểm thử tự động và rà code theo phạm vi nền tảng; không phải chứng nhận bảo mật toàn hệ thống hay UAT production. Chưa có kiểm thử tải, mọi tổ hợp custom role hoặc mọi định dạng import. Chưa kiểm tra luồng gửi email thật; test xác nhận danh sách recipients đưa vào event. Thông báo SYSTEM/CLUSTER vẫn xuất hiện qua danh sách, chưa thêm fan-out notification cho các scope này. Các notification cũ đã tạo không được tự xóa/thu hồi khi đổi đối tượng nhận.

Kho file có kiểm soát truy cập tải xuống thuộc Đợt 1; lượt này chỉ giới hạn bản ghi học liệu, không biến URL đã chia sẻ công khai thành URL riêng. Các giới hạn giao dịch đồng thời học phí/tồn kho, tự nộp bài thi theo giờ, chuyển trường giữa cụm/migration, custom approver và tích hợp ngoài vẫn theo `phase0-qa.md` và `implementation-progress.md`.

Phiên sau đọc `implementation-progress.md`, kiểm tra git status và nhánh trước khi sửa. Giữ nguyên hai file người dùng chưa track: `ExpressJS/.env.production.example`, `package-lock.json` ở root.
