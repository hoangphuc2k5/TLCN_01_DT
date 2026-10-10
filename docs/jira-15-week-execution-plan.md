# Kế hoạch Jira 15 tuần cho đồ án quản lý trường học đa trường

## Quy ước sử dụng

- Mỗi dòng **Epic** là một mục tiêu lớn trên Jira.
- Mỗi dòng **Task** là một kết quả có thể review, test và demo độc lập.
- **Sub-task** chỉ là phần việc cụ thể để hoàn thành Task; không tạo issue cho việc quá nhỏ như đổi tên biến.
- Branch, commit và pull request dùng key Jira: `feat/TLCN-123-short-name`, `TLCN-123 Summary`, `TLCN-123 Summary`.
- Hết mỗi tuần, cập nhật Jira, log tiến độ, AI Usage Log và link CI/test. Nếu thay đổi thiết kế sau tuần 3 phải lập change log.
- CI và kiểm thử module diễn ra từ tuần có code đầu tiên: mỗi Task chỉ hoàn thành khi test phù hợp đã pass. Tuần 12 chỉ là mốc kiểm thử tổng thể, tổng hợp coverage, regression và chốt lỗi; không phải thời điểm bắt đầu test.
- Tuần 3 khóa phạm vi `Must`. Chỉ `Must` là khối lượng cam kết chính thức cho TC2.2; `Should`/`Could` chỉ mở khi mọi `Must` trước đó đã đạt acceptance criteria, test pass và CI xanh.
- Definition of Ready cho mọi User Story `Must`: User Story -> Acceptance Criteria -> Business Rule -> NFR liên quan -> Design/API -> Jira Task -> Test Case. Không đưa story chưa đủ Ready vào Development.

Definition of Done cho mọi Task/User Story Must:

- 100% Acceptance Criteria đã đạt.
- Code đã đi qua Pull Request và review.
- ESLint/static analysis/secret scan liên quan pass.
- Unit/integration/API/E2E test phù hợp với Task đã pass.
- Không còn defect Critical/Blocker liên quan.
- API contract, diagram, Data Dictionary hoặc tài liệu liên quan đã cập nhật nếu có thay đổi.
- CI xanh.
- Nếu có UI: đã xử lý loading, empty, error và permission state.
- Link branch/PR/test/CI đã gắn vào Jira.
- AI Usage Log đã cập nhật nếu Task có sử dụng AI.

## Tổng quan Epic

| Epic | Mục tiêu | Tuần |
| --- | --- | --- |
| TLCN-100 Khảo sát và phân tích thực tế | Xác minh bài toán, người dùng, KPI và phạm vi | 1-2 |
| TLCN-110 Thiết kế và chốt giải pháp | Khóa thiết kế nền, dữ liệu, module, stack và NFR | 3 |
| TLCN-120 Backend nền tảng và đa trường | Tenant, auth, quyền, dữ liệu lõi và API chuẩn | 4 |
| TLCN-130 Backend nghiệp vụ đào tạo | Học sinh, lớp, điểm, lịch, bài tập, thi và học liệu | 5-6 |
| TLCN-140 Backend vận hành và tích hợp | Học phí, hồ sơ, tuyển sinh, job, backup, realtime, báo cáo | 7 |
| TLCN-150 Frontend nền tảng | Layout, auth, navigation, design token, API layer | 8 |
| TLCN-160 Frontend nghiệp vụ học tập | Màn hình theo giáo viên, học sinh, phụ huynh | 9 |
| TLCN-170 Frontend vận hành và tối ưu | Học phí, hồ sơ, admin, dashboard, responsive và accessibility | 10-11 |
| TLCN-180 Kiểm thử và chất lượng | Coverage, regression, defect lifecycle và test report | 12 |
| TLCN-190 CI CD và staging | Docker, pipeline, deploy, healthcheck, rollback | 13 |
| TLCN-200 UAT và cải tiến | Thực nghiệm người dùng, khảo sát, sửa và đo lại | 14 |
| TLCN-210 Báo cáo và bảo vệ | Luận văn, slide, demo, AI log và diễn tập | 15 |
| TLCN-220 Kết quả nổi bật | Theo đuổi một minh chứng TC6 có giá trị thực tế hoặc kỹ thuật | 1-15 |

## Tuần 1 — Khảo sát bối cảnh và người dùng

**Epic: TLCN-100 Khảo sát và phân tích thực tế**

### Task: Lập kế hoạch khảo sát

