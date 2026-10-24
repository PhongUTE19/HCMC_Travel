# Engineering the AI cho Receipt Scanner

## Trạng thái tổng quan

| Hạng mục | Trạng thái | Ghi chú |
| --- | --- | --- |
| Multimodal image → JSON | Đã implement, có live probe synthetic | Gemini nhận bytes ảnh base64. |
| Prompt versioning | Đã implement | v1/v2/v3 là file Git-tracked. |
| JSON/Zod + guardrails | Đã implement và unit test | Không thay thế review của người dùng. |
| 20-case deterministic evaluation | Đã chạy: 20/20 | Không phải accuracy benchmark live. |
| 5 live synthetic probes | Có evidence | Không phải 20 hóa đơn thực tế. |
| Persistent telemetry/cost | Một phần | `ai_usage_analytics` chưa được migration receipt tạo; cost chưa tính. |

## 1. Model choice

Provider là `@google/genai`; `extractReceiptImage()` trong `server/src/shared/integrations/ai/providers/geminiProvider.js` dùng `ai.models.generateContent()` với một text part và một image `inlineData`. Đây là khả năng multimodal cần thiết để đọc ảnh hóa đơn.

Model runtime thực tế là `config.geminiModel`, lấy từ `GEMINI_MODEL` trong root `.env` (`server/src/config.js`). Repository cũng có `config.geminiReceiptModel`/`GEMINI_RECEIPT_MODEL`, nhưng hàm hiện tại **không dùng biến đó**. Vì vậy không được nói `GEMINI_RECEIPT_MODEL` đang điều khiển extraction cho đến khi code được sửa và test lại.

Lý do cấu hình Gemini hợp lý: SDK/provider có API nhận ảnh, hỗ trợ JSON MIME/schema, có token metadata khi provider trả về, và `temperature: 0` giúp output nhất quán hơn. Không có benchmark chất lượng/tốc độ/giá giữa các model trong repository; privacy/retention cụ thể cũng không được code chứng minh, nên phải kiểm tra điều khoản Google/Supabase trước deployment.

## 2. Prompt management

Prompt nằm tại `server/prompts/receipts/`:

| Version | Nội dung thay đổi chính |
| --- | --- |
| `receipt-v1.md` | Yêu cầu JSON và null khi không xác định. |
| `receipt-v2.md` | Nhấn mạnh ảnh là untrusted data, ngày/category chuẩn. |
| `receipt-v3.md` | Non-receipt = `unknown`, item schema, số VND `183.000 → 183000`. |

`server/src/features/expenses/receiptPrompt.js` dùng `RECEIPT_PROMPT_VERSION` (mặc định `receipt-v3`) và `getReceiptPrompt()` để đọc file sau khi whitelist regex `receipt-v<digit>`. Git lưu lịch sử file/prompt.

Quy trình version mới: tạo `receipt-v4.md`, review/commit nội dung, set `RECEIPT_PROMPT_VERSION=receipt-v4`, restart server, chạy unit/evaluation; rollback bằng cách đổi lại version cũ. Không sửa prompt text trực tiếp trong provider khi muốn có lịch sử rõ ràng.

## 3. Guardrails

| Rủi ro | Ví dụ | Code xử lý | Kết quả người dùng / test |
| --- | --- | --- | --- |
| Prompt injection | Ảnh có “IGNORE ALL PREVIOUS INSTRUCTIONS” | Prompt v2/v3 nói ảnh là dữ liệu không đáng tin; `enforceReceiptGuardrails()` ghép merchant/note/item names và gọi `detectPromptInjection()` | `PROMPT_INJECTION_REJECTED`, không tạo transaction. Unit: `tests/unit/receiptGuardrails.test.js`; live synthetic `receipt-with-injection.png` chỉ trích xuất dữ liệu mua hàng. |
| Ngoài phạm vi | Ảnh núi/non-receipt | Prompt yêu cầu `documentType: unknown`; guardrail ném `NOT_A_RECEIPT` | Thông báo “This image does not appear to be a receipt. No transaction was created.” Unit và live `non-receipt.png`. |
| Output sai/hỏng | Timeout, invalid JSON, empty output, schema sai, provider/network error | `executeWithRetry`, timeout 20.000 ms từ service, JSON mode, `validateStructuredOutput(... throwOnError)`, Zod strict schema; catch ghi failure telemetry và cleanup temp receipt | Request trả message an toàn; transaction không được tạo. Deterministic R11/R12 và service cleanup tests có evidence. |

