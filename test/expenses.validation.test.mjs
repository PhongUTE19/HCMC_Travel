import test from "node:test";
import assert from "node:assert/strict";
import { receiptExtractionSchema } from "../server/src/features/expenses/expenses.schemas.js";

test("Receipt accepts null date without converting to 1970", () => {
  const result = receiptExtractionSchema.safeParse({
    occurredAt: null,
  });

  assert.equal(result.success, true);
  assert.equal(result.data.occurredAt, undefined);
});

test("Receipt accepts empty date", () => {
  const result = receiptExtractionSchema.safeParse({
    occurredAt: "",
  });

  assert.equal(result.success, true);
  assert.equal(result.data.occurredAt, undefined);
});

test("Receipt accepts valid date", () => {
  const result = receiptExtractionSchema.safeParse({
    occurredAt: "2026-10-23",
  });

  assert.equal(result.success, true);
  assert.equal(
    result.data.occurredAt.toISOString().slice(0, 10),
    "2026-10-23"
  );
});

test("Receipt rejects invalid date", () => {
  const result = receiptExtractionSchema.safeParse({
    occurredAt: "not-a-date",
  });

  assert.equal(result.success, false);
});