- Sub-task: Xác định nhóm người dùng: quản trị trường, giáo viên, học sinh, phụ huynh, kế toán.
- Sub-task: Viết câu hỏi phỏng vấn/Google Form về quy trình hiện tại, vấn đề, dữ liệu cần quản lý và mức ưu tiên.
- Sub-task: Chuẩn bị biểu mẫu đồng ý tham gia và nguyên tắc ẩn danh dữ liệu.
- Sub-task: Tuyển đủ >= 3 bên liên quan thực tế hoặc >= 30 phiếu phản hồi để đáp ứng điều kiện Mức 5 TC1.

### Task: Khảo sát quy trình hiện tại

- Sub-task: Phỏng vấn/khảo sát quản lý người dùng, lớp học, điểm, học phí và liên lạc phụ huynh.
- Sub-task: Thu thập biểu mẫu hoặc quy trình hiện hành nếu được phép.
- Sub-task: Ghi nhận pain point, thao tác lặp, lỗi dữ liệu và rủi ro phân quyền.

**Điều kiện hoàn thành:** có câu hỏi khảo sát, danh sách người tham gia ẩn danh, biên bản/phiếu phản hồi và log tiến độ tuần 1.

## Tuần 2 — Phân tích thực tế và yêu cầu sơ bộ

**Epic: TLCN-100 Khảo sát và phân tích thực tế**

### Task: Tổng hợp kết quả khảo sát

- Sub-task: Phân nhóm pain point theo vai trò người dùng.
- Sub-task: Vẽ quy trình hiện tại (as-is) cho tuyển sinh, quản lý học sinh, điểm, bài tập và học phí.
- Sub-task: Tạo persona và user journey ngắn cho giáo viên, phụ huynh và quản trị viên.

### Task: Xác định giá trị và phạm vi sản phẩm

- Sub-task: So sánh >= 3 giải pháp hiện có theo cùng bộ tiêu chí.
- Sub-task: Viết problem statement, mục tiêu sản phẩm, phạm vi in-scope/out-of-scope.
- Sub-task: Viết backlog user story sơ bộ và ưu tiên MoSCoW.
- Sub-task: Chốt 5 KPI nghiệp vụ định lượng để đo ở UAT và giữ nhất quán đến bảo vệ.

**Điều kiện hoàn thành:** báo cáo khảo sát, bảng so sánh, danh sách yêu cầu sơ bộ, backlog ưu tiên và KPI draft.

## Tuần 3 — Thiết kế và chốt giải pháp

**Epic: TLCN-110 Thiết kế và chốt giải pháp**

### Task: Chốt phạm vi và module

- Sub-task: Lập ma trận phân loại toàn bộ module/User Story ứng viên thành `Must`, `Should` hoặc `Could`; không mặc định toàn bộ module là phạm vi bắt buộc.
- Sub-task: Chỉ đưa module/User Story thuộc `Must` vào khối lượng cam kết chính thức của Bước 3 và TC2.2; danh sách cuối phải được nhóm và GVHD thống nhất bằng văn bản.
- Sub-task: Mặc định các phần mở rộng như payroll nâng cao, SSO provider thật, realtime chat, subscription/quota, CLB, tài sản, SMS/Zalo và payment production vào `Should/Could`, trừ khi được duyệt chuyển sang `Must`.
- Sub-task: Chốt vai trò, phạm vi dữ liệu trường/cụm/lớp/bản thân/con em.
- Sub-task: Viết acceptance criteria cho 100% User Story/Use Case thuộc scope `Must` trước khi đưa sang Development.
- Sub-task: Chốt các tích hợp external theo mức local, sandbox hoặc production UAT.

### Task: Thiết kế kiến trúc và dữ liệu

- Sub-task: Chốt stack MERN: React/Vite/Ant Design/Redux Toolkit, Express, MongoDB/Mongoose, Node.js, Playwright, GitHub Actions.
- Sub-task: Vẽ context diagram, component diagram, ERD, class diagram, sequence diagram cho login và thanh toán/nộp bài, deployment diagram.
- Sub-task: Chốt ERD/database lõi, naming convention, index strategy, tenant key và soft-delete/audit policy.
- Sub-task: Chốt API convention, error format, authorization flow, file strategy và background job strategy.
- Sub-task: Hoàn thiện Data Dictionary và Business Rules cho mọi entity/luồng thuộc scope `Must`.

### Task: Chốt NFR và kế hoạch thực hiện

- Sub-task: Định lượng ít nhất 5 NFR cho response time, upload, bảo mật, backup/recovery, test coverage và availability.
- Sub-task: Tạo Jira backlog Epic/Task/Sub-task cho tuần 4-15.
- Sub-task: Tổ chức review với GVHD; lập biên bản chốt và change log.

**Điều kiện hoàn thành:** SRS/SDD bản 1, Data Dictionary, Business Rules, sơ đồ, ERD/class diagram, >= 5 NFR, Jira backlog `Must/Should/Could`, Definition of Ready/Done và biên bản chốt Bước 3.

