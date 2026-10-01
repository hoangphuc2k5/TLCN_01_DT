# Tái cấu trúc dự án theo Role - Implementation Plan

## Task 1: Chạy test trước khi tái cấu trúc (baseline)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Chạy toàn bộ test suite của ExpressJS (`node --test --test-concurrency=1`) và ghi lại kết quả (số pass/fail/skip) làm cơ sở so sánh.
  - Thử `node -e "require('./ExpressJS/src/app')"` để xác nhận app load được (bỏ qua lỗi env nếu có).
  - Ghi lại snapshot số file và cấu trúc thư mục cũ.
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `rule` TR-1.1: Kết quả test trước được lưu vào file evidence/baseline.txt và không có lỗi import hỏng (bỏ qua lỗi env/db).
- **Notes**: Snapshot baseline phải được lấy TRƯỚC KHI thay đổi file nào.

## Task 2: Di chuyển controllers theo Layer → Role → File
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1 (baseline)
- **Description**:
  - Tạo các thư mục `controllers/{admin,finance,operations,teacher,student,parent,common}/` (danh sách thực tế theo phê duyệt).
  - Di chuyển `controllers/administration/*` → `controllers/admin/`.
  - Giữ `controllers/finance/payroll.controller.js` → `controllers/finance/`.
  - Di chuyển `controllers/common/library.controller.js` → `controllers/operations/` (MANAGE_LIBRARY độc quyền LIBRARIAN).
  - Các file còn lại trong `controllers/common/` giữ nguyên hoặc gộp nếu cùng mục đích.
  - **Không đổi tên file** (giữ hậu tố `.controller.js`) để container tự động load tên cũ.
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `rule` TR-2.1: Tất cả controller nằm đúng `controllers/{role}/` và không có thư mục con trong `{role}/`.
  - `rule` TR-2.2: Không còn `controllers/administration/` (đã đổi tên/thay thế).

## Task 3: Di chuyển services theo Layer → Role → File
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - Tạo các thư mục `services/{admin,finance,operations,teacher,student,parent,common}/`.
  - Di chuyển `services/administration/*` → `services/admin/`.
  - Giữ `services/finance/*` → `services/finance/`.
  - Các service liên quan library/facilities operations trong `services/common/` xem xét di chuyển → `operations/` nếu MANAGE_LIBRARY/MANAGE_FACILITIES độc quyền; còn lại giữ trong `common/`.
  - **KHÔNG đổi tên file** (giữ hậu tố `.service.js`). Nếu gộp file, phải cập nhật container key (không làm trừ khi cần).
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `rule` TR-3.1: Container `services[featureKey]` trả về instance không undefined với mọi key cũ (kiểm tra bằng `node -e`).

## Task 4: Di chuyển repositories theo Layer → Role → File
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - Tạo `repository/{admin,finance,operations,teacher,student,parent,common}/`.
  - Di chuyển `repository/administration/*` → `repository/admin/`.
  - Giữ `repository/finance/*` → `repository/finance/`.
  - Các file còn lại ở `repository/common/` giữ nguyên (chúng cross-cutting hoặc đa role).
  - **base.repository.js** giữ nguyên vị trí hoặc chuyển vào `common/` (cập nhật import nếu đổi).
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `rule` TR-4.1: Container `repositories[featureKey]` với mọi key cũ trong codebase vẫn trả về Proxy/instance hợp lệ.

## Task 5: Di chuyển routes theo Layer → Role → File
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - Tạo `routes/{admin,finance,operations,teacher,student,parent,common}/`.
  - Di chuyển `routes/administration/*` → `routes/admin/`.
  - Giữ `routes/finance/payroll.routes.js` → `routes/finance/`.
  - Library routes nếu có thì → `operations/`.
  - `routes/common/api.routes.js` **giữ nguyên ở vị trí cũ** vì nó là entrypoint tổng (hoặc chuyển vào `common/` và cập nhật `app.js`).
  - Cập nhật TẤT CẢ `require()` bên trong `api.routes.js` theo đường dẫn mới.
- **Acceptance Criteria Addressed**: AC-2, AC-4
- **Test Requirements**:
  - `rule` TR-5.1: `require('routes/common/api.routes')` load được không lỗi MODULE_NOT_FOUND.

