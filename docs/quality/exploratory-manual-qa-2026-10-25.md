# Exploratory manual QA report — 2026-10-25

## Summary

Exploratory browser testing was performed against the local frontend (`127.0.0.1:5176`) and API (`127.0.0.1:8092`) using the local test database `edumoet_test` from `ExpressJS/.env.test`. The environment health endpoint reported the API up and MongoDB connected. The app supported logins for Super Admin, Cluster Admin, school administration/academic affairs, teacher, accountant, librarian/facilities, student, and parent accounts during this and the preceding manual QA pass.

The main workflows are reachable and the tested role menus/routes generally follow their expected scope. Blank-form validation works in several important flows, and the transcript export regression was rechecked: exporting PDF and then DOCX for the same synthetic student left transcript history at version 1.

The test environment is heavily seeded with synthetic records. This makes pagination and large lists testable, but also produces dashboard totals and relationships that do not resemble a realistic school. The follow-up fixes below address the confirmed code defects found in the pass. The synthetic timetable and lack of repeatable performance/security testing still limit any production-readiness conclusion.

This report describes exploratory manual testing, not a production security audit, formal load test, accessibility audit, or proof that every business rule is correct. No automated test suite was run in this pass.

## Environment and safety

- Frontend: `http://127.0.0.1:5176`
- API health endpoint: `http://127.0.0.1:8092/v1/api/health`
- Test database: `edumoet_test` (the database name only; no connection secret recorded here)
- Browser: visible Chrome-controlled tab; actions and page results were observed step by step.
- Test identities used: seeded accounts for Super Admin, Cluster Admin, school admin/academic affairs, teacher, accountant, librarian/facilities, student, and parent. Passwords are intentionally omitted.
- No real payment was made. Email-notification and file-deletion jobs were not retried. Destructive delete controls were not exercised. Forms were tested with invalid/blank values; transcript exports used synthetic data in the local test database.
- No application source code was changed during this QA pass. Existing unrelated worktree changes in `docs/planning/` were left untouched.

## Coverage and observations

### Authentication, roles, and tenant scope

- Super Admin, Cluster Admin, school administration/academic affairs, teacher, accountant, librarian/facilities, student, and parent experiences were explored across this and the preceding manual pass.
- Cluster Admin saw both schools in its cluster. Direct navigation to a route outside its role (assignments) returned to the dashboard.
- School academic affairs saw only school AS1 in the school list. Direct navigation to `/clusters` returned to the dashboard. This is positive UI-level tenant-scope evidence; API-level cross-tenant authorization was not independently fuzzed.
- The menus expose different modules by role. Detailed permissions were not exhaustively tested for every action/API endpoint.
- The Super Admin role editor presented editable display name, description, level, status, and permission matrix for the `SUPER_ADMIN` role. The form was opened and cancelled without saving. This is a high-priority safeguard review: verify that the backend prevents accidental self-demotion, privilege escalation, or loss of the only active super-admin account, and consider protecting immutable system-role fields in the UI.

### Super Admin and cluster administration

