---
name: verify-changes
description: Verify a code change before reporting it complete. Use after implementation, debugging, or refactoring to run appropriate checks and inspect the final diff.
---

# Verify Changes

1. Read package scripts and project instructions to discover the correct verification commands; do not invent commands.
2. Inspect `git status` and `git diff` to understand all modified, added, deleted, and untracked files. Preserve unrelated user changes.
3. Run the relevant focused tests first, followed by broader tests, lint/type checks, and production builds that are available and appropriate.
4. Run import and circular-dependency checks if the project provides them. Run `git diff --check`.
5. For UI changes, verify affected screens and responsive/empty/loading/error states where practical. For API changes, verify contracts and failure paths. For database changes, verify migration and access-control assumptions without touching production data.
6. Report each command with its actual result. Clearly identify tests not run, external services not available, and any remaining risks.
7. Review the diff for accidental unrelated edits. Do not commit or push unless explicitly requested.
