# Security & Admin Users Module (No DB Migration)

## Scope implemented

This implementation was added on top of the existing DB structure from `DataBase/supabase-dump` without creating migrations or altering schema/constraints/RLS/policies.

### Core backend

- Added server-only Supabase service-role client:
  - `src/lib/supabase/admin.ts`
  - Added env loader in `src/lib/supabase/config.ts` for `SUPABASE_SERVICE_ROLE_KEY`
- Added security core module:
  - `src/server/security/index.ts`
  - `src/server/security/session.ts`
  - `src/server/security/admin.ts`
- Added Argon2id password history hashing/verification:
  - dependency: `argon2`

### Auth/account endpoints

Implemented:

- `POST /api/auth/login` (governed login)
- `POST /api/auth/request-password-reset`
- `POST /api/auth/complete-password-reset`
- `GET /api/account/security`
- `POST /api/account/change-password`
- `POST /api/account/password-warning/acknowledge`

Behavior highlights:

- Email normalization on login.
- Internal profile verification before allowing login success.
- Login failed counter increment + lock by policy threshold.
- Locked account response and generic invalid credentials response.
- Password expiration and warning decision after successful login.
- Service role account blocked from normal dashboard usage.
- Password update flow applies:
  - active policy complexity validation
  - recent password reuse check via Argon2id verify
  - Supabase Auth password update
  - custom Argon2id hash insert in `app_user_password_history`
  - history pruning via existing DB function `prune_user_password_history`
  - profile security field refresh
  - security audit events

### Admin users endpoints

Implemented:

- `GET /api/admin/users`
- `POST /api/admin/users`
- `GET /api/admin/users/:userId`
- `PATCH /api/admin/users/:userId`
- `POST /api/admin/users/:userId/lock`
- `POST /api/admin/users/:userId/unlock`
- `POST /api/admin/users/:userId/deactivate`
- `POST /api/admin/users/:userId/activate`
- `POST /api/admin/users/:userId/force-password-reset`
- `GET /api/admin/users/:userId/security-events`

Enforced rules:

- No creation with `role = agent`.
- Admin cannot lock/deactivate/degrade self.
- Prevent actions that would leave system without at least one active admin.
- Unlock always enforces reset flow.
- Deactivate sets inactive + lock reason deactivated.

### Admin password policy endpoints

Implemented:

- `GET /api/admin/security/password-policy`
- `PATCH /api/admin/security/password-policy`
- `POST /api/admin/security/password-policy/reset-defaults`
- `POST /api/admin/security/password-policy/force-reset-users`

Validation enforced in API layer:

- `minimum_length >= 8`
- uppercase/lowercase/numbers/symbols minimums
- history check and keep bounds
- expiration bounds
- warning <= expiration
- max failed attempts 3..5

`hash_algorithm` is read-only in UI/API update flow.

### Middleware and access governance

Updated `src/middleware.ts`:

- Protects `/admin` and `/account` routes.
- Requires active, non-locked profile.
- Restricts service accounts from dashboard/private pages.
- Enforces password-change-only mode when reset required/expired.
- Restricts `/admin/*` pages to admin role.

### UI pages and flows

Added:

- `/account/security/password-warning`
- `/account/security/change-password`
- `/admin/users`
- `/admin/security/password-policy`

Updated:

- `src/app/auth/login/login-form.tsx` for governed login redirect handling and reset request action.
- `src/components/layout/app-shell.tsx` for security-route layout mode.
- `src/config/navigation.ts` with admin entries.

## Manual QA checklist

1. Admin can open `/admin/users`.
2. Non-admin user gets denied on `/admin/users`.
3. Service role cannot open regular dashboard pages.
4. Admin can create `user` role account.
5. New account receives setup/reset flow.
6. Failed login increments failed attempts.
7. Reaching configured max failed attempts locks account.
8. Locked user can only be unlocked via admin reset flow.
9. New password is validated against active policy.
10. Reusing recent password is rejected.
11. Password history is pruned to `password_history_keep_count`.
12. Expired password only allows limited session routes.
13. Expiring password shows warning page before dashboard.
14. Continuing from warning logs acknowledgment event.
15. Password change refreshes expiration dates and lock counters.
16. Admin cannot deactivate/lock/degrade self.
17. Last active admin cannot be deactivated/locked/degraded.
18. Password policy can be edited from admin UI.
19. Policy changes affect next password updates/resets.
20. Force-reset-users excludes service accounts.

## Notes

- Existing unrelated lint warning remains at:
  - `src/components/orders/payment-receipts-table.tsx:347`

## Security hardening update (2026-04-25)

### HTTP headers

- Security headers are defined in `next.config.ts` under `headers()` and applied to `/:path*`:
  - `Content-Security-Policy`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Frame-Options: DENY`
  - `Permissions-Policy`
- Current CSP keeps:
  - `frame-ancestors 'none'`
  - `base-uri 'self'`
  - `form-action 'self'`
- Additional domains are only enabled for existing runtime dependencies:
  - Supabase project origin (images + `connect-src`)
  - Cloudflare Turnstile (`script-src`, `connect-src`, `frame-src`)

### Login transport hardening

- `POST /api/auth/login` is the only login action.
- JSON body is required via `Content-Type: application/json`.
- Any sensitive credential-like query param in `/api/auth/login` now returns:
  - `400`
  - `code: INVALID_AUTH_REQUEST`
  - `message: Solicitud de autenticacion invalida.`
- No authentication is attempted when this rule is triggered.

### CSRF and method hardening

- Added shared request guards:
  - `src/server/security/request-guards.ts`
  - `assertTrustedOrigin(request)` for cookie-based mutable actions.
  - `assertJsonRequest(request)` for JSON endpoints.
- Applied to mutable admin/account/auth endpoints that rely on session cookies:
  - `/api/admin/**` mutating routes (`POST`, `PATCH`)
  - `/api/account/change-password`
  - `/api/account/password-warning/acknowledge`
  - `/api/auth/complete-password-reset`
- Read-only routes remain `GET`; mutable admin actions remain `POST`/`PATCH` only.

### Sensitive log redaction

- Expanded sensitive key redaction in `src/lib/security/redaction.ts` to include:
  - `api_key`, `secret`, `bearer`, `cookie`, `set-cookie`, and extra password variants.
- Console redaction wrapping remains active through:
  - `src/lib/security/install-log-redaction.ts`

### XSS review summary

- No `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, or `new Function` usage was found in `src/`.
- Dynamic search links already use protocol allow-listing with:
  - `src/lib/security/url.ts` (`toSafeLinkHref`)
