# Kế hoạch hoàn thiện đồ án theo rubric CNPM

Ngày cập nhật: 22/09/2026  
Nhánh tích hợp hiện tại: `integration/phase3`

## 1. Mục tiêu và phạm vi chốt

Mục tiêu là hoàn thiện hệ thống quản lý trường học đa trường, đồng thời tạo đủ minh chứng để hội đồng đánh giá được mức độ làm chủ sản phẩm. Kế hoạch này bám theo rubric đồ án CNPM: giá trị thực tiễn, phân tích và thiết kế, chất lượng mã nguồn, kiểm thử, CI/CD, UAT, luận văn, thuyết trình và khả năng trả lời câu hỏi.

Phạm vi sản phẩm được chốt gồm quản lý đa trường và phân quyền, người dùng và lớp học, điểm danh, điểm và học bạ, bài tập/thi trực tuyến, học liệu, học phí, hồ sơ học sinh, tuyển sinh, lịch dạy, thông báo/tin nhắn, báo cáo và các chức năng mở rộng đã ghi trong `docs/implementation-progress.md`.

Các tích hợp bên ngoài chỉ được tuyên bố là hoàn tất khi có UAT thật: Atlas, VNPay IPN, S3, SMTP, Google SSO và SMS/Zalo. Trong thời gian chưa UAT, báo cáo phải nêu đúng là adapter, sandbox hoặc test local; không gọi là đã vận hành production.

Kế hoạch 15 tuần đặt Mức 5 làm mục tiêu cho các tiêu chí có thể đo được. Mức này chỉ được tuyên bố khi có đủ minh chứng thật về khảo sát, acceptance criteria, coverage, CI/CD, staging, UAT và người dùng thực; không dùng số liệu hồi tố hoặc minh chứng không kiểm chứng được.

## 2. Bộ metric cam kết

| Nhóm | Metric chốt | Mục tiêu Mức 4 | Mục tiêu Mức 5 |
| --- | --- | --- | --- |
| Thực tiễn | Bên liên quan hoặc phiếu khảo sát | >= 2 bên | >= 3 bên hoặc >= 30 phiếu |
| Thực tiễn | Giải pháp được so sánh | >= 2 | >= 3 |
| Thực tiễn | KPI nghiệp vụ được chốt | >= 3 | >= 5 |
| Phân tích | User story/use case có acceptance criteria | >= 80% | 100% |
| Thiết kế | Loại sơ đồ khớp mã nguồn | >= 3 | >= 4 |
| Phi chức năng | NFR có ngưỡng định lượng | >= 3 | >= 5 |
| Hoàn thiện | Luồng chức năng cốt lõi đạt trong UAT/demo | >= 85% | 100% |
| Kiểm thử | Coverage mô-đun lõi | >= 50% | >= 70% |
| Kiểm thử | Test tự động và CI cuối | >= 50%, >= 95% pass | >= 70%, 100% pass |
| CI/CD | Pipeline và môi trường staging | >= 4 chặng, >= 5 deploy | >= 6 chặng, >= 10 deploy |
| UAT | Người dùng đúng nhóm mục tiêu | 5-9 người, task >= 80%, SUS >= 68 | >= 10 người, task >= 90%, SUS >= 80 |

Năm KPI nghiệp vụ đề xuất để đo trong UAT:

1. Giáo viên tạo lớp, bài tập hoặc giáo án thành công theo kịch bản.
2. Học sinh nộp bài web/file đúng hạn và giáo viên chấm được bài.
3. Phụ huynh xem đúng điểm, chuyên cần và công nợ của con trong phạm vi được cấp quyền.
4. Kế toán lập hóa đơn theo khoản thu và cập nhật trạng thái thanh toán đúng trong các kịch bản kiểm thử.
5. Quản trị viên xuất học bạ/chứng nhận và xem dashboard theo đúng phạm vi trường hoặc cụm trường.

## 3. Cấu trúc Jira và backlog

Tạo Jira project key `TLCN`. Mỗi Epic có các Task/Story, mỗi Task chỉ tách Sub-task khi phần việc có đầu ra và kiểm thử riêng. Tên branch, commit và pull request mới phải chứa key Jira, ví dụ `feat/TLCN-121-backend-security`, `TLCN-121 Add rate limits`, `TLCN-121 Harden backend security`.

