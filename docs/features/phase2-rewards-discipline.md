# Phase 2.8 - Khen thuong va ky luat (4.10)

Branch: `feat/phase2-rewards-discipline`.

- Added `RewardDisciplineRecord` for reward/discipline incidents beyond semester conduct ratings, including points, description, evidence date and approval status.
- Teachers can submit records for assigned classes; school/academic managers approve or reject them. Students and parents only see approved records for their own student scope.
- Added scoped API routes and a React page with create/review controls.

Validation: `node --test test/rewards-discipline.test.js` -> **2/2**. Covers teacher pending records, manager approval, parent visibility and tenant/personal scope.
