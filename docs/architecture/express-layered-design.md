# ExpressJS layered architecture

## Mục tiêu và giới hạn

Tái cấu trúc toàn bộ `ExpressJS/src` theo yêu cầu người dùng, giữ nguyên nghiệp vụ và hợp đồng HTTP/WebSocket/CLI. Không đổi dependency, MongoDB collection, tên model, schema dữ liệu, index, quyền truy cập, tenant scope, thứ tự middleware, status code, thông báo, header, cookie hay định dạng response. Giữ CommonJS.

## Kiểm kê chức năng trước khi sửa mã

- auth: mật khẩu, Google, điện thoại, SSO, MFA, session, throttle, password policy.
- user, role: người dùng, hồ sơ, phân quyền động, permission cache.
- tenant: cụm và trường.
- academic: năm học, lớp, môn học, phân công giáo viên; student-transfer: chuyển trường.
- attendance, grade, conduct, reward: điểm danh, điểm số, hạnh kiểm, khen thưởng/kỷ luật.
- student-document, transcript, certificate: hồ sơ, lịch sử học bạ, chứng nhận.
- timetable, teaching-schedule, leave: thời khóa biểu, lịch dạy, nghỉ và dạy bù.
- lesson-plan, homework, exam, retake: giáo án, bài tập, bài thi và thi lại.
- admission, contact-book, class-life, appointment, survey, club: tuyển sinh và tương tác trường/gia đình.
- fee, payment, online-payment, payroll, subscription: học phí, công nợ, thanh toán, bảng lương, gói dịch vụ.
- material, file, library, facility, equipment: học liệu, kho file, thư viện, cơ sở vật chất, bảo trì.
- announcement, notification, mail, message, calendar: thông báo, email, realtime và lịch.
- search, import, export, dashboard, report: tìm kiếm, nhập/xuất dữ liệu, thống kê.
- template, support, audit, monitoring, job, backup, seed: quản trị và vận hành.

Các nhóm trên được nhận diện từ routes, models, services và scripts hiện có; không phải chức năng mới.

## Hiện trạng đã xác nhận

- `app.js` đã cấu hình Express riêng; `server.js` đã thực hiện bootstrap/listen.
- `middleware/errorHandler.js` đã có một error handler tập trung và một not-found handler.
- `repositories/index.js` tạo BaseRepository cho một phần models; nhiều service vẫn import model trực tiếp.
- Các controller `moduleController`, `advancedController`, `crossController` gộp nhiều chức năng.
- Route được khai báo tập trung trong `routes/api.js`.
- Tests dùng Node test runner, nằm trong `ExpressJS/test`; một số test tích hợp dùng mongodb-memory-server.

## Phương án

Chọn chuyển từng nhóm chức năng theo chiều dọc, mỗi nhóm có đủ route/controller/DTO/service/repository/model rồi kiểm tra trước khi chuyển nhóm tiếp theo. Cách này khoanh vùng hồi quy tốt hơn đổi toàn bộ trong một lượt. Chỉ đổi tên/di chuyển file trước rồi mới sửa dependency dễ kiểm tra đường dẫn, nhưng kéo dài trạng thái kiến trúc trung gian và phải sửa import nhiều lần.

## Cấu trúc và dependency

Các thư mục lớp: `config`, `controllers`, `middleware`, `models`, `repository`, `services`, `routes`, `dtos`, `utils`, `tests`. Các lớp nghiệp vụ dùng cấu trúc `layer/role/file`: `administration`, `finance`, `common`. File vẫn theo `<feature>.<layer>.js`; hạ tầng dùng cùng quy ước, ngoại trừ ba entry point bắt buộc `app.js`, `server.js`, `config/container.js`.

`administration` ánh xạ các trách nhiệm chính của `SUPER_ADMIN`, `CLUSTER_ADMIN`, `SCHOOL_ADMIN` và `ACADEMIC_AFFAIRS`. `finance` chứa phần do `ACCOUNTANT` sở hữu như payroll và tính toán hóa đơn. Module được giáo viên, học sinh, phụ huynh hoặc nhiều nhóm quản trị cùng sử dụng nằm trong `common`; không nhân bản module theo từng role.

Theo phạm vi bổ sung, `src` cuối cùng chỉ còn các thư mục lớp trên và hai entry point. Backup, worker, realtime, seed, constants và tài nguyên được phân lại vào `repository`/`services`/`utils`/`config`; thư mục tương thích cũ, thư mục rỗng và view mẫu không có consumer được loại bỏ.

Ví dụ: `services/administration/user.service.js`, `repository/administration/user.repository.js`, `models/common/user.model.js`, `dtos/administration/user.request.dto.js`, `dtos/administration/user.response.dto.js`.

Luồng chính: route -> middleware -> controller -> service -> repository -> model.

