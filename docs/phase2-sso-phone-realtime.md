# Phase 2.13 - SSO doanh nghiep, dang nhap so dien thoai va thong bao realtime (11.1-11.2)

Branch: `feat/phase2-sso-phone-realtime`.

- Added signed enterprise SSO assertion adapter (`POST /auth/sso`). Assertions are HMAC verified with issuer/audience/expiry checks and matched to a pre-provisioned user by SSO subject or email.
- Added phone OTP login (`POST /auth/phone/request`, `POST /auth/phone/verify`) with five-attempt limit, five-minute expiry, one-time consumption and optional SMS gateway adapter. Development/test responses expose the OTP only in non-production environments.
- Added configurable SMS, Zalo and push delivery adapters. Missing gateways are recorded as `SKIPPED`; configured gateways use a short timeout and bearer token without blocking the in-app notification.
- Added authenticated Server-Sent Events stream at `GET /notifications/stream`; notification model hooks publish new records immediately to the requesting user. `POST /notifications/:id/deliver` lets a recipient request channel delivery.
- Added frontend API/thunks for phone login and a phone OTP option on the login page.

Configuration is optional and documented in `ExpressJS/.env.example`: `ENTERPRISE_SSO_*`, `PHONE_LOGIN_ENABLED`, `SMS_*`, `ZALO_*`, `PUSH_*`.

Validation:

- `cd ExpressJS; node --test test/sso-phone-realtime.test.js` -> **2/2**.
- `cd ReactJS; npm run build` -> passed (existing large chunk warning remains).