## Tuần 4 — Backend nền tảng đa trường

**Epic: TLCN-120 Backend nền tảng và đa trường**

### Task: Nền tảng API và dữ liệu

**Scope mặc định: `MUST`** — chỉ giữ các phần dưới đây nếu được GVHD duyệt vào scope chính thức ở tuần 3.

- Sub-task: Bật CI backend/frontend tối thiểu gồm install, unit/integration test và build; lưu link run trong Jira.
- Sub-task: Bật từ đầu ESLint, Prettier, static analysis, Gitleaks/secret scan, dependency audit, PR template và branch protection.
- Sub-task: Chuẩn hóa cấu trúc controller-service-repository-model, config và error handler.
- Sub-task: Thiết kế/hiệu chỉnh model School, Cluster, User, Role, Permission và AuditLog.
- Sub-task: Thêm index và validation cơ bản cho dữ liệu lõi.
- Sub-task: Seed/fixture local có dữ liệu đa trường.

### Task: Xác thực và phân quyền

**Scope mặc định: `MUST`**

- [MUST] JWT/session và password policy.
- [SHOULD] 2FA/OTP, chỉ chuyển thành `MUST` nếu biên bản tuần 3 xác nhận đây là yêu cầu bắt buộc.
- Sub-task: Tenant context, data scope, write scope và permission middleware.
- Sub-task: Test chặn truy cập chéo trường/cụm/lớp/con em.

### Task: Vertical slice đầu tiên

**Scope mặc định: `MUST`**

- Sub-task: Tích hợp Auth API + Login UI + session/RBAC cơ bản + test API/UI/E2E + CI trong cùng tuần.
- Sub-task: Demo một luồng từ giao diện tới database thay vì chỉ hoàn thành backend riêng lẻ.

**Điều kiện hoàn thành:** Auth vertical slice chạy được end-to-end, API auth/scope có fixture, unit/integration/UI test pass, tài liệu API và ERD cập nhật.

## Tuần 5 — Backend quản lý học sinh và đào tạo cơ bản

**Epic: TLCN-130 Backend nghiệp vụ đào tạo**

### Task: Quản lý học sinh và lớp

**Scope mặc định: `MUST`** cho user, school, class và tenant scope; chuyển lớp/import nâng cao có thể hạ xuống `SHOULD` nếu chưa được chốt.

- Sub-task: User profile, phụ huynh-học sinh, giáo viên, lớp, môn học và chuyển lớp.
- Sub-task: Validation, import/export cần thiết và audit các thao tác nhạy cảm.
- Sub-task: Scope dữ liệu cho quản trị, giáo viên chủ nhiệm, giáo viên bộ môn, học sinh và phụ huynh.
- Sub-task: Tích hợp UI tối thiểu cho Student/Class để kiểm chứng API contract sớm.

### Task: Điểm danh, điểm và học bạ

**Scope mặc định: `MUST`** cho điểm danh, điểm và kết quả học tập cơ bản; lịch sử học bạ/PDF-DOCX nâng cao cần xác nhận trong biên bản tuần 3.

- Sub-task: Attendance, grade, conduct, quy tắc nhập/sửa/chốt điểm.
- Sub-task: Học bạ điện tử, transcript snapshot/history và export PDF/DOCX.
- Sub-task: Test dữ liệu biên, quyền xem con em và lịch sử thay đổi.

**Điều kiện hoàn thành:** API lớp-học sinh-điểm-học bạ đạt acceptance criteria và có test âm về scope.

## Tuần 6 — Backend dạy học trực tuyến

**Epic: TLCN-130 Backend nghiệp vụ đào tạo**

### Task: Học liệu và bài tập

**Scope mặc định: `MUST`** cho học liệu và bài tập/nộp/chấm cơ bản; giáo án revision/notification là `SHOULD` nếu chưa được chốt.

- Sub-task: FileAsset, upload/download authorization, learning material và audit tải tài liệu.
- Sub-task: Homework, submission WEB/FILE/MIXED, deadline, grading và feedback.
- Sub-task: Lesson plan draft/review/revision và notification.

### Task: Lịch dạy và thi trực tuyến

**Scope mặc định:** `[SHOULD]` timetable, nghỉ/dạy bù và thi online; chỉ chuyển thành `MUST` khi biên bản tuần 3 xác nhận.

- Sub-task: Timetable, leave request, makeup lesson, xung đột lịch và cập nhật theo ngày.
- Sub-task: Exam, attempt, timeout server, autosave, nộp/chấm và thi lại/học lại.
- Sub-task: Test deadline, retry, race condition và quyền giáo viên/học sinh.

### Task: Preview/staging sớm

- Sub-task: Bắt đầu preview hoặc staging tối thiểu tự động từ tuần 6.
- Sub-task: Ghi thời gian commit-to-preview và xử lý các lỗi cấu hình môi trường sớm.