- Model giữ schema/index và định nghĩa model; xử lý nghiệp vụ trong hook/method nếu có phải được khảo sát và chuyển sang service mà không đổi các nơi gọi, kể cả seed/job/scripts.
- Repository nhận model/connection qua constructor, chứa toàn bộ query, aggregation, populate, session và persistence. Không đưa model hoặc Mongoose Query cho service tiếp tục truy vấn. Các thao tác save/update/delete phải đi qua repository.
- Service nhận repository, service cộng tác và adapter qua constructor; không import model, không lấy dependency ngầm từ container. Quyết định nghiệp vụ và kiểm tra quyền/phạm vi dữ liệu giữ nguyên.
- Controller nhận service và DTO, đọc request, gọi service, trả response. Xử lý export/download/stream giữ đúng HTTP semantics; phần dựng nội dung chuyển vào service.
- DTO tách request/response theo chức năng. Request DTO bảo toàn semantics của dữ liệu hiện có, không tự thêm coercion, default hoặc loại bỏ field đang được chấp nhận. Response DTO tạo dữ liệu thuần giữ đúng JSON hiện tại, gồm ObjectId/date/null/undefined và các transform sẵn có. Không trả trực tiếp Mongoose document.
- `config/container.js` là nơi duy nhất khởi tạo/nối repository và service. Router và transport nhận các instance đã nối. Tránh service locator và circular require.
- DB connection dùng một instance và chia sẻ promise khi kết nối đồng thời; lỗi kết nối không để cache promise thất bại vĩnh viễn. Logger là một instance dùng chung, giữ mức và nội dung log hiện có.
- Mọi lỗi HTTP đi qua asyncHandler/next và một error middleware, giữ nguyên mapping lỗi hiện tại. Giữ các phản hồi đặc thù giao thức của payment gateway. Các lỗi WebSocket, job và CLI giữ vòng đời riêng của transport tương ứng.
- Các phần backup, job, realtime, patterns và constants được phân vào lớp/chức năng phù hợp. Giữ tài nguyên font/view dưới assets/views vì đó là dữ liệu tài nguyên; kiểm tra lại mọi đường dẫn dựa trên __dirname.

## Trình tự chuyển đổi

1. Cài đúng lockfile, chạy test và smoke test ban đầu; ghi rõ lỗi có sẵn trước refactor.
2. Thêm test hợp đồng cho route/response, middleware order, serialization và các trường hợp nhạy cảm thiếu coverage. Thiết lập container, singleton và quy tắc dependency.
3. Chuyển auth/user/role/tenant, sau đó academic và phạm vi truy cập dùng chung.
4. Chuyển nghiệp vụ học tập và quản lý học sinh.
5. Chuyển tài chính, tài nguyên và tương tác.
6. Chuyển báo cáo/import/export, job/realtime/backup và các script sử dụng backend.
7. Hoàn tất cấu trúc tests, kiểm tra toàn bộ import/require, xóa các đường dẫn chuyển tiếp đã hết người dùng, chạy toàn bộ kiểm chứng.

Mỗi nhóm nhỏ phải chạy test liên quan và khởi động app để kiểm tra root/health/error route trước khi tiếp tục. Giữ tạm compatibility export chỉ khi cần trong bước trung gian; kết quả cuối không phụ thuộc đường dẫn cũ.

## Kiểm chứng và tiêu chí hoàn thành

- `src/tests/<role>/<feature>.test.js` phản chiếu nhóm role; hậu tố `.integration.test.js` phân biệt test tích hợp. Service unit test inject repository giả, không mock model trực tiếp.
- Test kiến trúc phát hiện import model ngoài repository/container/model, query DB trong service/controller và khởi tạo service/repository ngoài container. Đánh giá riêng script seed và bootstrap để đưa persistence qua repository.
- Giữ nguyên route method/path, thứ tự đăng ký có ý nghĩa, quyền, tenant scope, validation, HTTP status/header/body, download/stream, callback thanh toán và events.
- Đối chiếu hành vi transactions trên replica set và standalone; kiểm tra idempotency thanh toán, job, file path, realtime và backup restore.
- Chạy toàn bộ `npm test`, khởi động `server.js` với DB kiểm thử riêng và gọi root/health; không seed hay chạy thử thao tác ghi trên DB người dùng.
- Kiểm tra scripts worker/backup/seed và đường dẫn assets; không tuyên bố chúng chạy thành công nếu chỉ kiểm tra syntax/import.
- Báo cáo cuối ghi kết quả thực tế, phần thay đổi và giới hạn môi trường còn lại. Không đánh đồng test chưa chạy với test pass.

## Phạm vi bổ sung: CI/CD toàn dự án trên GitHub

Người dùng yêu cầu thêm CI/CD và chọn GitHub. Phạm vi bao gồm ExpressJS, ReactJS và kiểm thử tích hợp giữa hai ứng dụng; tiếp tục giữ mục tiêu refactor backend ban đầu.

### Hiện trạng CI

Repo có remote GitHub `hoangphuc2k5/TLCN_01_DT`. `.github/workflows/ci.yml` đã có ba job chạy trên Node 22: backend tests, frontend tests/build và Playwright E2E với MongoDB fixture. Trigger hiện tại gồm push main/integration/feat/fix, pull request main/integration và workflow_dispatch. Playwright khởi động backend fixture ở cổng 8091 và Vite ở cổng 5175, lưu report khi job kết thúc. Chưa thấy workflow CD hoặc Dockerfile trong khảo sát.

