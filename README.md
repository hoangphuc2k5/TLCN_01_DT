# EduMoet — Hệ thống Quản lý Trường học Đa trường (MERN)

> Đổi tên thương hiệu: sửa `APP_NAME` trong `ExpressJS/.env` (một chỗ) — UI, tab trình duyệt, email và API tự theo.

Hệ thống **multi-tenant** (cụm / trường) + **JWT RBAC** với **role động trong MongoDB** (phân cấp level) + module học vụ, học phí, thi online, thư viện, CSVC, tin nhắn, Excel, v.v.

## Stack

| Tầng | Công nghệ |
|------|-----------|
| Frontend | React 18, Vite, Ant Design, Redux Toolkit, Axios, React Router |
| Backend | Node.js, Express.js, Mongoose |
| Database | MongoDB (local hoặc Atlas) — shared DB + `schoolId` / `clusterId` |
| Auth | JWT Bearer + RBAC theo **mã Role** (cache quyền từ DB) |
| OAuth (tuỳ chọn) | Google Sign-In (Gmail) |

## Cấu trúc thư mục

```
code/
├── ExpressJS/                 # Backend API
│   ├── .env.example
│   ├── Dockerfile
│   └── src/
│       ├── config/            # container DI, DB/logger Singleton, constants, runtime adapters
│       ├── models/{administration,finance,common}/
│       ├── repository/{administration,finance,common}/
│       ├── services/{administration,finance,common}/
│       ├── controllers/{administration,finance,common}/
│       ├── middleware/common/ # Auth → Tenant → RBAC → Validate → Error
│       ├── routes/{administration,finance,common}/
│       ├── dtos/{administration,finance,common}/
│       ├── utils/common/
│       ├── tests/{administration,finance,common}/
│       ├── app.js             # cấu hình Express
│       └── server.js
├── ReactJS/                   # Frontend
│   ├── .env.example
│   ├── e2e/                   # Playwright theo luồng chức năng
│   ├── tests/unit/            # Unit test frontend
│   └── src/
│       ├── components/        # component dùng chung và route guards
│       ├── config/            # HTTP client và cấu hình runtime
│       ├── constants/
│       ├── features/          # page/component theo chức năng
│       ├── layouts/           # khung giao diện
│       ├── services/          # API service
│       ├── store/             # Redux store và slices
│       ├── styles/
│       ├── utils/
│       └── main.jsx
├── docs/                      # architecture, deployment, features, planning, quality
├── .github/workflows/         # CI và phát hành image GHCR
└── README.md
```

## Cài đặt & chạy

### 1. Yêu cầu

- Node.js 18+
- MongoDB local cấu hình **replica set** hoặc MongoDB Atlas. Các nghiệp vụ dùng transaction (ví dụ cập nhật điểm) không hoạt động đầy đủ trên MongoDB standalone.

### 2. Backend

```bash
cd ExpressJS
npm install
cp .env.example .env   # Windows: copy .env.example .env
```

Chỉnh [`ExpressJS/.env`](ExpressJS/.env) (không commit file này):

```env
PORT=8080
APP_NAME=EduMoet
MONGO_DB_URL=mongodb://localhost:27017/school_management
# hoặc Atlas: mongodb+srv://USER:PASSWORD@....mongodb.net/school_management

JWT_SECRET=change_me
JWT_EXPIRE=1d

# Demo / nội bộ: bật mật khẩu. Production: có thể tắt và chỉ dùng Google.
ALLOW_PASSWORD_LOGIN=true
AUTH_GMAIL_ONLY=true
DEFAULT_PASSWORD=Password@123

GOOGLE_CLIENT_ID=
GMAIL_USER=
GMAIL_APP_PASSWORD=
FRONTEND_URL=http://localhost:5173
# Chỉ khi có thêm frontend chạy ở origin khác:
CORS_ALLOWED_ORIGINS=
```

