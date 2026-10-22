---
trigger: glob
globs: "server/**"
description: Backend rules for feature boundaries, validation, middleware, persistence, and error handling.
---

# Backend Rules

- Follow the repository's feature-first structure. Do not create a new layer or file for every function; each module must own a coherent responsibility.
- Keep routes/controllers focused on HTTP concerns, services on use-case orchestration, repositories on database access, and pure helpers on deterministic transformations.
- Standardize `res.locals.validated` access across controllers. Follow one consistent pattern based on the actual validation contract; avoid mixing inline property access, ad hoc helper functions, and inconsistent destructuring styles.
- Reuse shared infrastructure, including the configured Supabase client. Feature-specific queries belong in feature repositories; shared infrastructure must not depend on feature-specific code.
- Keep secrets and privileged database credentials server-side. Do not disable RLS or weaken access policies to make a feature work.
- Keep authentication and authorization middleware reusable, but never simulate an identity or claim a route is protected unless real authentication and authorization are integrated and verified.
- Keep not-found and error handling centralized and consistent. Do not expose stack traces, credentials, provider payloads, or internal prompts to clients.
- Configure CORS, security headers, and rate limiting according to actual deployment and endpoint risk. Reuse appropriate existing dependencies and avoid blanket settings that break legitimate requests.
- Keep persistence/analytics failures from breaking the primary chat, streaming, embedding, or RAG request when tracking is designed to be non-fatal.
- Preserve API contracts and database behavior during refactors. Make migrations explicit and never introduce destructive data changes without authorization.