- Dashboard showed 2 schools and approximately 7,817 users. Cluster dashboard showed 7,815 users, 1,800 unpaid invoices, 98% attendance, and large fee aggregates.
- Cluster creation: blank submit produced required validation for code/name. A duplicate `ANHSANG` code was rejected with “Giá trị code đã tồn tại”; no duplicate was created.
- User creation: blank submit required name and role. The browser autofilled an email and masked password in the new-user form. This appeared to be browser autofill, not a confirmed application default; staff should notice autofilled values before saving.
- Subscriptions: school AS2 had an active BASIC subscription with expiry 30/06/2026, while its paid invoice covered 01/01/2026–31/12/2026. The mismatch may be seed data or a lifecycle update bug and needs reconciliation. Invoice amount defaulted to zero; no invoice was submitted.
- Shared templates: one active system transcript template (`2025.1`) was listed. “Apply to school” rejected a blank submission with required-school validation. No template was applied.
- Support: tickets showed OPEN, IN_PROGRESS, RESOLVED, and CLOSED statuses. An OPEN high-priority ticket could be changed to “Đang xử lý” or “Đã xử lý”; the status was not changed. The expanded detail showed synthetic scenario text.
- Audit log: paginated 10 rows per page. The latest visible entries included CREATE, UPDATE, and DELETE for the same School ID within one second. These were pre-existing QA/test records and were not generated by actions in this pass. The UI shows actor, action, resource, ID, and IP, but the inspected rows did not expose change details.
- Monitoring: showed `System healthy`, database `up`, RSS about 120 MB, and tenant storage `0` bytes for both active schools. Since the test database contains many seeded records, zero may be expected if the metric counts only uploaded files; confirm the metric definition and whether file storage should be represented.
- Cross-school comparison: the initial query correctly required at least two schools. The selector listed the two AS1/AS2 test schools. A completed comparison/export was not produced in this pass.
- Background jobs showed mixed statuses (completed, cancelled, failed, skipped), with retries available. Result/error fields displayed `—`; retry controls were not used because jobs included file deletion and notification email tasks.
- Notifications had 5 pages of synthetic records. The blank compose form correctly required title and content; no notification was sent and delete actions were not used.
- Internal messages reported `Realtime đã kết nối`. Inbox and Sent were empty for the academic-affairs account. Blank compose validation required recipient and body; subject had no required marker. No message was sent to avoid notifying another account.

### School operations and academic workflows

- Academic affairs dashboard showed 5,002 students, 2 teachers, 101 classes, 51 pending requests, and fee/attendance/grade aggregates. These counts are suspiciously synthetic and should not be used as business-logic correctness evidence.
- Class list paginated 10 rows at a time and contained generated `LOAD-*` classes. The first page displayed em dashes for homeroom teachers. The subject catalog had three subjects (English, Literature, Math). Teaching assignments showed the seeded Math teacher assigned to generated classes. This dataset does not look like a coherent representative school timetable/curriculum.
- Timetable displayed 50 rows per page. For Monday 19/10/2026, the first 50 generated classes all showed period 5, Mathematics, and the same teacher, each in a different room. The “30 ngày tới” shortcut updated the range to 25/10–24/11/2026 and loaded upcoming entries. The same teacher appearing in 50 classes in one period is a clearly synthetic/incoherent QA schedule, so it cannot validate scheduling-conflict rules or user experience.
- Leave requests paginated through many generated records and showed PENDING, APPROVED, CANCELLED, and REJECTED states. Pending rows offered approve/reject actions. No decision was made.
- Exams displayed draft and opened exams, with submission history showing submitted and in-progress attempts. The creation form supports Excel import, Word/Aiken text, and manual questions; default duration was 45 minutes. Blank submission required an exam title. No exam was created, opened, or imported.
- Contact book showed draft and published monthly reports. Its form correctly kept the student selector disabled until a class was selected and required class, student, school year, period type, and period key. No report was created or published.
- Class-life pages showed generated activities and completed parent meetings; meeting-room values were `-` for the inspected rows. Activities had open clubs with capacity 60. Rewards displayed many pending discipline records and approval controls. Approval/publish controls were not used.
- Conduct showed generated rating records with the expected rating/comment fields, and the paginator extended to page 501. The blank entry form correctly required student, school year, and rating. No rating was entered.
- Calendar showed 20 pages of generated events and provided Excel exports for grades, fees, and attendance. No delete or event-create action was used in this pass; invalid end-before-start validation had been confirmed in the preceding pass.
- Admissions displayed multiple pages of synthetic applicants. The visible records were all “Nhận học” and still had “Tạo tài khoản học sinh” actions. The action was not clicked because it creates accounts. Verify duplicate-account/idempotency behavior and whether already-accepted applicants should continue to show this action.
- Student documents listed synthetic records and paginated 10 per page. Opening “Xem” for a QA transcript produced “Lỗi hiển thị tệp — Kho file tạm thời không khả dụng”; the modal still offered download. This is a functional defect for the preview path or a missing local file-storage service.
- The same file-preview error reproduced on the Materials module (`Tài liệu LOCAL QA 0068`), strengthening the evidence that the local temporary-file store is unavailable across document views. Materials showed 0.00/51,200 MB used; its form supported a URL or file upload, defaulted “Chia sẻ học liệu” on, and required a title. No material was created.
- Document upload advertised PDF, PNG/JPG, TXT, DOCX, XLSX, or PPTX up to 10 MB. Blank submit correctly required student and title; the attachment itself had no required marker. No file was uploaded.
- Transcript regression check: selected synthetic student `LOAD-HS-04982`, exported PDF and then DOCX. PDF created transcript history version 1; the following DOCX export left it at version 1. Both exports completed without an error in the UI. This verifies the stable-ordering fix for this sampled student/data state, not every possible tie/order combination. The QA transcript version remains in the local test database.
- Prior manual pass covered school admin attendance, grades, fees, assignment/submission review, appointments, calendar, and lesson-plan read/validation; teacher attendance and lesson plans; student and parent dashboards/grades/attendance/fees/assignments/appointments; accountant fees/payroll; and librarian/facilities catalog, loans, returns, facilities, and maintenance.

