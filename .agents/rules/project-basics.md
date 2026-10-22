---
trigger: always_on
description: Core coding and collaboration rules for the Student Handbook Assistant.
---

# Project Basics

- Inspect the current repository, package scripts, architecture docs, and Git status before editing. Do not rely on old reports as proof of current code.
- Preserve existing user changes. Never reset, discard, or revert unrelated work. Do not commit or push unless explicitly requested.
- Apply DRY and KISS: remove real duplication, but avoid abstractions that only add indirection or support hypothetical future needs.
- Follow the existing feature-first architecture and naming conventions. Use camelCase JavaScript filenames where compatible with the surrounding code (for example, `chatService.js`).
- Keep responsibilities clear: UI renders; hooks manage React state/effects; pure helpers handle pure calculations; API modules handle HTTP calls; controllers handle HTTP; services coordinate use cases; repositories handle persistence.
- Reuse existing components, utilities, CSS, validation, and infrastructure when they already fit. Do not add a competing abstraction or dependency without a concrete reason.
- Comments should explain intent, responsibility, non-obvious decisions, and important flow boundaries—not restate each line of code.
- Update relevant tests and documentation when behavior, contracts, or architecture changes.
- Report only checks that were actually run, with their observed results. State remaining risks and skipped checks clearly.