| Epic | Task chính | Sub-task trọng tâm | Minh chứng cần nộp |
| --- | --- | --- | --- |
| TLCN-100 Quản trị đồ án | Chốt sản phẩm và metric | Scope in/out, KPI, phân công, sổ tiến độ tuần | Bản cam kết Bước 3, biên bản GVHD |
| TLCN-110 Phân tích và thiết kế | SRS và acceptance criteria | User story, business rule, data dictionary, NFR | SRS, backlog liên kết Jira |
| TLCN-120 Kiến trúc và mã nguồn | SDD và code quality | Context, component, ERD, sequence, deployment; lint; static scan; secret scan | SDD, CI artifacts, technical-debt register |
| TLCN-130 Backend hardening | Bảo mật và vận hành | CORS/CSP, error policy, rate limit, health/readiness, graceful shutdown, dependency audit | Test, security scan, runbook |
| TLCN-140 Frontend quality | Dễ bảo trì và hiệu năng | Route lazy-load, shared components, API theo domain, ESLint/Prettier | Build report, lint report, E2E |
| TLCN-150 Kiểm thử | Kế hoạch và coverage | Unit, integration/API, E2E, negative/boundary, performance smoke, defect lifecycle | Test plan, coverage, Jira bug, CI report |
| TLCN-160 CI CD và staging | Triển khai có thể lặp lại | Docker, GitHub Environment, deploy staging, healthcheck, rollback, observability | Workflow, URL staging, deploy history |
| TLCN-170 UAT và cải tiến | Thực nghiệm người dùng | Kịch bản, khảo sát SUS, tổng hợp, sửa lỗi, đo lại | Consent/biên bản ẩn danh, raw data, before-after |
| TLCN-180 Luận văn và bảo vệ | Hồ sơ bảo vệ | Luận văn, slide, demo script, Q&A, AI usage log | Bản PDF, slide, video/demo, FAQ |

Các Phase 0-3 đã làm được tạo thành task hồi tố ở trạng thái `Done`, gắn link tới merge commit, tài liệu trong `docs/`, kết quả CI và test liên quan. Không tạo lại issue cho từng commit nhỏ.

## 4. Lộ trình thực hiện từ hiện tại

## 4A. Lịch triển khai 15 tuần

Backlog Epic, Task và Sub-task theo từng tuần được ghi chi tiết tại [jira-15-week-execution-plan.md](jira-15-week-execution-plan.md).

Lịch này phù hợp khi bắt đầu đồ án từ đầu. Việc chốt ở tuần 3 là mốc quản lý thay đổi: khóa mục tiêu, phạm vi, module, mô hình dữ liệu lõi và metric; các thay đổi sau đó vẫn được phép nhưng phải có Jira issue, lý do, tác động và sự đồng ý của GVHD.

| Tuần | Mục tiêu | Công việc cụ thể | Đầu ra cần lưu |
| --- | --- | --- | --- |
| 1 | Tìm hiểu bối cảnh | Xác định nhóm người dùng, phỏng vấn/khảo sát, thu thập quy trình trường học, khảo sát ít nhất 2 giải pháp hiện có | Biên bản, phiếu khảo sát, personas, problem statement |
| 2 | Phân tích thực tế | Tổng hợp pain point, so sánh giải pháp, xác định phạm vi in/out, user story sơ bộ, KPI nghiệp vụ | Báo cáo khảo sát, bảng so sánh, backlog sơ bộ, KPI draft |
| 3 | Báo cáo và chốt thiết kế nền | Báo cáo GVHD; chốt mục tiêu/sản phẩm, scope, module, vai trò, ERD lõi, kiến trúc, công nghệ, NFR, metric và kế hoạch 12 tuần còn lại | Biên bản chốt Bước 3, SRS/SDD bản 1, ERD, WBS/Jira, change log |
| 4 | Nền tảng đa trường | Setup repo/CI, tenant scope, auth, role/permission, User/School/Class schema và layout frontend | Demo đăng nhập/phân quyền, schema migration/seed, test nền |
| 5 | Quản lý học sinh và lớp | Hồ sơ học sinh, phụ huynh, giáo viên, lớp, phân công và chuyển lớp | API/UI, acceptance test, cập nhật data dictionary |
| 6 | Nghiệp vụ đào tạo | Điểm danh, điểm số, hạnh kiểm, học bạ cơ bản, thời khóa biểu | Demo luồng giáo viên - học sinh - phụ huynh, test scope |
| 7 | Dạy và học trực tuyến | Học liệu, bài tập/nộp bài/chấm, giáo án, thi trực tuyến và nghỉ/dạy bù | E2E các luồng học tập, báo cáo tiến độ tuần |
| 8 | Vận hành trường | Học phí/khoản thu, thông báo, sổ liên lạc, lịch hẹn, tuyển sinh, CLB/thi lại | Demo tích hợp giữa module, test quyền và dữ liệu biên |
| 9 | Hồ sơ và báo cáo | Hồ sơ scan, học bạ lịch sử, PDF/Word, dashboard, báo cáo liên trường | Tài liệu xuất, dashboard scope, đối chiếu acceptance criteria |
| 10 | Tích hợp và công việc nền | File storage, backup/restore, jobs, realtime, SSO/OTP, sandbox payment | Adapter test, runbook, kiểm thử các trạng thái thất bại |
| 11 | Hardening backend | Dependency audit, CORS/CSP, rate limit, healthcheck, logging, index/pagination và coverage backend | Security checklist, coverage report, regression CI |
| 12 | Hoàn thiện frontend | Tách component, lazy route, shared UI, responsive, accessibility, lint/format và E2E UI | Build report, lint report, UI regression |
| 13 | Staging và CI/CD | Docker, GitHub Environment, deploy staging, healthcheck, backup/restore drill, rollback | URL staging, deploy history, workflow artifacts |
| 14 | UAT và cải tiến | Cho người dùng thật chạy kịch bản, đo task completion/SUS, ghi bug Jira, sửa và đo lại | Biên bản UAT, raw data ẩn danh, bảng trước/sau |
| 15 | Đóng hồ sơ bảo vệ | Hoàn thiện luận văn, slide, demo script, FAQ, AI Usage Log, diễn tập bảo vệ | Luận văn, slide, demo, checklist minh chứng |