**Điều kiện hoàn thành:** E2E/API test cho các luồng `MUST` giao bài-nộp-chấm pass; các luồng `SHOULD` chỉ được nghiệm thu khi đã được chuyển vào scope và có Definition of Done tương ứng.

## Tuần 7 — Backend vận hành, báo cáo và tích hợp

**Epic: TLCN-140 Backend vận hành và tích hợp**

### Task: Nghiệp vụ vận hành trường

- [MUST] Fee invoice line items, payment manual; VNPay sandbox chỉ là `MUST` nếu đã được nhóm/GVHD chốt.
- [SHOULD] Hồ sơ scan, chứng nhận, tuyển sinh, reward/discipline, contact book, appointment, survey, announcement và notification.
- [SHOULD] Parent meeting, maintenance và các luồng vận hành mở rộng.
- [COULD] Payroll nâng cao, CLB/môn tự chọn và nghiệp vụ hành chính chưa có acceptance criteria.

### Task: Vận hành hệ thống

- [MUST] Backup/restore cơ bản, file storage cần cho `MUST`, job worker tối thiểu, monitoring/health và audit log.
- [MUST] Basic dashboard/report và export theo scope đã chốt.
- [SHOULD] Subscription/quota, SSO adapter, phone login adapter và báo cáo liên trường mở rộng.
- [COULD] SSO provider thật, realtime chat/WebSocket scale-out, SMS/Zalo và subscription/quota nâng cao.

### Task: Hardening backend ban đầu

**Scope: `MUST` cho mọi chức năng được cam kết**

- Sub-task: CORS/CSP/error policy, rate limit, dependency audit, log che dữ liệu nhạy cảm.
- Sub-task: Health/readiness, graceful shutdown, pagination/index review.

**Điều kiện hoàn thành:** toàn bộ API core pass regression; tích hợp ngoài được gắn nhãn chính xác local/sandbox/UAT.

**Kiểm soát tải công việc:** tuần 4-7 chỉ cam kết API và vertical slice `Must` trong scope đã chốt. Các phần mở rộng như SSO provider thật, SMS/Zalo, Redis scale-out, payment production, payroll nâng cao và báo cáo liên trường sâu phải được gắn `Should`/`Could`; không để một tích hợp ngoài chưa có credential làm trễ module lõi.

## Tuần 8 — Frontend nền tảng

**Epic: TLCN-150 Frontend nền tảng**

### Task: Kiến trúc giao diện

**Scope mặc định: `MUST`** cho layout, auth guard, API layer, permission state và shared UI của chức năng `MUST`.

- Sub-task: Setup route, auth guard, Redux auth state, Axios/API layer và error/loading handling.
- Sub-task: AppLayout, navigation config theo quyền và responsive shell.
- Sub-task: Ant Design theme token, global CSS tối thiểu và component dùng chung PageHeader, AsyncState, ConfirmAction.
- Sub-task: Từ tuần 8-12, tự động deploy staging khi merge/integration pass và lưu link deploy vào Jira.

### Task: Màn hình nền tảng

- [MUST] Login/profile/security, dashboard cơ bản, quản lý trường/cụm/user/role thuộc scope đã chốt.
- [SHOULD] 2FA/OTP nếu chưa được đưa vào danh sách `MUST` ở tuần 3.
- [MUST] Form validation và thông báo lỗi theo API contract.

**Điều kiện hoàn thành:** user theo từng role đăng nhập được và chỉ thấy menu/dữ liệu được phép.

## Tuần 9 — Frontend nghiệp vụ đào tạo

**Epic: TLCN-160 Frontend nghiệp vụ học tập**

### Task: Màn hình học sinh, lớp và kết quả học tập

- [MUST] Classes, users, attendance và grades thuộc scope lõi.
- [SHOULD] Conduct, transfer, student documents, học bạ lịch sử và PDF/DOCX nâng cao nếu chưa được chốt ở tuần 3.
- [MUST] Trạng thái trống/lỗi/loading/permission cho các màn hình `MUST`.

### Task: Màn hình dạy học trực tuyến

- [MUST] Materials/library và assignments/submissions/grading cơ bản.
- [SHOULD] Lesson plans, timetable, leave/makeup, exams/retakes và calendar nếu chưa nằm trong scope `MUST`.
- [MUST] Tách component form/table/drawer cho các feature đã cam kết.

**Điều kiện hoàn thành:** giáo viên-học sinh-phụ huynh hoàn tất được luồng học tập trên UI với E2E.

### Task: Chuẩn bị UAT Mức 5

