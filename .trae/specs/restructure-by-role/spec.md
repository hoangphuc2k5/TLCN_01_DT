# Tái cấu trúc dự án theo Role - Product Requirements Document

## Overview
- **Summary**: Tái cấu trúc các thư mục `controllers`, `services`, `repository`, `routes`, `dtos`, `tests` của backend ExpressJS theo mô hình **Layer → Role → File**, thay vì cấu trúc hiện tại `administration/`, `common/`, `finance/`.
- **Purpose**: Giảm sự chia nhỏ quá mức theo từng chức năng, tạo ra cấu trúc thư mục rõ ràng, nhất quán, dễ bảo trì, dễ tìm file đúng với vai trò người dùng.
- **Target Users**: Nhà phát triển backend dự án TLCN_01_DT.

## Goals
- Cấu trúc thư mục theo Role thực tế của hệ thống (dựa trên code phân quyền).
- Hạn chế tối đa tầng lồng thư mục (chỉ Layer → Role → File).
- Gộp các file nhỏ, rời rạc cùng mục đích.
- Dọn dẹp file dư thừa (nếu có).
- Cập nhật toàn bộ import/export, DI container, route registration sao cho build và test pass.
- **Không thay đổi** business logic, API endpoint, request/response, status code.

## Non-Goals
- Không tái cấu trúc thư mục `ReactJS/` (frontend) — phạm vi chỉ backend `ExpressJS/src/`.
- Không thêm/bớt tính năng, không viết lại logic nghiệp vụ.
- Không thay đổi cấu trúc `models/`, `middleware/`, `utils/`, `config/` trừ khi cần cập nhật tham chiếu.
- Không đổi tên route, endpoint, HTTP method.

## Background & Context
- Code nằm tại `ExpressJS/src/` và được phát triển bằng Node.js (CommonJS `require/module.exports`).
- Hiện tại các layer chia theo `administration/`, `common/`, `finance/` — cách phân chia này không trực tiếp ánh xạ đến Role của người dùng cuối.
- Container (`config/container.js`) tự động load models, repositories, services bằng cách quét file theo hậu tố `.model.js`, `.repository.js`, `.service.js` → **quá trình di chuyển phải giữ nguyên hậu tố** và đảm bảo quét vẫn hoạt động (hoặc cập nhật container nếu cần).
- Route được đăng ký tập trung trong `routes/common/api.routes.js` bằng các hàm `register1/register2`.
- Phân quyền dựa trên các hàm `authorizeRoles`, `authorizePermission`, `authorizePermissionAction`, `authorizeRead` ở `middleware/common/rbac.middleware.js`.
- Danh sách Role gốc trong `config/constants/roles.config.js` gồm 10 vai trò thực tế (xem Bước 1 bên dưới).

## Functional Requirements
- **FR-1**: Đọc toàn bộ source liên quan đến phân quyền (middleware RBAC, roles.config, permissions.config, route protection, role model, user route guards React) để xác định chính xác các Role thực tế trong hệ thống.
- **FR-2**: Tạo cấu trúc thư mục đích `{controllers,services,repository,routes,dtos,tests}/{admin,finance,operations,teacher,student,parent,common}/` (danh sách Role thư mục thay đổi theo kết quả FR-1).
- **FR-3**: Di chuyển và gộp file theo đúng Layer → Role → File, không duplicate code. Chức năng dùng chung đặt vào `common/`.
- **FR-4**: Loại bỏ file mồ côi (không còn được import/tham chiếu ở bất kỳ đâu) và ghi lại lý do.
- **FR-5**: Cập nhật toàn bộ `require()` / `module.exports`, đường dẫn trong `api.routes.js`, `container.js`, `middleware/*`, `services/*` để khớp với vị trí mới.
- **FR-6**: Cập nhật cấu hình (tsconfig nếu có, jest, path alias, build config) nếu ảnh hưởng.
- **FR-7**: Chạy build và toàn bộ test, đảm bảo kết quả giống trước khi tái cấu trúc.

## Non-Functional Requirements
- **NFR-1**: Tất cả API endpoint, method, status code giữ nguyên 100%.
- **NFR-2**: Container auto-discovery (quét file theo hậu tố) tiếp tục hoạt động hoặc được cập nhật tương đương.
- **NFR-3**: Không có import hỏng (`require()` trả về `undefined` hoặc lỗi `MODULE_NOT_FOUND`).
- **NFR-4**: Không có file mồ côi (file mới nằm trong src nhưng không được import từ bất kỳ đâu trừ entrypoints tự nhiên như routes, models).
- **NFR-5**: Cấu trúc mới dễ hiểu, nhất quán giữa các layer; số file gộp giảm đáng kể số lượng file trong mỗi thư mục role so với cấu trúc cũ.

## Constraints
- **Technical**:
  - Backend dùng Node.js + Express, CommonJS modules. Không đổi sang ES module.
  - Container auto-load bằng `path.basename(file, '.${suffix}.js')` → **KHÔNG đổi hậu tố file** (`.controller.js`, `.service.js`, `.repository.js`, `.routes.js`, `.dto.js`, `.model.js`, `.test.js`).
  - Tên model/service/repository trong container phụ thuộc vào basename (không có hậu tố). Nếu gộp file hoặc đổi tên, phải cập nhật tất cả nơi gọi `container.services["xxx"]` và `container.repositories.xxx`.
- **Business**:
  - Không thay đổi business logic.
  - Không thay đổi payload, status code, hoặc endpoint public/private.
- **Dependencies**:
  - Phụ thuộc vào cấu trúc file hiện tại ở `ExpressJS/src/` và `container.js`.