Tuần 1-2 dành cho tìm hiểu và phân tích thực tế; tuần 3 báo cáo và khóa thiết kế nền là hợp lý. Không khóa cứng mọi chi tiết implementation ở tuần 3: chỉ khóa contract lõi như phạm vi, module, dữ liệu chính, role, API boundary, KPI và NFR. Mọi thay đổi sau tuần 3 phải được ghi ở change log để giải thích được khi bảo vệ.

### Giai đoạn 0 — Khóa phạm vi và lập bằng chứng (2 ngày)

- Tạo project Jira, Epic và Task ở mục 3; tạo task hồi tố cho Phase 0-3.
- Lập bản cam kết sản phẩm cuối cùng, năm KPI, phạm vi không làm và metric cùng GVHD.
- Mở sổ tiến độ tuần: việc đã làm, minh chứng, vướng mắc, kế hoạch tuần sau.
- Tạo AI Usage Log hồi tố một cách trung thực: công cụ, mục đích, prompt chính, file sinh ra, phần tự sửa, test kiểm chứng và commit liên quan.

Điều kiện hoàn thành: scope và metric được chốt, Jira có backlog, mỗi chức năng lõi có liên kết đến bằng chứng hiện có.

### Giai đoạn 1 — Hoàn thiện phân tích và thiết kế (1 tuần)

- Viết SRS theo user story/use case; mỗi luồng chính có acceptance criteria, ca lỗi và quyền truy cập.
- Viết business rules cho tenant scope, vai trò, điểm/học bạ, học phí, bài tập, file và thanh toán.
- Hoàn thiện data dictionary từ MongoDB models.
- Vẽ và kiểm tra với mã nguồn ít nhất năm sơ đồ: context, component, ERD, sequence cho thanh toán/nộp bài, deployment.
- Chốt ít nhất năm NFR đo được: p95 API, upload size/thời gian, phân quyền, backup/recovery, availability/healthcheck.

Điều kiện hoàn thành: có SRS/SDD, 100% luồng demo có acceptance criteria, sơ đồ đối chiếu được với code thực tế.

### Giai đoạn 2 — Chất lượng mã nguồn và backend hardening (1 tuần)

- Xử lý dependency audit có kiểm soát; nâng gói, chạy full regression và ghi lại kết quả.
- Giới hạn CORS, bật CSP phù hợp, che thông tin lỗi production, thêm rate limit cho login/OTP/upload/payment.
- Thêm graceful shutdown, health/readiness endpoint, log có request ID và che dữ liệu nhạy cảm.
- Cài ESLint/Prettier; đưa lint, secret scan và dependency scan vào CI.
- Tạo technical-debt register: Redis scale-out, cache/dashboard, pagination, bundle frontend, UAT external services.

Điều kiện hoàn thành: không còn lint error, không có secret trong repository, CI pass, các thay đổi bảo mật có test âm.

### Giai đoạn 3 — Kiểm thử có metric (1 tuần)

- Chuẩn hóa test plan, mapping acceptance criteria -> test case -> test file -> CI run.
- Giữ các tầng unit, integration/API và Playwright E2E; bổ sung performance smoke và kiểm thử phi chức năng cần thiết.
- Bật coverage cho mô-đun lõi: auth/scope, fee/payment, file, assignment, transcript, backup.
- Quản lý defect bằng Jira: severity, reproduction steps, fix commit, regression test và trạng thái đóng.

Điều kiện hoàn thành: full CI pass, coverage đạt mục tiêu đã chốt, không còn defect blocker/critical khi demo.