### UX and data quality observations from the preceding pass

- Student and parent dashboard average grade displayed `—` while grade details showed 8.5.
- Parent recent-fees summary omitted the student name even though the detailed fee page showed it.
- Attendance roster defaulted to “Có mặt” for every row; this can lead to accidental mass attendance submission if the operator does not review the roster.
- The accountant interface showed an Approve action on the accountant’s own draft payroll row. The action was not used; confirm whether self-approval is intentional and enforced server-side.
- Fee collection inputs defaulted to amount `0` in the prior pass. A zero-value payment should be rejected clearly unless there is a valid explicit zero-value workflow.
- Some payroll and equipment-maintenance labels remained in English in otherwise Vietnamese screens.
- Some data tables briefly appeared empty while requests were loading, then populated. Loading states and empty states should be visually distinguishable.
- Calendar validation rejected an end date earlier than the start date. Blank invoice, lesson-plan, appointment, and library-loan forms displayed required-field validation in their respective flows.

## Prioritised findings

| Priority | Finding | Evidence / confidence | Suggested follow-up |
|---|---|---|---|
| High | System Super Admin role editor exposes level/status/permission controls for the current system role. | Observed in UI; no save performed. Impact is a risk, not a confirmed backend exploit. | Review server-side invariants, require deliberate confirmation for changes to system roles, and verify recovery/last-admin protection. |
| High | Student-document preview fails because the temporary file store is unavailable. | Reproduced for a seeded QA record; UI gave an explicit storage error. | Configure the local storage adapter or show a clear unavailable state and validate fallback/download behavior. |
| Medium | Subscription expiration conflicts with its paid full-year invoice period. | Both values visible in the same subscription/invoice module. | Check whether paid renewal updates subscription expiry and reconcile seed data. |
| Medium | Monitoring reports 0 bytes tenant storage for both schools. | Reproduced for both active schools. | Verify metric scope and test with an uploaded file so storage usage is observable. |
| Medium | Generated timetable assigns the same teacher to 50 classes at the same period/day. | Observed on the first 50-row timetable page for 19/10/2026. This is likely synthetic seed design, not evidence of a scheduling-engine defect. | Add realistic schedule fixtures and test conflict prevention with controlled classes/teachers. |
| Medium | Admissions “Create student account” remains available on already accepted rows. | Visible on multiple accepted applicants; action not executed. | Confirm intended workflow and idempotency/duplicate protections. |
| Medium | Dashboard aggregates conflict with the composition of the seeded school data; student/parent average can be blank while details contain grades. | Observed in role dashboards and prior pass. | Validate aggregation queries using a small known dataset; distinguish no-data from loading/error states. |
| Medium | Attendance defaults every roster row to present. | Observed in teacher flow previously. | Consider requiring review or making unmarked status explicit to reduce accidental mass attendance. |
| Medium | Accountant could see approval control on own draft payroll row. | UI control observed previously; server behavior not tested. | Verify separation-of-duties rules in API and hide/disable self-approval where prohibited. |
| Low | Vietnamese/English labels are mixed in payroll and maintenance screens. | Observed previously. | Complete localization and standardize status labels. |
| Low | Some tables show a brief empty state before data arrives. | Observed previously. | Add a loading indicator/skeleton and reserve empty state for a completed zero-result response. |