Seed dữ liệu demo (xoá data cũ trong DB đang trỏ tới, tạo lại cụm/trường/user + **10 Role hệ thống**):

```bash
npm run seed
```

Chạy API:

```bash
npm run dev
```

- API: `http://localhost:8080`
- Health: `GET /v1/api/health`

API chỉ gửi CORS headers cho `FRONTEND_URL` và các origin khai báo trong `CORS_ALLOWED_ORIGINS` (phân tách bằng dấu phẩy, gồm giao thức và cổng, không có path). Reverse proxy cùng origin không cần thêm CORS origin. Với môi trường production, đặt `FRONTEND_URL` theo domain giao diện thực tế.

Khi server khởi động, hệ thống đảm bảo các Role hệ thống tồn tại (không ghi đè permissions đã chỉnh tay, trừ khi chạy `npm run seed` với force).

### 3. Frontend

```bash
cd ReactJS
npm install
cp .env.example .env.development
```

[`ReactJS/.env.development`](ReactJS/.env.example):

```env
VITE_BACKEND_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=
```

```bash
npm run dev
```

Mở Vite (thường `http://localhost:5173`), đăng nhập tài khoản demo bên dưới.

## Tài khoản demo

**Mật khẩu chung:** `Password@123` (cần `ALLOW_PASSWORD_LOGIN=true`)

| Email | Vai trò |
|-------|---------|
| `superadmin@system.vn` | Super Admin |
| `cluster@anhsang.edu.vn` | Quản lý cụm |
| `hieutruong@as1.edu.vn` | Hiệu trưởng (Cơ sở 1) |
| `giaovu@as1.edu.vn` | Giáo vụ |
| `gvtoan@as1.edu.vn` | GV bộ môn |
| `gvcn@as1.edu.vn` | GV chủ nhiệm |
| `ketoan@as1.edu.vn` | Kế toán |
| `thuthu@as1.edu.vn` | Thủ thư / CSVC |
| `hs1@as1.edu.vn` | Học sinh |
| `phuhuynh@as1.edu.vn` | Phụ huynh |
| `hieutruong@as2.edu.vn` | Hiệu trưởng (Cơ sở 2) |

## Roles, phân cấp & quản lý Role động

### 10 Role hệ thống (seed, `isSystem=true` — không xoá / không đổi `code`)

| Level | Code | Ý nghĩa |
|------:|------|---------|
| 0 | `SUPER_ADMIN` | Toàn hệ thống |
| 10 | `CLUSTER_ADMIN` | Theo `clusterId` |
| 20 | `SCHOOL_ADMIN` | Hiệu trưởng / BGH theo `schoolId` |
| 30 | `ACADEMIC_AFFAIRS` | Giáo vụ |
| 40 | `HOMEROOM_TEACHER` / `SUBJECT_TEACHER` | Giáo viên |
| 50 | `ACCOUNTANT` / `LIBRARIAN` | Kế toán / Thủ thư |
| 60 | `STUDENT` / `PARENT` | Học sinh / Phụ huynh |

Số **level càng nhỏ = quyền càng cao**.

### Quy tắc quản lý người dùng / vai trò

- Mặc định: chỉ quản lý tài khoản / role **cấp thấp hơn** (`actor.level < target.level`).
- **Ngoại lệ cùng cấp:** `SUPER_ADMIN`, `CLUSTER_ADMIN`, `SCHOOL_ADMIN` được quản lý **ngang cấp hoặc thấp hơn** (`actor.level ≤ target.level`).
- Có thể **tạo role tùy chỉnh** (không phải hệ thống), cấu hình ma trận quyền theo **resource × action** (`view` / `create` / `update` / `delete` / `execute`).
- UI: menu **Vai trò** (`/roles`) và tab **Vai trò** trong **Người dùng** (nếu có quyền `MANAGE_ROLES` / resource `roles`).