- Sub-task: Lập danh sách ứng viên từ tuần 2-3, xác nhận sơ bộ ở tuần 6, khóa lịch >= 10 người dùng thuộc đúng nhóm mục tiêu ở tuần 9 và có danh sách dự phòng cho UAT tuần 14.
- Sub-task: Chốt consent, task script, cách lưu dữ liệu ẩn danh và mẫu khảo sát SUS.

## Tuần 10 — Frontend vận hành trường

**Epic: TLCN-170 Frontend vận hành và tối ưu**

### Task: Màn hình tài chính và hành chính

- [MUST] Fees line items, manual payment, debt status và export tối thiểu; VNPay return chỉ `MUST` nếu sandbox đã được chốt.
- [SHOULD] Admissions, rewards/discipline, facilities/maintenance, contact book, class life, parent meeting, appointment và satisfaction survey.
- [COULD] Payroll nâng cao, clubs/môn tự chọn và các UI hành chính chưa có acceptance criteria.

### Task: Màn hình quản trị

- [MUST] Jobs tối thiểu, monitoring/health, audit logs và dashboard cơ bản theo scope.
- [SHOULD] Templates, support, subscriptions, school comparison và dashboard analytics mở rộng.
- [COULD] Messages/realtime chat, SSO provider thật, SMS/Zalo và subscription/quota nâng cao.

**Điều kiện hoàn thành:** các màn hình vận hành chính có quyền đúng, xử lý empty/error state và kiểm thử UI cơ bản.

Frontend chỉ bắt buộc triển khai UI cho chức năng `MUST`. Chức năng `SHOULD/COULD` chỉ mở khi toàn bộ `MUST` đã đạt Definition of Done.

## Tuần 11 — Tối ưu frontend và hoàn thiện trải nghiệm

**Epic: TLCN-170 Frontend vận hành và tối ưu**

### Task: Bảo trì và hiệu năng frontend

- Sub-task: Chia `api/index.js` theo domain, tách navigation khỏi AppLayout, giảm component quá dài.
- Sub-task: Lazy-load route, tối ưu bundle, pagination/filter/sort cho danh sách lớn.
- Sub-task: Chuẩn hóa responsive, keyboard navigation, accessible label và empty/loading/error state.

### Task: Chất lượng mã nguồn frontend

- Sub-task: Rà soát và xử lý toàn bộ lint/static-analysis issue còn tồn; bảo đảm ESLint/Prettier và coding convention đã bật từ tuần 4 tiếp tục được áp dụng, quality gate đạt ngưỡng đã cam kết.
- Sub-task: Rà quyền menu/API, inline style và component trùng lặp.
- Sub-task: Build production, smoke test và cập nhật tài liệu UI.

**Điều kiện hoàn thành:** build pass, không còn lint error, bundle/UX issues được ghi nhận trong technical-debt register.

### Task: Pilot usability trước UAT chính thức

- Sub-task: Mời 3-4 người dùng mục tiêu thử các luồng quan trọng trước khi đóng scope UI.
- Sub-task: Ghi lại điểm gây nhầm lẫn, lỗi thao tác và phản hồi về ngôn ngữ/giao diện.
- Sub-task: Sửa các vấn đề usability có tác động cao trước tuần 12.

**Điều kiện hoàn thành:** có ghi chú pilot và Jira issue; pilot này không thay thế số liệu UAT chính thức ở tuần 14.

## Tuần 12 — Kiểm thử tổng thể và release candidate

**Epic: TLCN-180 Kiểm thử và chất lượng**

### Task: Test plan và coverage

- Sub-task: Mapping acceptance criteria -> test case -> test file -> CI run.
- Sub-task: Tổng hợp kết quả unit/service-model, integration/API, frontend unit và Playwright E2E đã chạy xuyên suốt tuần 4-11.
- Sub-task: Tổng hợp và chốt coverage cho các module lõi như auth/scope, file, payment, assignment, transcript, backup và báo cáo; coverage phải được thu thập xuyên suốt từ khi module bắt đầu có test.
- Sub-task: Đo và báo cáo core coverage >= 70%, automated test case ratio >= 70%, final CI pass rate 100% và số defect Critical/Blocker còn tồn tại.

### Task: Regression và defect lifecycle

- Sub-task: Chạy regression liên module và end-to-end cho role, tenant scope, deadline, upload, payment callback, restore và các luồng xuyên module.
- Sub-task: Chạy performance/security smoke cho endpoint/dashboard quan trọng trên release candidate.
- Sub-task: Tạo Jira bug với severity, bước tái hiện, fix commit, regression test và trạng thái đóng.

**Điều kiện hoàn thành:** full CI pass, coverage report được lưu, không còn blocker/critical cho luồng demo.

## Tuần 13 — CI/CD, deploy và vận hành staging

**Epic: TLCN-190 CI CD và staging**

