# ADR 0001: Spendwise authentication and expense ownership

**Status:** Conditionally approved for local implementation; remote migration and deployment require separate approval

## Context

The active Spendwise preview began with unauthenticated Express endpoints and a shared local JSON store. Local implementation now supplies Supabase Auth client integration and a prepared ownership migration, but no remote migration or dashboard configuration has been applied. The legacy administration surface remains unchanged.

## Decision

1. The client will use the Supabase browser client with only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; it will never receive a service-role key.
2. The client will store session state through Supabase Auth, allow its SDK to refresh sessions, and attach the current access token to protected expense/receipt requests.
3. The backend will authenticate every protected request asynchronously using a trusted Supabase token-verification mechanism. It will reject malformed, expired, wrong-issuer/audience, or unverifiable tokens with `401` and never trust decoded claims alone.
4. A verified request identity has `{ id, email, role }`; `role` derives only from verified `app_metadata.role`, constrained to `user` or `admin`, with a missing role defaulting to `user`. Client state and `user_metadata` are not authorization inputs. No database trigger writes `auth.users`; only a trusted server-side Supabase Admin API workflow may assign `admin`.
5. The database will hold expenses in the existing `public.expense_transactions` table with `user_id uuid not null references auth.users(id) on delete cascade`. The server assigns the user ID; request schemas do not accept it. Existing field names, including `transaction_date`, remain unchanged.
6. RLS will be enabled with owner-only `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies using `auth.uid() = user_id`. Indexes will start with `(user_id, transaction_date desc)`.
7. Expense routes and receipt-draft routes require a verified identity. Reads and mutations must additionally filter by the verified user ID, even if a server-only privileged client is ever used. Non-owned records return `404`.
8. Legacy `/api/admin/*` routes require verified `admin` role. This protects the existing legacy administration surface but does not turn it into an active Spendwise product requirement.
9. The existing service-role Supabase client remains isolated to server-only analytics. User expense CRUD must use a per-request user-scoped client so RLS participates.
10. The Vite app remains multi-page: `/auth.html` handles sign-in/sign-up, `/auth-callback.html` completes OAuth and email-confirmation returns, `/reset-password.html` updates a recovered password, and `/expense.html` is protected at its frontend boundary. These HTML pages must be declared as Vite Rollup inputs, so their production URLs exist. The legacy app entry remains untouched.

## API contract

Protected endpoints require `Authorization: Bearer <Supabase access token>`. Existing expense response envelopes and transaction field names are retained:

| Endpoint group | Authentication | Authorization |
| --- | --- | --- |
| `/api/transactions`, `/api/receipts/upload` | Required | Current user owns the resource |
| `/api/admin/*` | **Unchanged today (public legacy route)** | Target state is verified `app_metadata.role === "admin"`; mounting this is pending explicit approval because it changes legacy behavior. |

Error responses retain `{ "error": "message" }`: `400` validation, `401` missing/invalid token, `403` missing role, `404` absent/non-owned transaction, and sanitized `500` errors.

## Migration plan

Add a versioned SQL migration that alters the existing `public.expense_transactions` table, adds `user_id`, indexes `(user_id, transaction_date desc)`, enables RLS, and creates ownership policies. It must be safe for an empty table and make its data precondition explicit. The table is reported as empty by the request, but its actual remote state cannot be verified from this repository. The migration must be reviewed and approved before it is applied remotely.

## Redirect and session flow

The Supabase dashboard must allow the deployed equivalents of `http://localhost:5173/auth-callback.html` and `http://localhost:5173/reset-password.html` (and their production origins). Password sign-up uses email confirmation; the callback page exchanges/reads the returned session and redirects only to a validated local `next` expense path. Google uses `signInWithOAuth({ options: { redirectTo } })` with the same callback URL. Password recovery uses `resetPasswordForEmail` with `redirectTo` set to the reset page. The browser SDK restores and refreshes sessions; the frontend clears its local state on sign-out or a confirmed expired session.

## User-scoped Supabase access

For each verified expense request, the backend constructs a short-lived Supabase client using the public anon key and `Authorization: Bearer <verified access token>`. Queries run as that user and therefore participate in `auth.uid()` RLS policies. The backend also adds explicit `user_id = req.user.id` predicates where applicable. The existing service-role singleton is restricted to analytics and must never perform ordinary user expense CRUD.

## Receipt compatibility and legacy impact

`POST /api/receipts/upload` currently validates filename, MIME type, and size then returns a receipt draft; it does not upload bytes or invoke AI extraction. Authentication will protect that existing draft operation without changing its request or response shape.

Protecting `/api/admin/*` would change access to legacy chatbot/admin functionality. Local code may prepare the middleware and tests, but mounting that protection remains pending explicit approval so the legacy surface is not silently changed.

## Consequences

- Existing unauthenticated expense clients will receive `401` after rollout unless the frontend token work lands atomically.
- The local JSON expense implementation must be replaced or explicitly retained only for isolated local development; it cannot provide production per-user guarantees.
- Deployment needs distinct public frontend variables and protected server credentials, plus approved frontend origins for CORS.

## Security test matrix

Test valid signup/confirmation/sign-in/OAuth/sign-out/session restoration/reset; invalid and expired tokens; unauthenticated requests; user A/B CRUD isolation; forbidden self-assigned roles; admin permissions; and authenticated receipt-draft flow. Use mocked provider verification locally plus a separate approved Supabase integration environment for RLS verification.