### API Role

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/v1/api/roles` | Danh sách role trong phạm vi cấp bậc |
| GET | `/v1/api/roles/assignable` | Role có thể gán khi tạo/sửa user |
| GET | `/v1/api/roles/permission-catalog` | Catalog resource + actions cho UI |
| POST | `/v1/api/roles` | Tạo role tùy chỉnh |
| PUT | `/v1/api/roles/:id` | Sửa name / level / permissions / status |
| DELETE | `/v1/api/roles/:id` | Xóa role không phải hệ thống (và không còn user đang dùng) |

Quyền route vẫn tương thích các key cũ (`MANAGE_USERS`, …) — map sang resource/action qua [`permission-catalog.config.js`](ExpressJS/src/config/constants/permission-catalog.config.js). Cache quyền in-memory được invalidate khi sửa Role.

## Module cốt lõi

| Module | API | Chức năng chính |
|--------|-----|-----------------|
| Auth | `/auth/login`, `/auth/google`, `/auth/config`, `/auth/me` | Mật khẩu và/hoặc Gmail; hồ sơ |
| Clusters / Schools | `/clusters`, `/schools` | Đa tenant / cụm |
| Users | `/users` | CRUD + reset MK + hierarchy |
| Roles | `/roles` | Role động + ma trận quyền |
| Academic | `/academic-years`, `/classes`, `/subjects`, `/assignments` | Cơ cấu tổ chức |
| Attendance | `/attendance` | Điểm danh + notify PH (Observer) |
| Grades | `/grades` | Nhập điểm + Strategy ĐTB |
| Fees | `/fees`, `/payments` | Hóa đơn & thu học phí |
| Announcements | `/announcements` | Thông báo đa phạm vi |
| Leave | `/leave-requests` | Xin nghỉ / duyệt |
| Timetable | `/timetables` | TKB + kiểm tra trùng GV |
| Dashboard | `/dashboard` | Factory theo role |
| Notifications | `/notifications` | Hộp thông báo |

## Xác thực

Hệ thống hỗ trợ **hai kênh** (cấu hình bằng biến môi trường):

| Biến | Ý nghĩa |
|------|---------|
| `ALLOW_PASSWORD_LOGIN=true` | Cho phép đăng nhập email + mật khẩu (dùng cho seed demo) |
| `ALLOW_PASSWORD_LOGIN=false` | Chỉ Google Sign-In |
| `AUTH_GMAIL_ONLY=true` | Google chỉ nhận `@gmail.com` / `@googlemail.com` |

Ngoài hai kênh trên, code có adapter SSO doanh nghiệp và đăng nhập OTP qua điện thoại (tùy cấu hình). SMS/Zalo/push cần gateway tương ứng; xem [SSO, OTP và thông báo realtime](docs/features/phase2-sso-phone-realtime.md). Test local không thay thế xác minh với nhà cung cấp thật.

### Google OAuth (tuỳ chọn)

1. [Google Cloud Console](https://console.cloud.google.com/) → Credentials → OAuth client **Web application**
2. Authorized JavaScript origins: `http://localhost:5173` (và domain deploy nếu có)
3. Điền `GOOGLE_CLIENT_ID` vào `ExpressJS/.env` và `VITE_GOOGLE_CLIENT_ID` vào frontend
4. Admin tạo user với **đúng email Gmail** → user bấm Sign in with Google → backend verify ID token → JWT

App Password (`GMAIL_USER` + `GMAIL_APP_PASSWORD`) dùng gửi email thông báo (nếu bật Observer mail).

> Seed demo dùng email trường (`@as1.edu.vn`, …) + mật khẩu. Muốn chỉ Gmail trên production: tắt password login và tạo tài khoản `@gmail.com`.

## Module mở rộng

