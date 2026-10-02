# Deploy frontend lên Vercel

Repository được deploy thành **hai Vercel Project** độc lập: một project frontend
trỏ vào `ReactJS`, một project backend trỏ vào `ExpressJS`.

## Cấu hình project Vercel

1. Import repository và đặt **Root Directory** là `ReactJS`.
2. Framework Preset: **Vite**. Các lệnh build/output đã nằm trong `vercel.json`.
3. Tạo các Environment Variables cho Production và Preview:

```env
VITE_BACKEND_URL=https://api.example.com
VITE_GOOGLE_CLIENT_ID=
VITE_ALLOW_PASSWORD_LOGIN=false
```

`VITE_BACKEND_URL` phải là origin public của backend Express, không phải
`https://edumoet.vercel.app`. Mọi biến `VITE_*` đều được nhúng vào bundle và có thể
đọc từ trình duyệt; không đặt secret trong các biến này.

## Cấu hình backend production

Tạo project Vercel thứ hai với **Root Directory** là `ExpressJS`. Vercel sẽ dùng
`api/index.js` làm Node Function và rewrite toàn bộ request vào Express. Đặt tối
thiểu các biến sau:

```env
NODE_ENV=production
FRONTEND_URL=https://edumoet.vercel.app
CORS_ALLOWED_ORIGINS=https://<preview-hoac-domain-khac>.vercel.app
MONGO_DB_URL=<MongoDB Atlas URI>
JWT_SECRET=<chuoi-ngau-nhien-dai>
FILE_STORAGE_DRIVER=s3
FILE_S3_BUCKET=<bucket>
FILE_S3_ENDPOINT=<endpoint-neu-dung-S3-compatible>
AWS_REGION=<region>
AWS_ACCESS_KEY_ID=<access-key>
AWS_SECRET_ACCESS_KEY=<secret-key>
```

`CORS_ALLOWED_ORIGINS` chỉ nhận origin chính xác, phân tách bằng dấu phẩy. Không
dùng `*` vì API gửi credential. Backend chủ động từ chối khởi động trên Vercel nếu
`FILE_STORAGE_DRIVER=local` để tránh mất file.

Sau khi backend deploy, lấy domain của backend (ví dụ
`https://edumoet-api.vercel.app`) và gán nó vào `VITE_BACKEND_URL` của project
frontend, sau đó redeploy frontend.

## Giới hạn serverless

- REST API và SSE chạy qua Vercel Function. SSE sẽ bị ngắt khi chạm giới hạn thời
  gian function; frontend hiện có cơ chế kết nối lại.
- Vercel Functions không nhận WebSocket server. Chat realtime sẽ fallback/reconnect
  nhưng muốn hoạt động đầy đủ phải chuyển gateway sang Ably, Pusher, Supabase
  Realtime hoặc chạy riêng `src/server.js` trên Render/Railway/VPS.
- `npm run worker` không chạy liên tục trong Vercel Function. Dùng Vercel Cron gọi
  một HTTP endpoint có xác thực, hoặc chạy worker trên một dịch vụ Node riêng.
- Payload request/response của Function tối đa 4.5 MB; upload hiện cho phép tới
  10 MB nên file lớn cần upload trực tiếp lên S3 bằng presigned URL nếu phát sinh.
- Backup/restore dùng filesystem và tiến trình dài không phù hợp với Function; nên
  chạy bằng worker/VPS.

Sau khi đổi biến môi trường trên Vercel, phải redeploy vì Vite đọc biến lúc build.

## Kiểm tra sau deploy

- Mở trực tiếp một route con như `/dashboard` và refresh; không được trả 404.
- Trong DevTools > Network, request phải đi tới origin trong `VITE_BACKEND_URL`.
- Kiểm tra `GET /v1/api/health` của backend trả HTTP 200 và đăng nhập.
- Kiểm tra CORS, upload/download, SSE thông báo và WebSocket tin nhắn.
