# Phase 2.5 - CLB va thi lai/hoc lai (7.6-7.8)

Branch: `feat/phase2-clubs-retakes`, based on `feat/phase2-parent-meetings`.

- Added `Club` and `ClubRegistration`: school scoped clubs, capacity, open/closed status, student registration and cancellation.
- Added `RetakeRequest`: student request for a subject/year, duplicate pending guard and school-admin/academic-affairs approval or rejection.
- Added dedicated permissions, API routes, React page `/activities`, fixture data and tests.

Validation: dedicated backend **1/1**, production build passed, dedicated E2E **1/1**. The full backend and E2E regression will be recorded on the Phase 2 integration branch.

This implements the request/approval workflow. Scheduling the actual retake session and elective timetable allocation are follow-up extensions.
