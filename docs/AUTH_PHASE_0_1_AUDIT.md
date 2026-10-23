# Spendwise Authentication — Phase 0 and 1 audit

## Active application map

```text
/auth.html (Phase 1 UI, no network auth)
       │
       └─ planned Supabase browser client ──► Supabase Auth

/expense.html ─► ExpenseTrackerApp ─► expenseApi ─► /api/transactions
                                                        │
                                                 Express expense routes
                                                        │
                                      current: shared local JSON store
                                      planned: user-scoped Supabase + RLS

/ (legacy chatbot/admin UI) ─────────────────────────► legacy API routes
```

## Findings

- The repository is a Vite multi-page application, not a React Router application. `expense.html` is the active Spendwise preview; `index.html` is legacy chatbot/admin UI.
- The Phase 1 authentication preview is separate at `auth.html`; it has no Supabase package, session state, network calls, or route gate.
- Expense CRUD is currently public and persists to `server/data/expense-transactions.json`. This file is absent until the first write, so local state is empty; it is not the remote `public.expense_transactions` table described in the request.
- There are no local Supabase migrations, RLS policies, expense repositories, or `user_id` references. Remote table emptiness and RLS cannot be verified safely from local files.
- The current `authenticate` middleware accepts any non-empty Bearer string. Neither expense nor legacy admin routes use it. It is not real protection.
- The configured server Supabase client uses the server secret/service credential and is used for analytics. It must remain server-only and must not be used as the authorization basis for normal user expense requests.
- “Receipt upload” is currently metadata validation and draft generation; it neither stores bytes nor runs AI extraction. It must gain the same authenticated ownership boundary when integrations become real.

## Dependency map

| Area | Current | Required contract |
| --- | --- | --- |
| Frontend auth | UI-only `AuthPage` | Supabase browser SDK and session provider |
| API client | Raw `fetch`, no Authorization | Current access-token attachment and `401` handling |
| Backend identity | Unverified placeholder token | Async trusted Supabase verification |
| Expenses | Shared JSON, no owner | Supabase `user_id` + RLS + owner predicates |
| Roles | No trusted source | Verified immutable `app_metadata.role` |
| Admin APIs | Public legacy routes | Verified admin-only middleware |

## Approval boundary

The proposed architecture is in [ADR 0001](./adr/0001-spendwise-authentication-architecture.md). The next phase changes public expense API behavior and persistence, and requires a Supabase SQL migration. No remote migration, database change, deployment, or API-contract implementation has been performed.
