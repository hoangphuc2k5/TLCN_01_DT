# Phase 2.14 - Nen tang van hanh va bao cao (2.4, 2.5/3.3, 3.4, 2.2, subdomain)

Branch: `feat/phase2-platform-hardening`.

- Added `/monitoring` with database ping, process uptime/memory/latency, tenant storage usage and user/class totals.
- Template application now stores a full `TemplateDeployment` snapshot per school and updates deployed content/version when the source template changes. `GET /template-deployments` exposes synchronized deployments.
- Added `/reports/schools/compare` for scoped cross-school comparison of students, teachers, classes, grade averages and fee balances.
- Subscription plans now enforce active student/teacher limits during account creation, with clear `SUBSCRIPTION_LIMIT` conflicts.
- Configured `TENANT_BASE_DOMAIN` enables hostname subdomain validation for authenticated users; school/cluster scope is checked before request handling.
- Added monitoring and cross-school comparison screens plus deployment-aware platform APIs.

Validation:

- `cd ExpressJS; node --test test/platform-hardening.test.js` -> **2/2**.
- `cd ReactJS; npm run build` -> passed (existing large chunk warning remains).