`receiptUpload.middleware.js` là guardrail trước AI: MIME/magic bytes, 5 MB, Sharp decode, max 8.000 px, tối đa hai upload đồng thời và request timeout 30 giây.

## 4. Evaluation

Lệnh deterministic đã được dùng:

```powershell
npm.cmd --prefix server run eval:receipts
```

`evals/receipts/runner.js` đọc `evals/receipts/cases.json`. Evidence hiện có ghi **20/20** pass: R01–R08 là decoder/validation image; R09–R14 là guardrail/schema/locale; R15–R20 là lifecycle/RPC/Storage simulation in-memory. Vì không gọi Gemini hoặc Supabase thật cho mọi case, 20/20 **không phải** pass rate accuracy OCR/Gemini.

Live runner `evals/receipts/run_live_gemini.js` và fixtures sinh bởi `generate_live_fixtures.js` có năm ảnh synthetic. Evidence trong `06_IMPLEMENTATION_EVIDENCE.md` ghi:

| Fixture | Kết quả đã ghi nhận |
| --- | --- |
| `normal-receipt.png` | Accepted; total 55.000 và hai line item. Lần lặp đo 3.752 ms, 1.212 input, 145 output, 1.357 total tokens. |
| `non-receipt.png` | `NOT_A_RECEIPT`. |
| `injection-image.png` | `NOT_A_RECEIPT`. |
| `receipt-with-injection.png` | Accepted như receipt, không copy/follow instruction. |
| `unreadable-image.png` | `NOT_A_RECEIPT`. |

Đây là five live synthetic probes, không phải 20 ảnh thực tế. Repository không có before/after accuracy pass rate v1 so với v2/v3 trên cùng một tập ảnh thật; yêu cầu này **chưa đạt**.

## 5. Logging, latency và cost

`geminiProvider.extractReceiptImage()` gọi `recordUsage()` với feature `receipt_extraction`, operation, provider, model, outcome, attempts, prompt version + SHA-256 hash, `toolsExecuted: []`, duration và token counts khi Gemini trả `usageMetadata`.

`server/src/features/analytics/usageTracker.js` giữ buffer in-memory không durable; `analytics.writer.js` cố batch insert vào `ai_usage_analytics`. `analytics.utils.js` tính tổng tokens, success/failure/refusal rate, average latency `sum(durationMs)/count`, P50/P95. Các cấu trúc này có thể bao gồm receipt vì field feature là `receipt_extraction`.

Tuy nhiên:

- Receipt migration `202610230002_secure_receipts.sql` **không tạo** bảng `ai_usage_analytics`.
- Live log/evidence đã ghi Supabase writer không insert được vì table absent.
- Không có price table hoặc công thức `estimatedCost`; average cost chưa implement/verified.
- Token/latency live chỉ có evidence cho probe normal synthetic nêu trên; telemetry history durable hiện không chứng minh được.

## 6. Fallback và compliance

Khi Gemini unavailable/invalid, `processStoredReceipt()` gọi `server_mark_receipt_failed`, sau đó `cleanUpTemporaryReceipt()` để xóa object/row tạm, rồi trả lỗi an toàn. Nếu cleanup dependency cũng fail, lỗi được log và record có thể còn lại để cleanup an toàn; không được tuyên bố “không bao giờ còn failed row”. Transaction CRUD thông thường không phụ thuộc Gemini, nên người dùng vẫn tạo transaction thủ công bằng nút New transaction.

| Requirement | Status | Code evidence | Test evidence | Remaining work |
| --- | --- | --- | --- | --- |
| Multimodal ảnh | Implemented + live synthetic verified | `extractReceiptImage()` | five fixture evidence | Test thêm hóa đơn thật có quyền sử dụng. |
| Structured JSON | Implemented + verified | provider JSON schema + `receiptExtractionSchema` | schema tests | UI hiển thị warnings/items cần hoàn thiện. |
| Injection/non-receipt | Implemented + verified | `receiptGuardrails.js` | unit + live synthetic | Mở rộng corpus attack thật. |
| Timeout/invalid/provider fallback | Implemented một phần | retry/timeout/catch/cleanup | deterministic + mocked service | E2E outage trên remote chưa chứng minh. |
| Prompt version history | Implemented | `server/prompts/receipts/` | unit loads v3 | Chạy benchmark before/after. |
| Cost telemetry | Partially implemented | usage tracker/writer | no durable receipt table evidence | Tạo/migrate analytics table, pricing calculation. |
