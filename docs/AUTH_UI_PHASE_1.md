# Authentication UI — Phase 1

## Scope and plan

The existing project uses standalone Vite entries rather than a router. Phase 1 therefore adds `client/auth.html` without changing the application or expense-tracker entry points. The page reuses the existing design tokens and financial-workspace visual language, adds accessible local form validation, and leaves every authentication action disconnected.

## Files created

- `client/auth.html`
- `client/src/authPreview.jsx`
- `client/src/components/auth/AuthPage.jsx`
- `client/src/components/auth/auth.css`
- `docs/AUTH_UI_PHASE_1.md`

## Files modified

- `client/vite.config.js` — registers the existing main and expense previews plus the new auth preview for production builds.

## UI components and route

- `AuthPage` contains in-page Sign In / Sign Up navigation, accessible email and password fields, visibility controls, local validation, display name and password confirmation for Sign Up, Google UI, and non-authenticating notices.
- `auth.html` is a standalone Vite preview route. It is intentionally not a protected application route.

## Design and accessibility

- The UI uses the existing luminous canvas, black primary action, muted borders, system typography, and dark Spendwise rail language.
- It uses real labels, keyboard-operable buttons, visible focus, linked field errors, `role="alert"` validation feedback, and `role="status"` non-authentication notices.
- Remember Me is omitted because its session behavior is not yet defined.

## Verification

- `npm run build` in `client/` passed on 2026-10-23. The output includes `auth.html`, `expense.html`, and `index.html`, confirming the existing expense preview remains included.
- `git diff --check` passed.
- `npm test` ran 183 tests: 174 passed and 9 failed. The failures are existing backend/integration issues (unavailable fetch targets and guardrail expectations); the project has no client authentication test harness and no auth UI code participates in those tests.
- No browser screenshot was captured in this environment. The responsive breakpoints are implemented at 820px and 420px; manual browser checks remain appropriate before release.

## Limits and Phase 2 preparation

- No request is made to Supabase, Google, the server, or the database. Successful validation only displays a notice stating that nothing was sent or stored.
- Phase 2 must replace placeholders with Supabase password sign-in/sign-up, OAuth redirect/error handling, password reset, session state, protected-route policy, and agreed terms/privacy destinations.
