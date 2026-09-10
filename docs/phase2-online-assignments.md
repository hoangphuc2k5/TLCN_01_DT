# Phase 2.2 - Online homework (6.1.4-6.1.6)

Updated: 2026-09-08

Branch: `feat/phase2-online-assignments` (based on `integration/phase1`).

## Delivered

- Added `Homework` and `HomeworkSubmission` models. A homework belongs to one school, class, subject, academic year and assigned teacher; each student has at most one submission per homework.
- Added draft, publish and close lifecycle. Teachers can manage only homework for their own `TeacherAssignment`; school administrators and academic affairs can manage within their school.
- Added date validation against the academic year, optional late window, score range (0-100), non-empty answer validation, and atomic status transitions.
- Added student submission and resubmission while ungraded. Graded submissions are immutable; closed homework does not accept new submissions.
- Added teacher/manager submission listing and grading with feedback. Students and parents receive only scoped submission data.
- Added permission catalog entries `assignments.view/create/update/delete/execute`, role mappings, API controllers and routes.
- Added React page at `/assignments` with create/publish/close, submit and grade flows. The homework API is `/v1/api/homeworks` because `/v1/api/assignments` is the existing teacher-assignment API.
- Added isolated fixture homework and Playwright coverage.

## Validation

- `cd ExpressJS; node --test test/homework.test.js`: **7/7**.
- `cd ExpressJS; npm test`: **172/172** (full backend suite; expected negative-case errors are logged by the test harness).
- `cd ReactJS; npm test`: **10/10**.
- `cd ReactJS; npm run build`: passed (existing large bundle warning remains).
- `cd ReactJS; npx playwright test e2e/phase2-online-assignments.spec.js`: **2/2**.

All tests use MongoDB Memory Server and the local E2E fixture. No Atlas, S3, Gmail, SMS or Zalo service is contacted.

## Continue from here

1. Review/merge this branch into the next Phase 2 integration branch.
2. Add file attachments to submissions through the existing `FileAsset` storage flow if required by the product (current submission is text-only).
3. Add teacher directory picker and richer class/subject filters to the UI; the current manager form accepts an assigned teacher ID.
4. Continue with the next Phase 2 item after the branch is merged.
