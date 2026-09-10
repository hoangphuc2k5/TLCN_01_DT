# Phase 3.4 — Học bạ PDF phân trang và DOCX thật

Cập nhật: 10/09/2026. Nhánh: `feat/phase3-docx-transcripts`, nền `integration/phase3` tại `99d2c13`; đã merge vào `integration/phase3` tại `165590d`.

## Phạm vi hoàn thành

- `GET /students/:studentId/certificate/pdf` tạo PDF nhiều trang, không cắt danh sách; nội dung gồm thông tin trường/học sinh, lớp và năm học, điểm thành phần, điểm trung bình/xếp loại, hạnh kiểm và các khen thưởng–kỷ luật đã duyệt.
- `GET /students/:studentId/certificate/doc` và `/docx` tạo DOCX Open XML thật bằng thư viện `docx`, giữ Unicode tiếng Việt, bảng có tiêu đề và viền, phần ký xác nhận. `doc` được giữ làm alias tương thích nhưng phần mở rộng trả về là `.docx`.
- Kiểm tra quyền vẫn theo tenant và quan hệ phụ huynh–học sinh; export thành công được ghi `AuditLog` với actor, học sinh, trường và định dạng.
- Frontend dùng nhãn `Word (.docx)` và tên tải xuống `.docx`.

## Kiểm thử local

- Backend hồ sơ/chứng nhận: **2/2 đạt** trên MongoDB Memory ReplSet; kiểm tra PDF nhiều trang, bản ghi cuối, DOCX ZIP/XML Unicode, dữ liệu khen thưởng/hạnh kiểm và audit.
- Frontend policy: **11/11 đạt**; production build đạt, vẫn còn cảnh báo bundle lớn đã có từ trước.
- Playwright: **1/1 đạt**, học sinh tải được file DOCX qua API fixture local.
- Render QA preview DOCX: **1/1 trang sạch** bằng `docx-preview` trong fixture tạm. Renderer LibreOffice đóng gói không có trong môi trường; Word Automation cũng không hoàn thành headless nên không ghi nhận đó là kiểm thử Word native.
