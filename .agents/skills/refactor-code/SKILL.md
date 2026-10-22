---
name: refactor-code
description: Refactor existing code to improve clarity, reduce duplication, and clarify responsibilities without unnecessary abstractions. Use for cleanup, architecture, naming, or maintainability tasks.
---

# Refactor Code

1. Inspect Git status, relevant files, callers/imports, tests, and architecture documentation. Treat uncommitted changes as user-owned.
2. Trace the actual execution flow before changing boundaries. Identify concrete duplication, coupling, dead code, or complexity with evidence.
3. Decide whether to merge or split code based on cohesion, reuse, and responsibility—not file length or hypothetical future use.
4. Make the smallest coherent refactor. Preserve behavior and API contracts unless a behavior change was explicitly requested.
5. Update imports, tests, and docs where necessary. Remove obsolete code only after searching for callers.
6. Run relevant tests, build/lint/import/cycle checks available in the repository, and `git diff --check`.
7. Review the final diff for regressions, duplicate abstractions, and unrelated changes.
8. Report the reason for key decisions, files changed, exact checks and results, unresolved concerns, and final Git status. Do not commit or push unless asked.