### Task: Đóng gói và pipeline

- Sub-task: Tuần 4 có CI build/lint/test/security cơ bản; tuần 6 bắt đầu preview hoặc staging tối thiểu; tuần 8-12 deploy staging tự động thường xuyên khi merge/integration pass.
- Sub-task: Dockerfile/Compose cho frontend, backend và worker.
- Sub-task: GitHub Actions: lint/static -> test -> dependency/secret scan -> build -> image -> deploy staging -> healthcheck.
- Sub-task: GitHub Environment/secrets, version tag và artifact retention.
- Sub-task: Lưu số lần deploy tự động, build-green rate >= 90% và thời gian commit-to-staging <= 15 phút; mục tiêu >= 10 deploy trải đều.

### Task: Deploy staging

- Sub-task: Merge có kiểm soát vào `main` sau CI pass.
- Sub-task: Deploy HTTPS, cấu hình MongoDB/S3/SMTP/VNPay sandbox theo môi trường.
- Sub-task: Healthcheck, central logs cơ bản, rollback thử và backup/restore drill.

**Điều kiện hoàn thành:** URL staging truy cập ngoài, pipeline lưu artifact, deploy lặp lại được và có bằng chứng rollback.

## Tuần 14 — UAT, khảo sát dự án và cải tiến

**Epic: TLCN-200 UAT và cải tiến**

### Task: Thực nghiệm với người dùng

- Sub-task: Thực hiện UAT với >= 10 người dùng mục tiêu đã tuyển từ tuần 9-10.
- Sub-task: Chuẩn bị task script dựa trên các User Story `Must` và KPI đã chốt ở tuần 3; ví dụ đăng nhập, quản lý lớp/học sinh, nhập-xem điểm, giao-nộp-chấm bài và các nghiệp vụ `Must` khác.
- Sub-task: Đo completion rate >= 90%, thời gian, lỗi, SUS >= 80 và phản hồi định tính.
- Sub-task: Lưu dữ liệu ẩn danh, biên bản và ảnh minh chứng theo quy định riêng tư.

### Task: Cải tiến theo phản hồi

- Sub-task: Phân loại feedback thành bug, usability issue, feature request và ngoài phạm vi.
- Sub-task: Tạo Jira issue, ưu tiên theo impact/effort, sửa các vấn đề có tác động cao.
- Sub-task: Chạy regression, đo lại ít nhất một kịch bản và lập bảng trước/sau.

**Điều kiện hoàn thành:** UAT report có raw data ẩn danh, Jira feedback, commit sửa, test pass và kết quả đo lại.

## Tuần 15 — Báo cáo và bảo vệ

**Epic: TLCN-210 Báo cáo và bảo vệ**

### Task: Hoàn thiện hồ sơ đồ án

- Sub-task: Hoàn thiện, biên tập và đối chiếu luận văn theo mạch vấn đề -> khảo sát -> yêu cầu -> thiết kế -> hiện thực -> kiểm thử -> triển khai -> UAT -> bàn luận -> kết luận; không viết luận văn từ đầu ở tuần 15.
- Sub-task: Bổ sung tài liệu tham khảo chính thức/ngoại ngữ, đánh số/dẫn chiếu hình bảng và kiểm tra trùng lặp.
- Sub-task: Hoàn thiện AI Usage Log: công cụ, phạm vi, prompt chính, phần sửa, test, commit và >= 5 lỗi/ảo giác/đề xuất không phù hợp của AI đã thực sự phát hiện và sửa.

### Task: Chuẩn bị bảo vệ

- Sub-task: Làm slide ít chữ, có sơ đồ, screenshot CI/coverage/UAT và số liệu thật.
- Sub-task: Viết demo script staging, chuẩn bị demo local dự phòng và dữ liệu fixture.
- Sub-task: Lập FAQ kỹ thuật: kiến trúc, MongoDB, scope, auth, payment, testing, CI/CD, AI và hạn chế.
- Sub-task: Diễn tập đúng thời lượng và sửa slide/demo theo feedback.

**Điều kiện hoàn thành:** luận văn, slide, demo, FAQ, AI log và checklist minh chứng sẵn sàng nộp/bảo vệ.

## Theo dõi TC6 xuyên suốt

**Epic: TLCN-220 Kết quả nổi bật**

### Task: Chọn và theo đuổi một kết quả nổi bật có minh chứng

