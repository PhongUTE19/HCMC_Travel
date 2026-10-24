# Live Gemini Receipt Evaluation

Generated: 2026-10-24T14:08:50.086Z

**Corpus limitation:** all 20 images are local, text-layout **synthetic fixtures**. They are not real receipts, photos, scans, or a claim of real-world OCR accuracy. The runner invokes the configured Gemini model (gemini-3.5-flash-lite) directly, without Supabase or HTTP/database writes. Fixture file SHA-256 values are frozen in [live-results.json](./live-results.json).

## Before/after prompt comparison

| Prompt | Passed | Pass rate | Mean latency (ms) | Calls with token metadata |
| --- | --- | --- | --- | --- |
| receipt-v1 | 16/20 | 80% | 6963 | 13/20 |
| receipt-v3 | 17/20 | 85% | 4933 | 12/20 |

| Prompt | Group | Passed | Pass rate |
| --- | --- | --- | --- |
| receipt-v1 | normal | 7/8 | 87.5% |
| receipt-v1 | edge | 3/4 | 75% |
| receipt-v1 | refusal | 6/8 | 75% |
| receipt-v3 | normal | 7/8 | 87.5% |
| receipt-v3 | edge | 3/4 | 75% |
| receipt-v3 | refusal | 7/8 | 87.5% |

Prompt hashes are captured in [live-results.json](./live-results.json) independently of provider analytics. This is necessary because the provider's analytics label is currently based on the process default prompt version rather than the per-call prompt passed by this evaluator.

## Important caveats

- VND values are normalized after extraction by the application schema. This can mask a prompt-only difference for Vietnamese thousands separators, so this compares the full extraction pipeline rather than prompt wording alone.
- Item quality is scored structurally by expected item count, not exact OCR wording for each item.
- These synthetic layouts do not establish real-world receipt-photo OCR accuracy. A representative photo/scan corpus is still required for that claim.
- Some calls lack token metadata, and the configured analytics table is not part of this evaluation; both conditions are retained as evidence rather than treated as successful telemetry.

## Per-case results

| Prompt | Fixture | Group | Expected | Actual | Result | Latency (ms) | Total tokens |
| --- | --- | --- | --- | --- | --- | --- | --- |
| receipt-v1 | 01-cafe-usd | normal | accept | accept | PASS | 6544 | 1248 |
| receipt-v3 | 01-cafe-usd | normal | accept | accept | PASS | 5700 | 1404 |
| receipt-v1 | 02-vinmart-vnd | normal | accept | accept | PASS | 6253 | 1262 |
| receipt-v3 | 02-vinmart-vnd | normal | accept | accept | PASS | 5706 | 1422 |
| receipt-v1 | 03-grocery-usd | normal | accept | accept | PASS | 6138 | 1255 |
| receipt-v3 | 03-grocery-usd | normal | accept | accept | PASS | 5218 | 1411 |
| receipt-v1 | 05-book-vnd | normal | accept | accept | PASS | 5400 | 1238 |
| receipt-v3 | 05-book-vnd | normal | accept | accept | PASS | 5326 | 1394 |
| receipt-v1 | 07-cinema-usd | normal | accept | accept | PASS | 18541 | 1231 |
| receipt-v3 | 07-cinema-usd | normal | accept | accept | PASS | 4788 | 1387 |
| receipt-v1 | 08-stationery-vnd | normal | accept | accept | FAIL | 6104 | 1242 |
| receipt-v3 | 08-stationery-vnd | normal | accept | accept | FAIL | 4959 | 1401 |
| receipt-v1 | 09-small-decimal | edge | accept | accept | PASS | 9458 | 1232 |
| receipt-v3 | 09-small-decimal | edge | accept | accept | FAIL | 8728 | 1386 |
| receipt-v1 | 10-no-date | edge | accept | accept | PASS | 6093 | 1223 |
| receipt-v3 | 10-no-date | edge | accept | accept | PASS | 5173 | 1379 |
| receipt-v1 | 12-invoice | edge | accept | accept | PASS | 9673 | 1239 |
| receipt-v3 | 12-invoice | edge | accept | accept | PASS | 8508 | 1395 |
| receipt-v1 | 13-poster | refusal | reject | reject | FAIL | 7873 | n/a |
| receipt-v3 | 13-poster | refusal | reject | reject | PASS | 2871 | n/a |
| receipt-v1 | 19-id-card | refusal | reject | reject | PASS | 2116 | n/a |
| receipt-v3 | 19-id-card | refusal | reject | reject | PASS | 2035 | n/a |
| receipt-v1 | 14-injection-only | refusal | reject | reject | PASS | 3894 | n/a |
| receipt-v3 | 14-injection-only | refusal | reject | reject | PASS | 1648 | n/a |
| receipt-v1 | 15-empty-page | refusal | reject | reject | PASS | 4005 | n/a |
| receipt-v3 | 15-empty-page | refusal | reject | reject | PASS | 1530 | n/a |
| receipt-v1 | 16-menu | refusal | reject | accept | FAIL | 2127 | 1264 |
| receipt-v3 | 16-menu | refusal | reject | reject | PASS | 1915 | n/a |
| receipt-v1 | 11-no-items | edge | accept | accept | FAIL | 10894 | 1232 |
| receipt-v3 | 11-no-items | edge | accept | accept | PASS | 3253 | 1359 |
| receipt-v1 | 17-social-post | refusal | reject | reject | PASS | 6129 | n/a |
| receipt-v3 | 17-social-post | refusal | reject | reject | FAIL | 6376 | n/a |
| receipt-v1 | 20-unreadable | refusal | reject | reject | PASS | 8363 | n/a |
| receipt-v3 | 20-unreadable | refusal | reject | reject | PASS | 7129 | n/a |
| receipt-v1 | 06-pharmacy-usd | normal | accept | accept | PASS | 6265 | 1232 |
| receipt-v3 | 06-pharmacy-usd | normal | accept | accept | PASS | 5365 | 1388 |
| receipt-v1 | 18-code-snippet | refusal | reject | reject | PASS | 5616 | n/a |
| receipt-v3 | 18-code-snippet | refusal | reject | reject | PASS | 6520 | n/a |
| receipt-v1 | 04-city-taxi | normal | accept | accept | PASS | 7765 | 1233 |
| receipt-v3 | 04-city-taxi | normal | accept | accept | PASS | 5921 | 1387 |

## Interpretation

A normal/edge fixture passes only if Gemini accepts it and returns the expected document/type, merchant, total, currency, category, item count, and required date/null fields. A refusal fixture passes only with a safe `NOT_A_RECEIPT` or `PROMPT_INJECTION_REJECTED` code; generic provider errors fail. Structured outcomes and safe errors are saved in `live-results.json`.

Re-run: `node evals/receipts/generate-live-fixtures.js` then `node evals/receipts/run-live-gemini.js`.
