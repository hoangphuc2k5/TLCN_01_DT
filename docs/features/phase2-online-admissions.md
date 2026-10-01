# Phase 2.9 - Tuyen sinh online (4.6)

Branch: `feat/phase2-online-admissions`.

- Added public admission submission by school code/subdomain, generated tracking code and public status lookup.
- Added `AdmissionApplication` workflow: SUBMITTED, UNDER_REVIEW, ACCEPTED, REJECTED and WAITLISTED, with scoped staff review and notes.
- Added staff API, public React application/tracking form and management table. Sensitive reviewer fields stay out of public tracking responses.

Validation: `node --test test/online-admission.test.js` -> **2/2**; dedicated Playwright E2E -> **1/1**; production build passed.
