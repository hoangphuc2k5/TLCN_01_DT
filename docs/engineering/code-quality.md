# Engineering conventions

These conventions keep the API and browser app maintainable without changing the current stack.

## Backend (Express and MongoDB)

- Routes declare HTTP paths and middleware. Controllers translate HTTP input/output and call one service operation.
- DTOs validate and normalize request data. Services own business rules and transaction boundaries. Repositories own database queries.
- Authentication, tenant scope, and permission checks stay on the server. Client-side route guards only shape the interface.
- Return API responses through the shared `{ EC, EM, data }` helpers. Let the shared error middleware map expected errors to status codes.
- Keep list endpoints bounded and validate identifier, filter, sort, and writable fields before database access.
- Use the existing dependency container for cross-layer dependencies; avoid new global mutable state.

## Frontend (React and Ant Design)

- Keep a feature's page, feature-only components, and API operations together. Put genuinely reusable components in `src/components`.
- Keep shared API declarations in `src/services/api/` by business domain. `src/services/api.service.js` remains a compatibility barrel; new code should import from the relevant domain module.
- Keep route registration and route metadata aligned. Load feature pages lazily as the router currently does.
- Keep authentication state in the existing Redux slice; derive other view state locally unless multiple features need it.
- Use the shared HTTP client for API requests. Keep response normalization and auth handling out of page components.
- Give every page a semantic page heading. Use the shared page shell and UI tokens for common layout and visual decisions.
- Effects synchronize with external data only. Include dependencies or explain an intentional mount-only subscription.

## Verification and quality gates

- Backend: `npm run lint`, `npm test`, and the CI coverage job `npm run test:coverage`.
- Frontend: `npm run lint`, `npm test`, `npm run build`, and `npm run test:e2e` for user-visible changes.
- Do not weaken authorization tests to make UI tests pass. Test role boundaries at the API as well as in the UI.
- CI lint rejects warnings in both backend and frontend. Keep the rule sets clean; do not raise warning limits to accommodate new warnings.
- Keep access tokens and other credentials out of frontend-readable storage. Any auth-storage change must include the browser, API, CORS, and CSRF contract tests.
