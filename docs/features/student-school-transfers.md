# Chuyển trường và tiếp nhận học sinh

## Sử dụng

Vào **Học sinh / nhân sự → Chuyển trường** bằng tài khoản quản trị trường, quản trị cụm hoặc Super Admin có quyền quản lý người dùng.

1. Trường đi tạo yêu cầu, chọn học sinh, trường đến, ngày dự kiến và lý do.
2. Trường đi chọn **Duyệt chuyển đi** để chia sẻ bản chụp hồ sơ điểm.
3. Trường đến xem chi tiết, chọn **Tiếp nhận**, chọn lớp cùng khối và xác nhận.

Ngày dự kiến dùng để tham khảo, không phải lịch chạy tự động. Việc tiếp nhận có hiệu lực ngay khi xác nhận thành công. Trước đó học sinh tiếp tục thuộc trường đi.

Trường đi có thể hủy yêu cầu còn mở. Trường đi được từ chối yêu cầu chờ duyệt; sau khi duyệt chỉ trường đến được từ chối tiếp nhận. Từ chối/hủy phải có lý do. Yêu cầu đã hoàn tất không được duyệt lại. Cần tạo yêu cầu mới nếu muốn chuyển tiếp.

## Dữ liệu và phân quyền

- Một học sinh chỉ có một yêu cầu đang xử lý, kể cả khi tạo đồng thời.
- Chỉ quản trị thuộc một trong hai trường/cụm liên quan được xem yêu cầu. Quyền cập nhật không thay thế quyền đối với đúng phía của quy trình.
- Khi tiếp nhận: giữ nguyên ID/tài khoản, cập nhật trường/cụm/lớp, thu hồi phiên đăng nhập cũ và lưu lịch sử người xử lý/thời điểm/lý do trong yêu cầu.
- Lớp tiếp nhận phải hoạt động, đúng trường, cùng khối, có năm học giao nhau với năm học cũ và còn chỗ. Kiểm tra cả hạn mức học sinh của gói dịch vụ.
- Điểm gốc, chuyên cần, học phí và tệp cũ không đổi trường sở hữu. Hồ sơ điểm bàn giao được chụp khi duyệt và cập nhật lần cuối khi tiếp nhận để bao gồm điểm nhập trong lúc chờ. Trường đến xem trong chi tiết yêu cầu, không chỉnh sửa bản chụp.
- Giữ nguyên liên kết phụ huynh–con. Hệ thống hiện giới hạn tài khoản phụ huynh trong một trường; tài khoản có con ở nhiều trường cần quy trình quản trị riêng. Không tự chuyển tài khoản phụ huynh vì có thể còn con khác tại trường đi.
- Phiên bản này bàn giao thông tin học sinh, lịch sử lớp và điểm; chưa có tải/đính kèm tệp vào yêu cầu, không sao chép chuyên cần hoặc công nợ sang trường mới.

MongoDB phải chạy replica set. Tiếp nhận dùng transaction, khóa trường đích và khóa học sinh theo cơ chế đang dùng cho chuyển lớp/ghi điểm. Hai yêu cầu tiếp nhận qua luồng này không thể cùng chiếm chỗ cuối của lớp. Tạo học sinh hoặc sửa sức chứa qua các luồng khác vẫn theo các ràng buộc hiện có của hệ thống.

## API

| Method | Đường dẫn | Chức năng |
| --- | --- | --- |
| GET | `/v1/api/school-transfers/schools` | Danh bạ trường đích đang hoạt động, chỉ tên/mã |
| GET | `/v1/api/school-transfers` | Tối đa 200 yêu cầu mới nhất trong phạm vi |
| GET | `/v1/api/school-transfers/:id` | Chi tiết, lịch sử xử lý và hồ sơ điểm bàn giao |
| POST | `/v1/api/school-transfers` | Tạo với `studentId`, `toSchoolId`, `reason`, `requestedDate` |
| POST | `/v1/api/school-transfers/:id/decision` | `action`: `approve`, `accept`, `reject`, `cancel`; `accept` cần `classId`; từ chối/hủy cần `note` |

API dùng quyền `users`: `view`, `create`, `update` tương ứng. Server kiểm tra thêm vai trò quản trị và phạm vi trường/cụm. Nhật ký audit ghi nhận tạo và xử lý yêu cầu.

## Kiểm tra

Kiểm thử tích hợp riêng: `node --test src/tests/admin/school-transfers.integration.test.js` tại ExpressJS.

Kiểm thử giao diện bằng dữ liệu MongoDB giả lập, không dùng `.env` thực tế: `node node_modules/@playwright/test/cli.js test e2e/school-transfers.spec.js` tại ReactJS.

Kết quả kiểm tra local ngày 01/11/2026:

- Backend `npm test`: 311/311, gồm 7 kiểm thử mới về chuyển trường (phân quyền, trùng yêu cầu, hồ sơ bàn giao, rollback và cạnh tranh sĩ số).
- Frontend `npm test`: 20/20; `npm run build` và `npm run lint` đạt với dependency theo lockfile.
- Playwright `school-transfers.spec.js`: 1/1; hai tài khoản trường đi/trường đến xử lý qua giao diện và kiểm tra dữ liệu sau reload.
- Lint backend đạt với cấu hình/rules của dự án, dùng ESLint cài riêng trong worktree frontend do bộ dependency backend có sẵn chưa chứa ESLint.
- Không chạy vào cơ sở dữ liệu thực tế hoặc triển khai lên môi trường dùng chung.