### Thiết kế CI bổ sung

- Mở rộng workflow hiện có, không tạo pipeline CI trùng lặp.
- Cài dependency từ lockfile riêng của mỗi ứng dụng; cache keyed theo lockfile tương ứng.
- Backend chạy toàn bộ unit/integration và test kiến trúc sau refactor; frontend chạy policy/unit tests và production build.
- E2E kiểm tra React kết nối API với DB fixture riêng, không dùng dữ liệu production; cập nhật import fixture khi refactor đổi đường dẫn.
- Giữ report/trace/screenshots khi thất bại, lưu artifact build để truy nguyên theo commit.
- Bổ sung kiểm tra đóng gói theo phương án CD được chọn; chỉ cho phát hành khi các job bắt buộc cùng commit thành công. Không dùng continue-on-error để bỏ qua test lỗi.
- PR chỉ dùng quyền đọc; quyền phát hành chỉ cấp tại job CD trên nhánh phát hành. Secrets cấu hình qua GitHub, không đưa vào source, artifact frontend hoặc image.
- Viết hướng dẫn các checks bắt buộc, biến cấu hình và cách chạy lại pipeline; cấu hình branch protection trên GitHub cần quyền quản trị và phải được xác minh riêng.

### Phương án CD đã chọn: GitHub Container Registry

Người dùng chọn build và đẩy Docker image lên GHCR, chọn máy chủ sau. Đây là continuous delivery tới registry; chưa bao gồm continuous deployment tới môi trường chạy ứng dụng. Không triển khai lên GitHub Pages.

- Backend image `ghcr.io/hoangphuc2k5/tlcn_01_dt-api` chạy API mặc định; worker dùng cùng image với `npm run worker`. Bao gồm scripts và tài nguyên cần thiết; chỉ cài production dependencies, kiểm tra native bcrypt hoạt động trong image Linux.
- Frontend image `ghcr.io/hoangphuc2k5/tlcn_01_dt-web` build React bằng multi-stage Dockerfile rồi phục vụ static assets qua Nginx. Cấu hình SPA fallback và proxy `/v1` đến backend, hỗ trợ WebSocket/SSE, không dựa vào Vite dev server cho production.
- Thêm `.dockerignore` theo build context để loại node_modules, .env thật, dữ liệu storage/backup, test reports và dữ liệu cục bộ. Không đóng gói MongoDB hay dữ liệu người dùng vào image ứng dụng.
- CI trên PR build image để phát hiện lỗi Dockerfile nhưng không login/push GHCR.
- Sau push `main`, chỉ publish khi backend tests, frontend tests/build, E2E và kiểm tra image thành công trên cùng commit. Cả hai image có tag `sha-<full-commit-sha>`; tag `latest` đại diện bản main đã qua kiểm tra. Serialize các lần phát hành main để tránh bản cũ ghi đè latest sau bản mới.
- Dùng GITHUB_TOKEN với `contents: read`, `packages: write` riêng cho job publish; không yêu cầu PAT mặc định. Dùng tên registry lowercase và OCI labels liên kết package với repository/commit.
- Pin action theo commit SHA được xác minh khi triển khai workflow; ghi rõ phiên bản tham chiếu để bảo trì. Giữ quyền publish tách khỏi job chạy mã PR.
- Có hướng dẫn pull theo tag SHA, chạy API/web/worker, cấu hình MongoDB replica set/Atlas bên ngoài, volume kho file dùng chung API/worker và cấu hình biến môi trường lúc chạy. Biến VITE_* là dữ liệu công khai trong bundle, không chứa secret.
- Không tự push branch hoặc công bố package ra tài khoản trong giai đoạn chuẩn bị local; xác minh quyền và kết quả GHCR khi thực hiện phát hành được yêu cầu. Không đổi package visibility thành public ngầm.

### Tiêu chí kiểm chứng CI/CD

Kiểm tra syntax workflow và tham chiếu script/path, chạy các lệnh CI tại local khi môi trường cho phép, rồi xác minh lần chạy GitHub Actions thực tế sau khi workflow được push. Build/publish/deploy phải chỉ rõ commit; kiểm tra health và phương án quay về phiên bản trước nếu có host triển khai. Báo cáo tách rõ kiểm tra local, workflow đã chạy trên GitHub, và ứng dụng đã được deploy.

## Kết quả baseline local

Chưa thay đổi mã ứng dụng. Lần chạy `npm test` ban đầu thất bại do thiếu `mongoose`. `npm ci --no-audit --no-fund` đã cài 330 packages theo lockfile, exit 0; npm chặn install scripts của bcrypt và mongodb-memory-server theo cấu hình allowScripts. Chạy lại `npm test` vẫn exit 1, xác nhận thiếu native binding `bcrypt_lib.node`. Chưa có baseline test pass hoặc xác nhận server khởi động thành công. Cần cho phép các install script cần thiết rồi chạy lại trước refactor.