- Sub-task: Khảo sát các hướng TC6 từ tuần 1 và chốt 1 hướng chính + 1 hướng dự phòng chậm nhất cuối tuần 3; xác định metric, bằng chứng và tiêu chí bỏ/chuyển hướng.
- Sub-task: Hướng chính ưu tiên đơn vị/người dùng thật sử dụng staging có xác nhận; hướng dự phòng là benchmark kỹ thuật vượt KPI đã định trước hoặc đóng góp open-source được merge.
- Sub-task: Tuần 3 chốt hướng và evidence plan; tuần 7 phải có bằng chứng trung gian đầu tiên; tuần 11 đánh giá khả năng đạt và kích hoạt phương án dự phòng nếu cần; tuần 14 chốt dữ liệu/minh chứng cuối.
- Sub-task: Chỉ đưa vào hồ sơ khi có dữ liệu/văn bản/commit thật và nhóm giải thích được đầy đủ vai trò của mình.

**Điều kiện hoàn thành:** có tối thiểu một minh chứng TC6 hợp lệ, hoặc ghi rõ không đạt thay vì tạo minh chứng hồi tố.

## Nguyên tắc triển khai để kế hoạch khả thi

1. **Khóa phạm vi `Must` ở tuần 3.** Mỗi tuần chỉ nhận các Task `Must` có tổng công sức phù hợp năng lực nhóm; phần nâng cao chuyển vào backlog `Should` hoặc `Could`.
2. **Test ngay khi code.** Mỗi Task backend/frontend phải có test phù hợp và CI pass trước khi sang tuần tiếp theo. Tuần 12 chỉ chạy full regression liên module, kiểm tra release candidate, coverage và xử lý defect.
3. **Deploy sớm và tích lũy bằng chứng.** Tuần 4 có CI build/lint/test/security cơ bản; tuần 6 bắt đầu preview hoặc staging tối thiểu; tuần 8-12 deploy staging tự động thường xuyên khi merge/integration pass; tuần 13 hoàn thiện pipeline 6+ chặng, Docker, monitoring, healthcheck, rollback, backup/restore và tổng hợp bằng chứng CI/CD. Mục tiêu >= 10 deploy tự động phải được tích lũy theo tiến độ, không tạo hàng loạt ở cuối kỳ.
4. **Tài liệu viết song hành.** SRS/SDD bắt đầu tuần 1-3; API/ERD/test plan cập nhật hằng tuần; tuần 15 chỉ biên tập, kiểm tra trùng lặp và diễn tập.
5. **UAT có hai vòng.** Pilot nhỏ cuối tuần 11 để sửa UX; UAT có số liệu tuần 14 để đo kết quả trước/sau. Nếu UAT phát hiện blocker, ưu tiên sửa blocker hơn thêm tính năng.
6. **Có buffer.** Giữ tối thiểu 20% thời lượng tuần 7, 11 và 14 cho bug, tích hợp khó hoặc thay đổi được GVHD duyệt.

## Quản lý phụ thuộc bên ngoài và rủi ro

- Các phụ thuộc ngoài nhóm như người tham gia khảo sát, người dùng UAT, tài khoản sandbox, credential/API của dịch vụ ngoài phải được theo dõi như `Risk/Dependency` riêng trên Jira, không để lẫn với Task code.
- Với khảo sát TC1, bắt đầu tuyển từ tuần 1 và theo dõi số lượng thực tế hằng tuần cho đến khi đạt `>= 3 bên liên quan thực tế hoặc >= 30 phiếu`; nếu chưa đủ thì mở rộng kênh tuyển ngay, không đợi cuối tuần mới xử lý.
- Với UAT TC2.7, tuần 2-3 lập danh sách ứng viên; tuần 6 xác nhận sơ bộ; tuần 9 khóa lịch `>= 10 người dùng mục tiêu` và có danh sách dự phòng để tránh hủy phút cuối.
- Với VNPay sandbox và external service, kiểm tra khả năng đăng ký, credential, callback URL, hạn chế môi trường và thời gian chờ từ tuần 3-4. Nếu phụ thuộc chưa sẵn sàng, giữ luồng manual/mock/local để không chặn `Must`; sandbox chỉ chuyển thành `Must` khi credential và môi trường đã xác nhận hoạt động.
- Mỗi dependency phải có đủ: `Owner`, `Deadline`, `Status`, `Risk`, `Fallback`, `Evidence`.

## Mốc kiểm soát bắt buộc

| Mốc | Kiểm tra |
| --- | --- |
| Cuối tuần 2 | Có khảo sát/phỏng vấn, dữ liệu gốc, problem statement, KPI và backlog sơ bộ |
| Cuối tuần 3 | GVHD chốt scope/module/ERD/class diagram/stack/NFR/metric; dependency register cho khảo sát/UAT/external services đã có; TC6 đã chốt hướng chính + backup, metric và evidence plan; thay đổi sau đó phải có change log |
| Cuối tuần 7 | Backend core có test và tài liệu API; không mở rộng chức năng mới nếu core chưa ổn định |
| Cuối tuần 11 | Frontend complete theo acceptance criteria; đóng scope chức năng để chuyển sang quality/testing |
| Cuối tuần 12 | Full regression và coverage; chỉ sửa bug, security hoặc blocker |
| Cuối tuần 13 | Staging/CD hoạt động; kiểm tra deploy, restore và rollback |
| Cuối tuần 14 | UAT có số liệu thật, đã thực hiện ít nhất một vòng cải tiến |
| Cuối tuần 15 | Hồ sơ và demo chỉ dùng số liệu, ảnh, log, commit và kết quả kiểm thử có thật |

