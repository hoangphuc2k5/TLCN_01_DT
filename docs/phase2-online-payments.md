# Phase 2.6 - Thanh toan hoc phi online (8.4)

Branch: `feat/phase2-online-payments`.

- Added `OnlinePayment` intent model with provider/order idempotency, expiry and webhook metadata.
- Added gateway adapter registry for `MOCK`, signed VNPay redirect and configurable MoMo redirect. Production secrets are read from environment variables; no provider credentials are committed.
- Added HMAC webhook verification, amount validation and an atomic MongoDB transaction that marks the intent paid, updates the invoice and creates one `Payment` with method `ONLINE`.
- Repeated callbacks and repeated client request ids return the existing result without double charging the invoice.
- Added student/parent permission `PAY_ONLINE`, API routes and a payment action in the fees page.

Validation: `node --test test/online-payment.test.js` -> **2/2**; `npm run build` -> passed. The test covers student and parent scope, invalid signatures, webhook replay and exactly-once invoice/payment updates.

MOCK is intended for local/E2E use. Configure `VNPAY_*` or `MOMO_*` variables and verify provider credentials/callback URLs in a staging environment before enabling a real gateway.
