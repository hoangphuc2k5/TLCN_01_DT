# Phase 2.7 - Hen giao vien va khao sat hai long (8.6/8.8)

Branch: `feat/phase2-appointments-surveys`.

- Added `TeacherAppointment` with parent/child/teacher scope, future time and duration validation, overlap protection, online/offline mode and request/confirm/decline/complete/cancel lifecycle.
- Added `SatisfactionSurvey` with a 1-5 rating, comment, and unique appointment/respondent constraint.
- Added dedicated permissions for parent requests/surveys and teacher/manager review; API and `/appointments` React page are included.
- Parent APIs only accept their own children and teachers in the same school. Teachers can process only appointments assigned to them.

Validation: `node --test test/appointments-surveys.test.js` -> **2/2**; the production frontend build is run with the Phase 2 integration regression. The tests cover role scope, overlap, lifecycle and duplicate survey handling.
