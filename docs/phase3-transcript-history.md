# Phase 3 - Lịch sử học bạ điện tử

## Phạm vi

- Mỗi trạng thái dữ liệu học bạ được lưu thành một phiên bản bất biến khi người dùng xuất PDF hoặc DOCX.
- Nội dung gồm thông tin học sinh/trường, lớp hiện tại, lịch sử chuyển lớp, điểm và snapshot điểm trước chuyển lớp, hạnh kiểm, khen thưởng/kỷ luật đã duyệt.
- Hai lần xuất trên cùng dữ liệu dùng lại cùng phiên bản; khi dữ liệu nguồn thay đổi mới tạo phiên bản tiếp theo.
- Cấp số phiên bản và chống trùng được bảo vệ bằng unique index và cơ chế thử lại khi có hai yêu cầu xuất đồng thời.
- Người dùng xem danh sách phiên bản nhưng API không trả nội dung học bạ hoặc hash trong response danh sách.
- Học sinh chỉ xem học bạ của mình; phụ huynh chỉ xem của con em; nhân sự quản lý tiếp tục chịu phạm vi trường/cụm hiện có.
- PDF/DOCX của phiên bản cũ được dựng từ snapshot đã lưu, nên chỉnh sửa điểm sau này không làm thay đổi tài liệu lịch sử.

## Cấu trúc

- `TranscriptSnapshot` lưu `studentId`, `schoolId`, số phiên bản, SHA-256 nội dung, snapshot và người tạo.
- `transcriptHistoryService` phụ trách chụp/deduplicate/cấp phiên bản, truy vấn lịch sử và dựng lại chứng nhận lịch sử.
- `certificateService` tiếp tục là thành phần thu thập và render PDF/DOCX; phần render nhận được cả dữ liệu hiện tại lẫn snapshot.
- API mới:
  - `GET /students/:studentId/transcript-history`
  - `GET /students/:studentId/transcript-history/:snapshotId/:format`
- Trang Hồ sơ học sinh hiển thị ngày lưu, người tạo và nút tải PDF/DOCX của từng phiên bản.
- Audit xuất học bạ hiện tại ghi thêm số phiên bản; tải bản lịch sử dùng resource `StudentTranscriptSnapshot`.

## Kiểm thử

- Backend mục tiêu **2/2 đạt** và toàn bộ backend **255/255 đạt**: kiểm tra snapshot không trùng, tạo phiên bản mới sau sửa điểm, đồng thời PDF/DOCX, dữ liệu lịch sử không đổi và quyền phụ huynh/học sinh.
- Frontend unit **11/11 đạt**, production build đạt; Vite còn cảnh báo bundle chính lớn hơn 500 kB.
- Playwright học bạ **1/1 đạt**, gồm xuất DOCX hiện tại, thấy phiên bản và tải lại DOCX phiên bản 1.

Kết quả CI được ghi trong `implementation-progress.md` trước khi gộp nhánh.