### Giai đoạn 4 — Staging và CI/CD (1 tuần)

- Merge có kiểm soát `integration/phase3` vào `main` sau khi CI pass.
- Docker hóa backend/frontend/worker, dùng secret của GitHub Environment; không commit `.env` thực.
- Tạo staging công khai có HTTPS, MongoDB/S3 phù hợp, healthcheck sau deploy và rollback.
- Pipeline tối thiểu: lint/static -> test -> security audit -> build image -> deploy staging -> healthcheck.
- Ghi lịch sử deploy, build status, thời gian deploy và backup/restore drill.

Điều kiện hoàn thành: staging truy cập được từ bên ngoài, deploy lặp lại được, có log/healthcheck và ít nhất một lần rollback thử.

### Giai đoạn 5 — UAT và vòng cải tiến (1–2 tuần)

- Tuyển người dùng đúng nhóm: quản trị trường, giáo viên, học sinh, phụ huynh, kế toán; ẩn danh dữ liệu khảo sát.
- Chạy kịch bản tác vụ đã định trước, đo tỉ lệ hoàn thành, thời gian, lỗi và SUS/CSAT.
- Tạo Jira bug/improvement từ phản hồi; ưu tiên theo tác động và sửa ít nhất một vòng.
- Đo lại cùng kịch bản sau sửa, lập bảng so sánh trước/sau.

Điều kiện hoàn thành: có biên bản, dữ liệu gốc, phân tích, thay đổi mã nguồn và kết quả đo lại.

### Giai đoạn 6 — Luận văn, thuyết trình và bảo vệ (1 tuần)

- Viết luận văn theo mạch: vấn đề -> cơ sở -> yêu cầu -> thiết kế -> hiện thực -> kiểm thử/UAT -> bàn luận -> kết luận.
- Dùng ít nhất năm tài liệu ngoại ngữ/chính thức chất lượng; đánh số, chú thích và dẫn chiếu mọi hình/bảng.
- Chuẩn bị slide ít chữ, demo trực tiếp staging, dashboard CI/coverage/UAT, kế hoạch dự phòng demo local.
- Lập FAQ theo module và diễn tập giải thích kiến trúc, query MongoDB, permission scope, VNPay/IPN, test, CI/CD, AI usage và giới hạn còn lại.

Điều kiện hoàn thành: demo chạy được theo kịch bản, slide đúng thời lượng, mỗi thành viên giải thích được phần mình phụ trách và phần AI hỗ trợ.

## 5. Definition of Done cho mỗi Task

Một Task chỉ chuyển `Done` khi có đủ:

1. Acceptance criteria đã đạt và liên kết Jira.
2. Code ở branch có key Jira, commit rõ nghĩa và pull request được review.
3. Unit/integration/E2E phù hợp đã pass; có test âm khi liên quan quyền, tiền, file hoặc dữ liệu học sinh.
4. Cập nhật tài liệu kỹ thuật, API hoặc runbook nếu thay đổi ảnh hưởng vận hành.
5. Link CI, ảnh/chứng cứ UAT hoặc kết quả deploy nếu task yêu cầu.
6. AI Usage Log được cập nhật trung thực nếu có dùng AI.

## 6. Rủi ro và cách xử lý

| Rủi ro | Tác động | Hướng xử lý |
| --- | --- | --- |
| Atlas TLS/Network Access chưa ổn định | Không demo/staging được | Ưu tiên xác minh allowlist, TLS, DNS; chuẩn bị MongoDB local demo dự phòng và ghi rõ giới hạn |
| Dịch vụ ngoài chưa kích hoạt | Không thể tuyên bố production | Tách adapter/test local với UAT thật; ghi trạng thái chính xác trong luận văn |
| Tích hợp thêm làm trễ tiến độ | Mất điểm chứng cứ | Khóa phạm vi; ưu tiên rubric, UAT và deployment trước tính năng mới |
| Dùng AI nhưng không có nhật ký | Rủi ro TC2.3 và bảo vệ | Cập nhật AI log, kiểm chứng bằng test/commit, luyện giải thích mô-đun lõi |
| Test pass nhưng không có coverage | Không đạt mức cao TC2.5 | Bổ sung coverage report và mapping test đến acceptance criteria |

## 7. Báo cáo tiến độ hằng tuần

Mỗi tuần ghi một trang gồm: task Jira đã hoàn thành; link branch/PR/CI; test hoặc metric; vướng mắc; quyết định thiết kế; việc dùng AI; kế hoạch tuần sau. Jira hỗ trợ truy vết công việc, nhưng không thay thế sổ tiến độ và biên bản cần GVHD xác nhận theo rubric.
