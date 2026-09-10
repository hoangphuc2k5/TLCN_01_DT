# Chuyển lớp và bảo toàn điểm

## Cách dùng

Trong Quản lý người dùng, chọn **Chuyển lớp** tại học sinh, chọn lớp đích, học kỳ bàn giao điểm và nhập lý do. Chuyển có hiệu lực ngay. API dùng `PUT /v1/api/users/:id` với `classId`, `transferSemester` (1 hoặc 2), `transferReason`.

- Lớp đích phải hoạt động, thuộc cùng trường và còn chỗ. Không đổi vai trò cùng lúc với chuyển lớp. Không cho chuyển trường qua cập nhật tài khoản học sinh.
- Bảng điểm của năm học lớp đích và học kỳ đã chọn được bàn giao, giữ nguyên ID và điểm; lưu snapshot lớp/điểm/trung bình trước chuyển.
- Các học kỳ/năm khác giữ lớp cũ. Giáo viên cũ được sửa dữ liệu lịch sử nếu còn phân công lớp/môn; giáo viên mới sửa bảng điểm được bàn giao theo phân công của mình.
- Lịch sử lớp lưu tên lớp/năm học, người thực hiện, thời điểm và lý do. API học bạ trả lịch sử lớp cùng snapshot điểm. Bản in PDF/DOCX chưa trình bày lịch sử này.

## Điều kiện vận hành

MongoDB phải chạy replica set, kể cả môi trường local. Ghi điểm và chuyển lớp dùng transaction cùng khóa theo học sinh; chuyển lớp thêm khóa trường để kiểm tra sĩ số giữa các yêu cầu chuyển lớp. Standalone trả 503 cho ghi điểm/chuyển lớp; không tắt tính nguyên tử để chạy tạm.

Không phải quy trình chuyển trường, xếp lớp năm tới hoặc chuyển có hiệu lực trong tương lai. Việc tạo học sinh trực tiếp/xếp lớp qua luồng khác và sửa sức chứa lớp cần được rà soát riêng nếu yêu cầu sĩ số phải là ràng buộc tuyệt đối cho toàn hệ thống. Danh sách lớp UI hiện dùng giới hạn 200 lớp của API hiện có.

## Bằng chứng kiểm thử

- `npm test` tại ExpressJS: 251/251 trên MongoDB local.
- `node --test test/student-transfers.test.js`: 6/6; kiểm tra rollback lớp đầy, lịch sử/snapshot, điểm lịch sử, quyền giáo viên cũ/mới, thêm điểm đồng thời, tạo điểm đồng thời chuyển lớp.
- `npm test` tại ReactJS: 11/11; `npm run build` đạt (cảnh báo chunk lớn còn tồn tại).
- `npx playwright test e2e/student-transfers.spec.js`: 1/1, tạo lớp đích qua API local, chuyển qua giao diện, reload và đối chiếu lịch sử đã lưu.
- Chưa kiểm thử Atlas hoặc triển khai CD trong đợt này.
