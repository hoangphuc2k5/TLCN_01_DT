# Branch merge and CI audit - 2026-09-10

## Kết luận

- Đã fetch/prune và đối chiếu 36 nhánh remote. Cả 30 nhánh `feat/*`/`fix/*` trên remote và nhánh phụ chỉ có local đều đã được gộp vào nhánh tích hợp tương ứng, cuối cùng nằm trong `integration/phase3`.
- Chuỗi `integration/phase0` → `phase1` → `phase2` → `phase3` đầy đủ. Chưa gộp vào `main`/`Develop`; hai nhánh này cùng commit `306c72c`.
- GitHub đã chạy lại các nhánh tích hợp lớn trên HEAD mới: `integration/phase0` (`8eb7741`), `integration/phase1` (`c1811a9`), `integration/phase2` (`6062a00`) và `integration/phase3` (`31a37c9`). Mỗi lượt đều có backend, frontend/build và Playwright E2E **success**.
- Đã đọc log lượt mới nhất `34475264213`: `Cannot find module 'mongoose'` tại `ExpressJS/scripts/phase0-fixture.js`. Job E2E chưa cài dependencies ExpressJS nên server fixture không khởi động; chưa chạy tới các ca kiểm thử.
- Đã sửa `.github/workflows/ci.yml`: job E2E cài `ExpressJS` bằng `npm ci` trước khi khởi động fixture, đồng thời thêm `fix/**` vào push trigger. Workflow đã được đưa vào phase 0–3.
- Sau khi kiểm tra ancestry, đã xóa 29 nhánh `feat/*`/`fix/*` đã gộp khỏi local và remote. Chỉ còn các nhánh tích hợp, `main` và `Develop`.

Snapshot after git fetch origin --prune. Exact commit ancestry; CI matched to branch AND HEAD SHA.

| Remote branch | HEAD | Earliest containing integration | CI at HEAD |
| --- | --- | --- | --- |
| Develop | 306c72c | integration/phase0 | No run found; no CI workflow |
| feat/ci-pipeline | 01d5065 | integration/phase3 | [failure](https://github.com/hoangphuc2k5/TLCN_01_DT/actions/runs/34447949868) |
| feat/phase1-auth-security | 2ee28d1 | integration/phase1 | No run found; no CI workflow |
| feat/phase1-backup-restore | a25f216 | integration/phase1 | No run found; no CI workflow |
| feat/phase1-file-storage | 9f27526 | integration/phase1 | No run found; no CI workflow |
| feat/phase1-job-queue | 6cee993 | integration/phase1 | No run found; no CI workflow |
| feat/phase2-appointments-surveys | 1c86ad6 | integration/phase2 | No run found; no CI workflow |
| feat/phase2-clubs-retakes | 88d4425 | integration/phase2 | No run found; no CI workflow |
| feat/phase2-contact-book | 094167a | integration/phase2 | No run found; no CI workflow |
| feat/phase2-equipment-maintenance | 1b00b38 | integration/phase2 | No run found; no CI workflow |
| feat/phase2-fees-payroll | 48db0ed | integration/phase2 | No run found; no CI workflow |
| feat/phase2-online-admissions | 4d7e655 | integration/phase2 | No run found; no CI workflow |
| feat/phase2-online-assignments | 339c43a | integration/phase2 | No run found; no CI workflow |
| feat/phase2-online-payments | f3cd2b2 | integration/phase2 | No run found; no CI workflow |
| feat/phase2-parent-meetings | 955e26c | integration/phase2 | No run found; no CI workflow |
| feat/phase2-platform-hardening | ec6d60a | integration/phase2 | No run found; no CI workflow |
| feat/phase2-rewards-discipline | 367477d | integration/phase2 | No run found; no CI workflow |
| feat/phase2-sso-phone-realtime | 9aefda1 | integration/phase2 | No run found; no CI workflow |
| feat/phase2-student-dossiers-certificates | 5dbf826 | integration/phase2 | No run found; no CI workflow |
| feat/phase2-teaching-schedule | 9bc7e51 | integration/phase2 | No run found; no CI workflow |
| feat/phase2-vnpay-sandbox | a13a1cb | integration/phase2 | No run found; no CI workflow |
| feat/phase3-docx-transcripts | 6bc0b2e | integration/phase3 | No run found; no CI workflow |
| feat/phase3-final-regression | da58dc8 | integration/phase3 | No run found; no CI workflow |
| feat/phase3-homework-file-submissions | 8a09d63 | integration/phase3 | No run found; no CI workflow |
| feat/phase3-lesson-plan-approval | 672e059 | integration/phase3 | No run found; no CI workflow |
| feat/phase3-realtime-messaging | f6b7b4d | integration/phase3 | No run found; no CI workflow |
| feat/phase4-exam-lifecycle | 954cadb | integration/phase3 | [failure](https://github.com/hoangphuc2k5/TLCN_01_DT/actions/runs/34451055098) |
| feat/phase4-school-comparison-export | b872cc6 | integration/phase3 | [failure](https://github.com/hoangphuc2k5/TLCN_01_DT/actions/runs/34451808755) |
| feat/student-class-transfers | 46d3692 | integration/phase3 | [failure](https://github.com/hoangphuc2k5/TLCN_01_DT/actions/runs/34475239255) |
| fix/phase2-atlas-dns | 19d2e5f | integration/phase2 | No run found; no CI workflow |
| fix/school-comparison-complete | 649e55a | integration/phase3 | No run found; workflow present |
| integration/phase0 | cdbdb11 | integration/phase0 | No run found; no CI workflow |
| integration/phase1 | 5df9cfb | integration/phase1 | No run found; no CI workflow |
| integration/phase2 | 158fdb0 | integration/phase2 | No run found; no CI workflow |
| integration/phase3 | 14f53ad | integration/phase3 | [failure](https://github.com/hoangphuc2k5/TLCN_01_DT/actions/runs/34475264213) |
| main | 306c72c | integration/phase0 | No run found; no CI workflow |

Local-only branch `feat/phase3-homework-attachments` points to the same commit as `feat/phase3-lesson-plan-approval` (672e059) and is included in integration/phase3.

All 9 available Actions runs failed E2E; backend and frontend/build succeeded in every run. No historical run was found for the older phase branches. main and Develop remain at 306c72c and have not received the integration phases.

Workflow inspection: E2E installs ReactJS dependencies but does not install ExpressJS dependencies required by phase0-fixture.js. Push filters omit fix/**.
