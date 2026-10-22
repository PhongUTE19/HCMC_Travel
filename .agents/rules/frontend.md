---
trigger: glob
globs: "client/**"
description: Frontend rules for React components, styling, state, validation, and shared UI behavior.
---

# Frontend Rules

- Inspect the actual client dependencies and conventions before choosing a library or styling approach. Do not assume a framework is installed.
- Avoid inline styles (`style={{...}}`). Put styling in the existing CSS structure; use classes or CSS variables for dynamic states when practical.
- Reuse shared card, panel, table, cell, button, badge, label, title, and pagination styles. Add page-specific CSS only for real visual or behavioral differences. Avoid broad global changes that cause regressions.
- Keep functional icons accessible. Do not add emojis, emoticons, or decorative icon glyphs to application-owned user-facing text.
- Extract repeated JSX into shared components only when structure or behavior is genuinely shared. Extract repeated React state/effects into custom hooks; use ordinary functions for pure JavaScript calculations.
- Keep state local when only one small component uses it. Lift shared state to the common parent or use the existing state-management approach when multiple components need it.
- Keep API requests in the established client API modules, not embedded directly in UI components. Keep request/response contracts consistent.
- Centralize reusable input validation and messages where useful. Use native HTML constraints appropriately, and do not remove or weaken server-side validation.
- Reuse search, sorting, filtering, and pagination logic/UI where appropriate. Keep page-specific rules in the feature and use server-side querying for larger datasets.
- Make loading, empty, error, online, and offline states explicit. Prevent repeated requests and duplicate toasts during a single offline incident; provide a clear retry path.
- Preserve existing appearance, responsive behavior, keyboard accessibility, and valid user workflows unless the task explicitly changes them.
