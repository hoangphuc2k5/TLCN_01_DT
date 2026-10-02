# Express layered architecture and GitHub delivery implementation plan

**Goal:** Implement the approved layered refactor and CI/GHCR delivery without changing application behavior.
**Spec:** ../specs/2026-09-30-express-layered-design.md
**Execution:** Inline, following the user's instruction to proceed. Work in the existing Develop workspace; retain reviewable uncommitted changes.

## Constraints

Preserve CommonJS, all routes, response formats, authorization and persistence semantics. Constructors receive repositories/services; composition happens in config/container.js. Use `layer/role/file` with lowercase role directories. No production database or registry mutations during local validation.

## Tasks

- [ ] 1. Restore native dependencies and establish backend/frontend baseline. Commands: npm test in each app; npm run build in ReactJS. Record environmental failures separately.
- [ ] 2. Add architecture/DTO/DI tests, connection/logger singleton, and repository infrastructure. Verify unit tests and start app with an isolated fixture.
- [ ] 3. Move feature files and update all consumers (including scripts/tests). Extract database access to repository classes and constructor-inject dependencies. Migrate feature groups in small batches with tests and application smoke checks.
- [x] 4. Organize controllers/routes/DTOs and tests by role ownership, keep shared modules in common, and centralize error propagation. Run full backend tests and HTTP smoke.
- [ ] 5. Add API/web Dockerfiles and Nginx configuration. Extend existing CI with image builds and publish on successful main checks, commit tags and GHCR permissions. Document runtime configuration and workers.
- [ ] 6. Run frontend tests/build, backend suite, E2E, workflow validation and final review. Report unavailable Docker/GitHub execution explicitly.

## Review focus

Preserve document transforms and serialized response fields; query sessions/transactions; files and fonts resolved relative to moved modules; routing order and streaming transport; independent singleton composition and cyclic dependencies.

## Progress

- Baseline: dependencies installed with npm 12; native bcrypt script initially blocked. User instructed implementation after these requirements were disclosed. Approved exact bcrypt/mongodb-memory-server install scripts and rebuilding.
- Ruling: use the current non-main Develop workspace to keep IDE paths stable; no other product changes existed at start. No push/commit until verification.
