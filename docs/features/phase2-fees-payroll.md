# Phase 2.11 - Khoan thu khac, nhac no va quan ly luong (9.2, 9.4, 9.6)

Branch: `feat/phase2-fees-payroll`.

- Extended fee invoices with category (`TUITION`, `OTHER`, `BOARDING`, `TRANSPORT`, `ACTIVITY`), detailed description and reminder controls.
- Added scoped debtor listing and idempotent daily reminder generation. Each overdue invoice sends in-app notifications to the student and linked parents once per day; the endpoint is safe to retry.
- Added `PayrollRecord` with monthly period, salary components, calculated net amount and DRAFT -> APPROVED -> PAID workflow. Employee, tenant and amount validation is enforced.
- API: `GET /fees/debtors`, `POST /fees/reminders/run`, `GET/POST /payroll`, `PATCH /payroll/:id/status`. Fees UI includes categories and reminder action; Payroll page is available at `/payroll`.

Validation:

- `cd ExpressJS; node --test test/fees-payroll.test.js` -> **2/2**.
- `cd ReactJS; npm run build` -> passed (existing large chunk warning remains).