## Checklist bổ sung để đáp ứng rubric

| Nhóm minh chứng | Việc phải có | Thời điểm chốt |
| --- | --- | --- |
| Hồ sơ môn học | Phiếu đăng ký đề tài đã duyệt; nếu làm nhóm có bảng phân công theo thành viên, module, trách nhiệm và reviewer chéo | Trước tuần 1 |
| Tiến độ | Báo cáo ít nhất một lần mỗi tuần: Jira hoàn thành, link branch/PR/CI, test, vướng mắc, quyết định và kế hoạch tuần sau | Mỗi tuần |
| Cam kết Bước 3 | Văn bản có xác nhận SV/GVHD về sản phẩm cuối, phạm vi, KPI và metric; tuần 3 chốt sớm hơn yêu cầu tối đa 50% thời gian của rubric | Cuối tuần 3 |
| Truy vết yêu cầu | Ma trận User Story -> Acceptance Criteria -> Business Rule/NFR -> Design/API -> Jira Task -> Commit/PR -> Test Case -> CI Run -> UAT Evidence | Bắt đầu tuần 3, cập nhật hằng tuần đến tuần 15 |
| Thiết kế | Tối thiểu context, component, ERD/class, sequence và deployment; đối chiếu ngẫu nhiên với code trước bảo vệ | Tuần 3 và tuần 15 |
| NFR | Ít nhất 3 NFR đo được cho mục tiêu Mức 4, 5 NFR cho Mức 5; ghi cách đo và kết quả thực tế | Chốt tuần 3, đo tuần 12-14 |
| Code quality | Coding convention, ESLint/Prettier, static scan, duplicate-code report <= 3%, secret scan, PR template, branch protection, technical-debt register | Bật từ tuần 4, chốt tuần 12 |
| Git và review | Commit có ý nghĩa trải đều; PR review; branch protection nếu dùng GitHub; log ai làm gì trong nhóm | Từ tuần 4 đến tuần 15 |
| AI governance | AI Usage Log có công cụ, mục đích, prompt chính, file/module, phần tự sửa, test/nguồn kiểm chứng, commit; >= 5 lỗi/ảo giác/đề xuất không phù hợp của AI đã phát hiện và sửa; checklist official docs/license/secret-privacy/test/commit | Mỗi tuần |
| Testing | 4 tầng test, core coverage >= 70%, automated test case ratio >= 70%, final CI pass rate 100%, defect tracker và test case âm/biên | Từ tuần 4, tổng hợp tuần 12 |
| CI/CD | Lưu lịch sử build xanh >= 90%, >= 10 deploy tự động, commit-to-staging <= 15 phút; staging URL, deploy log, healthcheck, rollback và backup/restore evidence | Từ tuần 4, chốt tuần 13 |
| UAT và riêng tư | Danh sách người dùng ẩn danh, consent, task script, raw response, công thức SUS/CSAT, bảng trước/sau cải tiến | Tuần 11-14 |
| Luận văn | Tài liệu tham khảo chính thức/ngoại ngữ, trích dẫn nhất quán, hình/bảng có số và chú thích, kiểm tra trùng lặp | Từ tuần 3, chốt tuần 15 |
| Bảo vệ | Demo staging và local fallback; FAQ cho code, database, security, test, CI/CD, AI, giới hạn và hướng mở rộng | Tuần 15 |

### Mốc điểm cần theo dõi

- **Điều kiện Mức 5 đang nhắm tới:** 3 bên liên quan hoặc >= 30 phiếu; >= 3 giải pháp so sánh; 5 KPI; 100% User Story/Use Case `Must` có acceptance criteria; >= 4 loại sơ đồ; >= 5 NFR; >= 70% core coverage và 4 tầng test; automated ratio >= 70%; CI cuối 100% pass; pipeline 6 chặng, >= 10 deploy, rollback/alert; >= 10 người dùng UAT, completion >= 90%, SUS >= 80 và đo lại sau cải tiến.

Không tạo minh chứng hồi tố không có thật. Nếu một mục chưa đạt, ghi rõ giới hạn, nguyên nhân và backlog khắc phục; rubric đánh giá mức độ làm chủ và khả năng lập luận, không yêu cầu che giấu hạn chế.