| Module | API / UI | Ai dùng chính |
|--------|----------|---------------|
| Gói dịch vụ | `/subscriptions` · `/subscriptions` | Super Admin |
| Thi online | `/exams`, `/exam-attempts` · `/exams` | GV tạo đề; HS làm bài |
| Học liệu | `/materials` · `/materials` | GV đăng; HS xem |
| Thư viện | `/library/*` · `/library` | Thủ thư; HS/PH |
| CSVC | `/facilities` · `/facilities` | GV đăng ký; Thủ thư/Giáo vụ duyệt |
| Nhật ký | `/audit-logs` · `/audit-logs` | Super Admin / Hiệu trưởng |
| Hỗ trợ KT | `/support-tickets` · `/support` | Trường tạo; Super Admin xử lý |
| Hạnh kiểm | `/conduct` · `/conduct` | GVCN; HS/PH xem |
| Mẫu dùng chung | `/templates` · `/templates` | Super Admin / Cụm |
| Tin nhắn | `/messages` · `/messages` | Nội bộ (+ email nếu cấu hình) |
| Lịch | `/calendar` · `/calendar` | Sự kiện, thi, họp |
| Xuất Excel | `/export/grades\|fees\|attendance` | Báo cáo |
| Import Excel | `/import/users\|grades\|fees\|attendance` | Import hàng loạt |
| Tìm kiếm | `/search?q=` | User / lớp |

### Import Excel (cột mẫu)

| Loại | Cột chính |
|------|-----------|
| Người dùng | `email`, `name`, `role`, `code`, `phone`, `className` |
| Điểm | `studentCode`, `className`, `subjectCode`, `academicYear`, `semester`, `type`, `score`, `weight` |
| Học phí | `studentCode`, `academicYear`, `title`, `amount`, `dueDate`, `note` |
| Điểm danh | `date`, `period`, `className`, `studentCode`, `status`, `note` |

### Gợi ý thử nhanh sau seed

| Luồng | Đăng nhập | Việc làm |
|-------|-----------|----------|
| Phân quyền động | `superadmin@system.vn` | **Vai trò** → tạo role / sửa ma trận quyền |
| Hierarchy | `hieutruong@as1.edu.vn` | Chỉ thấy/sửa user cấp thấp hơn (và ngang cấp admin) |
| Thi online | `hs1@as1.edu.vn` | **Thi online** → Làm bài |
| Thư viện | `thuthu@as1.edu.vn` | Sách / phiếu mượn |
| Hạnh kiểm | `gvcn@as1.edu.vn` | Nhập xếp loại |
| Gói dịch vụ | `superadmin@system.vn` | Subscriptions + hóa đơn |

## Design Patterns

### 1. Repository
[`base.repository.js`](ExpressJS/src/repository/common/base.repository.js), [`repository/`](ExpressJS/src/repository/) — mọi truy vấn Mongoose nằm trong repository; service nhận repository qua constructor.

### 2. Service Layer
[`services/`](ExpressJS/src/services/) — nghiệp vụ, tenant scope, hierarchy và event. Controller chỉ đọc DTO, gọi service và tạo response DTO.

### 3. Chain of Responsibility (Middleware)

`authenticate` → `tenantContext` → `authorizeRoles` / `authorizePermission` → `validate` → controller → `errorHandler`

### 4. Strategy
[`grade-strategy.service.js`](ExpressJS/src/services/common/grade-strategy.service.js) — tính ĐTB / xếp loại.

### 5. Factory
[`dashboard-factory.service.js`](ExpressJS/src/services/common/dashboard-factory.service.js) — dashboard theo role.

### 6. Observer
[`event-bus.config.js`](ExpressJS/src/config/events/event-bus.config.js), [`register-listeners.config.js`](ExpressJS/src/config/events/register-listeners.config.js) — `attendance.recorded`, `announcement.created`, `leave.reviewed` → Notification (+ mail tuỳ cấu hình).

### 7. Singleton
[`database.config.js`](ExpressJS/src/config/database/database.config.js) và [`logger.config.js`](ExpressJS/src/config/logger/logger.config.js) — mỗi tiến trình chỉ có một kết nối Mongoose và một logger.

