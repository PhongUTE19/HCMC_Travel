# Live Gemini Receipt Evaluation

Generated: 2026-10-24T14:08:25.877Z

**Corpus limitation:** all 20 images are local, text-layout **synthetic fixtures**. They are not real receipts, photos, scans, or a claim of real-world OCR accuracy. The runner invokes the configured Gemini model (gemini-3.5-flash-lite) directly, without Supabase or HTTP/database writes. Fixture file SHA-256 values are frozen in [live-results.json](./live-results.json).

## Before/after prompt comparison

| Prompt | Passed | Pass rate | Mean latency (ms) | Calls with token metadata |
| --- | --- | --- | --- | --- |
| receipt-v1 | 1/1 | 100% | 5616 | 0/1 |
| receipt-v3 | 1/1 | 100% | 6520 | 0/1 |

| Prompt | Group | Passed | Pass rate |
| --- | --- | --- | --- |
| receipt-v1 | normal | 0/0 | NaN% |
| receipt-v1 | edge | 0/0 | NaN% |
| receipt-v1 | refusal | 1/1 | 100% |
| receipt-v3 | normal | 0/0 | NaN% |
| receipt-v3 | edge | 0/0 | NaN% |
| receipt-v3 | refusal | 1/1 | 100% |

Prompt hashes are captured in [live-results.json](./live-results.json) independently of provider analytics. This is necessary because the provider's analytics label is currently based on the process default prompt version rather than the per-call prompt passed by this evaluator.

## Per-case results

| Prompt | Fixture | Group | Expected | Actual | Result | Latency (ms) | Total tokens |
| --- | --- | --- | --- | --- | --- | --- | --- |
| receipt-v1 | 18-code-snippet | refusal | reject | reject | PASS | 5616 | n/a |
| receipt-v3 | 18-code-snippet | refusal | reject | reject | PASS | 6520 | n/a |

## Interpretation

A normal/edge fixture passes only if Gemini accepts it and returns the expected document/type, merchant, total, currency, category, item count, and required date/null fields. A refusal fixture passes only with a safe `NOT_A_RECEIPT` or `PROMPT_INJECTION_REJECTED` code; generic provider errors fail. Structured outcomes and safe errors are saved in `live-results.json`.

Re-run: `node evals/receipts/generate-live-fixtures.js` then `node evals/receipts/run-live-gemini.js`.