## Follow-up fixes

Implementation and automated verification were completed after the exploratory pass:

- **File preview:** Local storage now accepts the safe seeded/migrated key shape `schoolId/local-qa/<uuid>.txt` while rejecting traversal and extra path segments. The integration test downloads a nested local asset through the authenticated API.
- **System roles:** System roles cannot be edited in the UI or changed through the role API, including by Super Admin. An integration test verifies the role remains unchanged.
- **Subscription expiry:** Marking an invoice paid now updates the invoice and subscription in one MongoDB transaction. Expiry uses the latest end date, so paying an older invoice cannot shorten a newer term. The integration test covers both cases.
- **Storage usage:** The usage endpoint and monitoring dashboard sum persisted upload assets instead of trusting a stale school counter. Upload and deletion transactions reconcile that counter before reserving or releasing bytes. Read-only inspection of `edumoet_test` found 500 READY assets totaling 53,600 bytes while the counter was 0; integration tests reproduce the stale-counter case and verify both reporting paths.
- **Admissions:** Account creation now goes through a dedicated enrollment endpoint, requires an accepted application, and links the created student back to the application. A unique application reference makes retries idempotent. The interface hides the action after enrollment, asks for the student's real login email, and shows the temporary password once; the account must change it after login.
- **Dashboard:** Grade rows use the stored average field and compute a weighted fallback when historical rows have scores but no average. Recent fee rows include the student name.
- **Attendance:** New rosters start unmarked except for approved leave, and submission is blocked until every student has a status.
- **Payroll:** New records can only be drafts; the creator cannot approve their own record. The interface hides self-approval and uses Vietnamese labels. Integration coverage checks self-approval rejection and approval by a second accountant.
- **UX:** The equipment/maintenance screen is translated, and admissions, payroll, and equipment tables show loading state while fetching.
- **Payment amount:** The current fee-payment form already requires an amount and sets `min={1}`; no code change was needed for the reported zero-payment concern.

The generated timetable and large `LOAD-*` dataset were not rewritten: no tracked generator for that QA dataset exists, and changing the live test records would destroy evidence/data. The timetable service already validates weekly conflicts when a schedule is approved, but the generated records are not suitable for judging realistic scheduling behavior. A production-like dataset remains necessary for that assessment.

After the follow-up fixes, the full backend suite passed **295/295** (`npm test`). Frontend unit tests passed **18/18**, and `npm run build` completed successfully. Focused regression groups also passed, including the persisted-storage/monitoring case, enrollment idempotency, subscription renewal, payroll separation of duties, role protection, and file cleanup. An earlier full-suite attempt had four failures (one stale quota assertion and three MongoMemoryServer startup timeouts); the assertion was corrected, the reward tests passed in isolation, and the final full run completed with no test failures. The exploratory browser session itself was not replayed after code changes, so UI behavior beyond automated coverage still needs a short manual recheck.

## Performance and security limits

- Local pages generally became interactive within a few browser steps and the health endpoint responded, but no repeatable latency sampling, browser profiling, throughput/load test, or database explain analysis was performed. The observed 120 MB RSS is one point-in-time local metric, not a capacity result.
- The 5,000+ student test dataset exercised large list pages and pagination. It is synthetic and does not establish production performance; no concurrent-user workload was applied.
- Role menus, selected direct-route redirects, and one tenant-scoped school list were checked. No API authorization matrix, IDOR probing across tenant IDs, injection testing, CSRF/session testing, password brute-force testing, or dependency/security scan was performed.
- Sensitive actions such as payment confirmation, account creation from an accepted applicant, role mutation, payroll approval, ticket updates, file deletion, and job retries were intentionally not executed.

## Overall assessment

The app is demonstrable against a local seeded database: logins work across major roles, major routes render, common blank-field/date validation works, tenant-scoped school navigation behaved as expected in the two UI checks, and the transcript PDF/DOCX version regression did not reproduce for the selected QA student.

The test data is large enough to exercise pagination but not realistic enough to judge school workflows or dashboard correctness. The confirmed defects above have code fixes and targeted regression coverage. Performance and security still need dedicated repeatable tests before making production-readiness claims.