### 8. Facade
[`seed.service.js`](ExpressJS/src/services/common/seed.service.js), [`dashboard.service.js`](ExpressJS/src/services/common/dashboard.service.js) — gom nhiều repository thành một luồng gọi đơn giản.

### 9. Dependency Injection và DTO

[`container.js`](ExpressJS/src/config/container.js) là composition root duy nhất, khởi tạo repository/service và nối dependency. Request/response được chuẩn hóa qua [`dtos/`](ExpressJS/src/dtos/), không trả thẳng Mongoose document từ controller.

## Luồng xử lý tiêu biểu

```mermaid
sequenceDiagram
  participant FE as React
  participant API as Express
  participant Auth as AuthMW
  participant Svc as Service
  participant Bus as EventBus
  participant DB as MongoDB

  FE->>API: POST /attendance + JWT
  API->>Auth: verify token + tenant + RBAC
  Auth->>Svc: recordAttendance
  Svc->>DB: upsert Attendance
  Svc->>Bus: emit attendance.recorded
  Bus->>DB: Notification cho Parent
  Svc-->>FE: EC=0 + data
```

**Đăng nhập:** password hoặc Google → JWT (`_id`, `role`, `schoolId`, `clusterId`) → FE lưu token → `Authorization: Bearer`.

**Phân quyền:** `User.role` = mã Role → cache permissions → `authorizePermission` (legacy key map sang resource/action).

**Nhập điểm:** Teacher POST scores → Strategy → lưu Grade.

**Đơn từ:** Parent/Student tạo → Homeroom/Academic/School Admin review → Observer notify.

## Chuẩn response & lỗi

```json
{ "EC": 0, "EM": "Success", "data": {} }
```

- `EC !== 0`: lỗi nghiệp vụ / validation (422) / auth (401) / forbidden (403)
- `errorHandler` bắt `ApiError`, validation Mongoose, duplicate key (`11000`)

## Bảo mật & ghi chú

- **Không commit** `.env` (đã có trong `.gitignore`). Dùng `.env.example` làm mẫu.
- Đổi `JWT_SECRET` khi deploy; không đưa URI Atlas / Google secret lên Git.
- Menu UI được lọc theo quyền qua `canVisit`; API kiểm tra permission DB và phạm vi dữ liệu. Role tùy chỉnh được kiểm thử riêng.
- Đã có [tích hợp VNPay sandbox](docs/deployment/phase2-vnpay-new-sandbox-terminal.md), [CLI backup/restore](docs/deployment/phase1-backup-restore.md), [tin nhắn WebSocket](docs/features/phase3-realtime-messaging.md) và adapter SSO doanh nghiệp. Việc có code/test local không đồng nghĩa đã xác minh vận hành production; WebSocket hiện dùng event bus trong một tiến trình.
- Chỉ chạy `npm run seed` trong `ExpressJS` khi chủ động tạo lại dữ liệu demo trên database riêng: lệnh xoá dữ liệu hiện có. Không cần seed lại database để chạy regression tự động.

## Kiểm thử và sẵn sàng demo

Chạy từ các thư mục tương ứng:

```powershell
cd ExpressJS
npm test
cd ../ReactJS
npm test
npm run build
npm run test:e2e
```

Backend test và Playwright dùng MongoDB tạm. E2E tự khởi động API ở cổng `8091`, Vite ở `5175`; hai cổng phải trống. Các bài kiểm thử VNPay dùng gateway giả lập và IPN có chữ ký fixture, không thực hiện thanh toán thật.

GitHub Actions chạy backend, frontend, E2E và build hai Docker image. Khi push vào `main`, workflow đẩy đúng image đã kiểm tra lên GitHub Container Registry với tag theo commit; xem [hướng dẫn CI/CD](docs/deployment/ci-cd.md).

Kết quả regression, phạm vi năm luồng demo và các mục còn cần xác minh được ghi tại [checklist sẵn sàng demo](docs/quality/demo-readiness-2026-09-27.md).