## Task 6: Di chuyển và gộp DTOs theo Layer → Role → File
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 5
- **Description**:
  - Tạo `dtos/{admin,finance,operations,teacher,student,parent,common}/`.
  - Di chuyển `dtos/administration/*` → `dtos/admin/`.
  - Giữ `dtos/finance/*` → `dtos/finance/`.
  - **Tùy chọn theo phê duyệt**: Gộp các cặp `{x}.request.dto.js + {x}.response.dto.js` → `{x}.dto.js` (export cả hai module cũ dưới dạng named export).
  - Cập nhật mọi nơi require các file DTO này.
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-6
- **Test Requirements**:
  - `rule` TR-6.1: Tất cả nơi require DTO cũ đều cập nhật; không còn import đến đường dẫn cũ (grep kiểm tra).

## Task 7: Di chuyển tests theo Layer → Role → File
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 6
- **Description**:
  - Tạo `tests/{admin,finance,operations,teacher,student,parent,common}/`.
  - Di chuyển `tests/administration/*` → `tests/admin/`.
  - Giữ `tests/finance/*` → `tests/finance/`.
  - Các test trong `tests/common/` giữ nguyên hoặc chuyển theo role phù hợp (nếu rõ ràng).
  - `tests/common/layers.test.js` và `route-contract.test.js` giữ ở `common/` vì chúng là structural tests.
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `rule` TR-7.1: Lệnh test `node --test --test-concurrency=1` vẫn khám phá được hết file `.test.js`.

## Task 8: Cập nhật tham chiếu tập trung (app.js, api.routes.js, middleware, auth, rbac imports)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 2-7
- **Description**:
  - Cập nhật `app.js` line 7-10: require routes và middleware theo đường dẫn mới.
  - Cập nhật toàn bộ `require()` trong `api.routes.js` cho từng route file.
  - Cập nhật `middleware/common/rbac.middleware.js` (line 2, 41) import container và permission-catalog (nếu đường dẫn thay đổi).
  - Cập nhật `middleware/common/auth.middleware.js` line 4, 6 import.
  - Cập nhật mọi import trong controllers, services, repositories đã di chuyển.
  - Kiểm tra `container.js` load file bằng cách chạy app.
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `rule` TR-8.1: Grep toàn bộ `ExpressJS/src/` cho các đường dẫn cũ (`'../administration/'`, `'../../administration/'`) không còn kết quả nào ngoài comment/documentation.
  - `rule` TR-8.2: `node -e "require('./ExpressJS/src/app')"` chạy không lỗi MODULE_NOT_FOUND.

## Task 9: Rà soát file mồ côi và dọn dẹp
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 8
- **Description**:
  - Dùng grep để liệt kê các file `.js` trong src không được import từ bất kỳ đâu (entrypoints ngoại lệ: `server.js`, `app.js`, route files, model files, test files).
  - Xác nhận các file ứng viên xóa, liệt kê trong báo cáo, chỉ xóa sau phê duyệt nếu cần.
- **Acceptance Criteria Addressed**: AC-3, NFR-4
- **Test Requirements**:
  - `rule` TR-9.1: Không còn file trong src bị import bằng đường dẫn cũ/thư mục cũ (thư mục `administration/` cũ đã xóa).

## Task 10: Chạy test sau khi tái cấu trúc và so sánh baseline
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 8
- **Description**:
  - Chạy lại `node --test --test-concurrency=1` trong ExpressJS.
  - So sánh số pass/fail/skip với baseline của Task 1.
  - Chạy smoke check: `node -e "const a=require('./ExpressJS/src/app');"` và log ra danh sách services.keys/repositories.keys không undefined.
  - Ghi kết quả vào evidence.
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `rule` TR-10.1: Kết quả test pass/fail count giống baseline hoặc tốt hơn (giảm fail).
  - `rule` TR-10.2: Không có MODULE_NOT_FOUND trong log output test/app load.

## Task 11: Tổng hợp báo cáo kết quả
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Tasks 1-10
- **Description**:
  - Liệt kê Role xác định được + căn cứ code.
  - Bảng cấu trúc thư mục trước và sau.
  - Danh sách file đã di chuyển/gộp/xóa.
  - Kết quả build/test trước-sau.
  - Các điểm chưa chắc chắn cần user quyết định.
- **Acceptance Criteria Addressed**: Tất cả AC
- **Test Requirements**:
  - `rubric` TR-11.1: Báo cáo đầy đủ, rõ ràng, link đến file; scale 0-2 (0=thiếu, 1=đủ nhưng khó đọc, 2=đầy đủ dễ đọc); threshold >= 2.
