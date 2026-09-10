# Phase 3.3 — Tin nhắn realtime

Cập nhật: 10/09/2026. Nhánh: `feat/phase3-realtime-messaging`, nền `integration/phase3` tại `6eca82a`.

## Phạm vi hoàn thành

- Thêm WebSocket gateway `/v1/ws/messages`; REST tiếp tục lưu và đọc tin nhắn bền vững trong MongoDB.
- Trình duyệt lấy JWT ticket có thời hạn 60 giây qua API đã xác thực. Gateway kiểm tra trạng thái tài khoản, phiên đăng nhập và quyền sở hữu role trước khi chấp nhận kết nối.
- Sự kiện `message.created` chỉ được phát cho người gửi và người nhận. Quy tắc liên trường/cụm và kiểm tra tin gốc của cuộc hội thoại vẫn được thực thi trước khi lưu.
- Client tự kết nối lại với backoff 1–15 giây và gửi cursor tin cuối. Gateway phát lại các tin bị lỡ theo lô; nếu backlog vượt 1.000 sự kiện, client được yêu cầu đồng bộ lại qua REST.
- Vite dev/preview proxy hỗ trợ WebSocket, nên môi trường local và tunnel dùng chung origin với API.

## Cấu trúc

- `messageRealtimeService`: cấp/xác thực ticket và truy vấn replay theo đúng participant scope.
- `messageGateway`: Gateway + Observer trên domain event, quản lý connection/heartbeat/broadcast.
- `MessagesPage`: giữ cursor, trạng thái kết nối và tải lại inbox/sent khi nhận sự kiện.

## Kiểm thử local

- Backend realtime: **3/3 đạt**; bộ realtime + scope liên quan **86/86 đạt** trên MongoDB Memory Server và HTTP/WebSocket server local.
- Frontend policy: **11/11 đạt**; production build đạt, còn cảnh báo bundle lớn đã có từ trước.
- Playwright realtime: **1/1 đạt** qua Vite WebSocket proxy; hai browser context xác nhận hộp thư người nhận cập nhật không reload trang.

Gateway dùng event bus trong tiến trình hiện tại. Khi chạy nhiều Node replica, cần gắn broker dùng chung như Redis pub/sub để broadcast tức thời giữa các replica; dữ liệu và replay cursor vẫn nằm trong MongoDB.
