# Phase 3.5 - Thống kê dashboard

## Phạm vi hoàn thành

- Dashboard trả về khối `analytics` theo đúng quyền xem từng tài nguyên: điểm danh, học phí, điểm số và bài tập.
- Chuyên cần tính theo từng lượt học sinh, bao gồm có mặt, đi trễ, vắng có phép/không phép, tỷ lệ có mặt và xu hướng 30 ngày gần nhất.
- Học phí tổng hợp số hóa đơn, phải thu, đã thu, còn phải thu, tỷ lệ thu và số liệu theo trạng thái.
- Học tập cho biết số bảng điểm, số điểm đã có, trung bình và phân bố bốn mức điểm.
- Bài tập cho biết số bài được giao trong phạm vi, số bài đã nộp, đã chấm và các lượt tải file còn dở.
- React hiển thị bốn thẻ phân tích tương ứng. Thẻ chỉ xuất hiện khi backend trả về tài nguyên mà người dùng được phép xem.

## Phạm vi dữ liệu và thiết kế

- `dashboardAnalyticsService` là service tổng hợp độc lập; `DashboardFactory` tiếp tục tạo các thẻ tổng quan theo vai trò.
- Mọi aggregate đều dùng `schoolScope`, `personalStudentIds` và `teacherClassScope`. Giáo viên chỉ xem lớp/môn/năm được phân công và do chính mình phụ trách; học sinh/phụ huynh chỉ xem bản thân/con em còn hợp lệ trong trường.
- Quyền bị thu hồi trả về `analytics: {}`. Không tính số liệu chỉ vì giao diện đang ẩn một thẻ.

## Kiểm thử

- Backend: `node --test test/export-scope.test.js` — 89/89 pass, gồm kiểm tra parent có liên kết con em ngoài trường, giáo viên theo phân công, hóa đơn/bài tập ngoài tenant và quyền bị thu hồi.
- Frontend unit: `npm test` — 11/11 pass.
- Production build: `npm run build` pass. Vite vẫn cảnh báo bundle chính vượt 500 kB.
- E2E bổ sung xác nhận dashboard phụ huynh hiển thị đủ bốn khối khi fixture có quyền dữ liệu cá nhân.