## Assumptions
- Container.js quét file theo `filesIn(root)` đệ quy, nên sau khi tạo thêm thư mục role (admin, finance, operations, teacher, student, parent, common), việc quét vẫn tiếp tục hoạt động MIỄN là hậu tố file giữ nguyên. Sẽ xác nhận lại trong quá trình triển khai.
- Các route trong `api.routes.js` require bằng đường dẫn tương đối → cần cập nhật từng dòng.
- Không có path alias (tsconfig-paths) trong backend; mọi import đều là đường dẫn tương đối/ tuyệt đối.

## Acceptance Criteria

### AC-1: Danh sách Role xác định đúng theo code
- **Type**: `rule`
- **Given**: Source code backend + frontend (roles constants, RBAC middleware, role permission config, route authorize guards)
- **When**: Đối chiếu từng Role được định nghĩa trong `ROLES` enum và từng permission trong `ROLE_PERMISSIONS` cùng cách dùng trong `authorizeRoles()`/`authorizePermission*()`
- **Then**: Phát sinh danh sách Role thư mục cùng căn cứ (role nào được nhóm lại, role nào tách riêng)
- **Pass Condition**: Mỗi thư mục Role đều có ít nhất một căn cứ trong mã nguồn (enum, permission, route guard) và không có Role nào không tồn tại trong code lại được tạo thư mục.
- **Evidence**: File spec ghi rõ Role và link đến code căn cứ.

### AC-2: Cấu trúc thư mục đúng Layer → Role → File
- **Type**: `rule`
- **Given**: Tất cả file trong `controllers/`, `services/`, `repository/`, `routes/`, `dtos/`, `tests/`
- **When**: Kiểm tra cấu trúc thư mục sau khi di chuyển
- **Then**: Mỗi file nằm trong `{layer}/{role}/{file}` với `{role}` thuộc danh sách đã phê duyệt; không có thư mục con lồng thêm bên trong `{role}/`.
- **Pass Condition**: Tất cả file thuộc 6 layer đều đúng vị trí.
- **Evidence**: Kết quả `LS` từng thư mục và bảng so sánh "trước → sau".

### AC-3: Không duplicate logic, chức năng dùng chung đặt vào common/
- **Type**: `rule`
- **Given**: Cặp (hoặc nhóm) file có nội dung hoặc domain giống nhau
- **When**: Kiểm tra các file sau khi di chuyển và gộp
- **Then**: Không có hai file cùng chức năng nằm ở hai thư mục role khác nhau; mọi thứ dùng chung nằm trong `common/`.
- **Pass Condition**: Grep cho các tên cũ không tìm thấy bản sao; count file giảm sau khi gộp.
- **Evidence**: Danh sách file gộp kèm ghi chú.

### AC-4: Tất cả import/export/DI/route registration khớp
- **Type**: `rule`
- **Given**: Toàn bộ mã nguồn sau khi di chuyển
- **When**: Khởi động app (require app.js) và gọi container.services / container.repositories cho từng feature đã đổi vị trí
- **Then**: Không có lỗi `MODULE_NOT_FOUND`, không có `container.services["x"]` là `undefined` với các key cũ vẫn được dùng trong code.
- **Pass Condition**: `node -e "require('./ExpressJS/src/app')"` thoát không lỗi (hoặc lỗi chỉ do thiếu env, không do import hỏng).
- **Evidence**: Kết quả chạy `require(app)` + kết quả build/test.

### AC-5: Build và test pass với kết quả giống trước khi tái cấu trúc
- **Type**: `rule`
- **Given**: Kết quả test trước và sau khi tái cấu trúc
- **When**: Chạy `cd ExpressJS && node --test --test-concurrency=1`
- **Then**: Số test pass/fail/skip bằng nhau hoặc tốt hơn; không có test mới fail do di chuyển file.
- **Pass Condition**: Tất cả test pass, không lỗi runtime.
- **Evidence**: Output test trước và sau (được lưu lại).

### AC-6: Độ phẳng thư mục và ít file rời rạc cải thiện rõ rệt
- **Type**: `rubric`
- **Dimension**: Cải thiện độ phẳng, tính gọn của cấu trúc thư mục
- **Scale**: 0-2
- **Anchors**:
  - 0 = cấu trúc không đổi hoặc tồi hơn;
  - 1 = di chuyển được một phần, vẫn còn nhiều thư mục con hoặc file quá nhỏ không cần thiết;
  - 2 = cấu trúc phẳng Layer → Role → File rõ ràng, các cặp request/response dto được gộp, các chức năng liên quan được gom hợp lý.
- **Pass Threshold**: >= 2
- **Evidence**: Bảng cấu trúc thư mục trước và sau + thống kê số file.

## Open Questions
- [ ] Thư mục `teacher/`, `student/`, `parent/` có cần tạo ngay cả khi ban đầu không có file nào đặc thù (chỉ để cấu trúc nhất quán)?
  - Đề xuất: Tạo sẵn thư mục trống để mở rộng sau này; hoặc không tạo nếu không có file.
- [ ] Có gộp các DTO cặp `*.request.dto.js` + `*.response.dto.js` thành `*.dto.js` (giữ nguyên export tên cũ) không?
  - Đề xuất: Có, vì chúng cùng mục đích và giảm một nửa số file DTO.
- [ ] Có gộp các file infrastructure nhỏ như `system.routes.js` (chỉ /health) vào một file `infrastructure.routes.js` trong `common/` không?
  - Đề xuất: Có, giữ nguyên endpoint.
- [ ] Phạm vi tái cấu trúc có bao gồm luôn `models/` không (người dùng chỉ nêu controllers/services/repository/routes/dtos/tests)?
  - Đề xuất: **Không** bao gồm models/middleware/utils/config theo yêu cầu gốc, trừ khi cần cập nhật import trong các file này.
