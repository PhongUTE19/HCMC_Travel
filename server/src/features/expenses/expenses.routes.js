import express from "express";
import { validate } from "../../shared/middleware/validateRequest.js";
import { AppError } from "../../shared/errors/AppError.js";
import { HTTP_STATUS } from "../../constants/httpStatus.js";
import {
  budgetSchema,
  categorySchema,
  receiptExtractionSchema,
  receiptUploadSchema,
  transactionSchema,
} from "./expenses.schemas.js";
import * as store from "./expenses.store.js";

const router = express.Router();

function currentUserId(req) {
  // OAuth/JWT sẽ gắn user vào request. Header chỉ hỗ trợ lúc phát triển local.
  const allowDevBypass =
    process.env.DEV_AUTH_BYPASS === "true" ||
    process.env.NODE_ENV !== "production";
  const userId =
    req.user?.id ||
    (allowDevBypass ? req.header("x-demo-user-id") || "demo-user" : null);

  if (!userId) {
    throw new AppError("Authentication is required.", HTTP_STATUS.UNAUTHORIZED);
  }

  return userId;
}

function toIsoDate(value) {
  return new Date(value).toISOString();
}

async function requireRecord(resource, userId, id, label) {
  const record = await store.owned(resource, userId, id);
  if (!record) {
    throw new AppError(`${label} not found.`, HTTP_STATUS.NOT_FOUND);
  }
  return record;
}

async function requireMatchingCategory(userId, categoryId, transactionType) {
  const category = await store.owned("categories", userId, categoryId);
  if (!category || category.type !== transactionType) {
    throw new AppError(
      "Choose a category matching the transaction type.",
      HTTP_STATUS.BAD_REQUEST,
    );
  }
  return category;
}

function sendCreated(res, data) {
  return res.status(HTTP_STATUS.CREATED).json({ data });
}

function sendNoContent(res) {
  return res.status(204).end();
}

// ---------- Categories ----------

router.get("/categories", async (req, res) => {
  const categories = await store.collection("categories", currentUserId(req));
  res.json({ data: categories });
});

router.post("/categories", async (req, res) => {
  const userId = currentUserId(req);
  const input = validate(categorySchema, req.body);
  const categories = await store.collection("categories", userId);
  const exists = categories.some(
    (category) =>
      category.type === input.type &&
      category.name.toLowerCase() === input.name.toLowerCase(),
  );

  if (exists) {
    throw new AppError("This category already exists.", HTTP_STATUS.CONFLICT);
  }

  const category = await store.create("categories", userId, {
    ...input,
    isDefault: false,
  });
  return sendCreated(res, category);
});

router.put("/categories/:id", async (req, res) => {
  const userId = currentUserId(req);
  const category = await requireRecord(
    "categories",
    userId,
    req.params.id,
    "Category",
  );

  if (category.isDefault) {
    throw new AppError(
      "Default categories cannot be renamed.",
      HTTP_STATUS.FORBIDDEN,
    );
  }

  const input = validate(categorySchema, req.body);
  const updatedCategory = await store.update(
    "categories",
    userId,
    category.id,
    input,
  );
  res.json({ data: updatedCategory });
});

router.delete("/categories/:id", async (req, res) => {
  const userId = currentUserId(req);
  const category = await requireRecord(
    "categories",
    userId,
    req.params.id,
    "Category",
  );

  if (category.isDefault) {
    throw new AppError(
      "Default categories cannot be deleted.",
      HTTP_STATUS.FORBIDDEN,
    );
  }

  const transactions = await store.collection("transactions", userId);
  if (
    transactions.some((transaction) => transaction.categoryId === category.id)
  ) {
    throw new AppError(
      "This category is used by transactions. Reassign them before deleting it.",
      HTTP_STATUS.CONFLICT,
    );
  }

  await store.remove("categories", userId, category.id);
  return sendNoContent(res);
});

// ---------- Transactions ----------

router.get("/transactions", async (req, res) => {
  const userId = currentUserId(req);
  const {
    search = "",
    type,
    categoryId,
    from,
    to,
    sort = "occurredAt:desc",
    page = "1",
    limit = "10",
  } = req.query;
  let transactions = await store.collection("transactions", userId);

  // Chỉ lọc các bản ghi của người dùng hiện tại; store đã làm việc này từ đầu.
  if (search) {
    const keyword = search.toLowerCase();
    transactions = transactions.filter((transaction) =>
      `${transaction.merchant} ${transaction.note}`
        .toLowerCase()
        .includes(keyword),
    );
  }
  if (type)
    transactions = transactions.filter(
      (transaction) => transaction.type === type,
    );
  if (categoryId)
    transactions = transactions.filter(
      (transaction) => transaction.categoryId === categoryId,
    );
  if (from)
    transactions = transactions.filter(
      (transaction) => transaction.occurredAt >= from,
    );
  if (to)
    transactions = transactions.filter(
      (transaction) => transaction.occurredAt <= `${to}T23:59:59.999Z`,
    );

  const [field, direction] = sort.split(":");
  transactions.sort(
    (left, right) =>
      (left[field] > right[field] ? 1 : -1) * (direction === "asc" ? 1 : -1),
  );

  const currentPage = Math.max(1, Number(page));
  const pageSize = Math.min(50, Math.max(1, Number(limit)));
  const start = (currentPage - 1) * pageSize;

  res.json({
    data: transactions.slice(start, start + pageSize),
    meta: { total: transactions.length, page: currentPage, limit: pageSize },
  });
});

router.post("/transactions", async (req, res) => {
  const userId = currentUserId(req);
  const input = validate(transactionSchema, req.body);
  await requireMatchingCategory(userId, input.categoryId, input.type);

  const transaction = await store.create("transactions", userId, {
    ...input,
    occurredAt: toIsoDate(input.occurredAt),
  });
  return sendCreated(res, transaction);
});

router.get("/transactions/:id", async (req, res) => {
  const transaction = await requireRecord(
    "transactions",
    currentUserId(req),
    req.params.id,
    "Transaction",
  );
  res.json({ data: transaction });
});

router.put("/transactions/:id", async (req, res) => {
  const userId = currentUserId(req);
  await requireRecord("transactions", userId, req.params.id, "Transaction");
  const input = validate(transactionSchema, req.body);
  await requireMatchingCategory(userId, input.categoryId, input.type);

  const transaction = await store.update(
    "transactions",
    userId,
    req.params.id,
    {
      ...input,
      occurredAt: toIsoDate(input.occurredAt),
    },
  );
  res.json({ data: transaction });
});

router.delete("/transactions/:id", async (req, res) => {
  const userId = currentUserId(req);
  await requireRecord("transactions", userId, req.params.id, "Transaction");
  await store.remove("transactions", userId, req.params.id);
  return sendNoContent(res);
});

// ---------- Budgets ----------

router.get("/budgets", async (req, res) => {
  const userId = currentUserId(req);
  const budgets = await store.collection("budgets", userId);
  const transactions = await store.collection("transactions", userId);

  // spent không lưu trong database: luôn tính lại từ giao dịch thật.
  const data = budgets.map((budget) => ({
    ...budget,
    spent: transactions
      .filter(
        (transaction) =>
          transaction.type === "expense" &&
          transaction.categoryId === budget.categoryId &&
          transaction.occurredAt.startsWith(budget.month),
      )
      .reduce((total, transaction) => total + transaction.amount, 0),
  }));

  res.json({ data });
});

router.post("/budgets", async (req, res) => {
  const userId = currentUserId(req);
  const input = validate(budgetSchema, req.body);
  await requireRecord("categories", userId, input.categoryId, "Category");

  const budgets = await store.collection("budgets", userId);
  const exists = budgets.some(
    (budget) =>
      budget.month === input.month && budget.categoryId === input.categoryId,
  );
  if (exists) {
    throw new AppError(
      "A budget already exists for this category and month.",
      HTTP_STATUS.CONFLICT,
    );
  }

  return sendCreated(res, await store.create("budgets", userId, input));
});

router.put("/budgets/:id", async (req, res) => {
  const userId = currentUserId(req);
  await requireRecord("budgets", userId, req.params.id, "Budget");
  const input = validate(budgetSchema, req.body);
  await requireRecord("categories", userId, input.categoryId, "Category");
  const budget = await store.update("budgets", userId, req.params.id, input);
  res.json({ data: budget });
});

router.delete("/budgets/:id", async (req, res) => {
  const userId = currentUserId(req);
  await requireRecord("budgets", userId, req.params.id, "Budget");
  await store.remove("budgets", userId, req.params.id);
  return sendNoContent(res);
});

// ---------- Receipts ----------

router.get("/receipts", async (req, res) => {
  res.json({ data: await store.collection("receipts", currentUserId(req)) });
});

// Upload ảnh trước. AI/OCR sẽ đọc imageData và cập nhật metadata ở bước sau.
router.post("/receipts/upload", async (req, res) => {
  const input = validate(receiptUploadSchema, req.body);
  const receipt = await store.create("receipts", currentUserId(req), {
    fileName: input.fileName,
    mimeType: input.mimeType,
    imageData: input.imageData,
    merchant: "",
    occurredAt: null,
    total: null,
    currency: "VND",
    suggestedCategoryId: null,
    items: [],
    status: "uploaded",
  });
  return sendCreated(res, receipt);
});

router.post("/receipts", async (req, res) => {
  const input = validate(receiptExtractionSchema, req.body);
  const receipt = await store.create("receipts", currentUserId(req), {
    ...input,
    occurredAt: input.occurredAt ? toIsoDate(input.occurredAt) : null,
    status: "review", // AI/OCR trả dữ liệu về thì người dùng vẫn phải kiểm tra.
  });
  return sendCreated(res, receipt);
});

router.get("/receipts/:id", async (req, res) => {
  const receipt = await requireRecord(
    "receipts",
    currentUserId(req),
    req.params.id,
    "Receipt",
  );
  res.json({ data: receipt });
});

router.put("/receipts/:id", async (req, res) => {
  const userId = currentUserId(req);
  await requireRecord("receipts", userId, req.params.id, "Receipt");
  const input = validate(receiptExtractionSchema, req.body);
  const receipt = await store.update("receipts", userId, req.params.id, {
    ...input,
    occurredAt: input.occurredAt ? toIsoDate(input.occurredAt) : null,
  });
  res.json({ data: receipt });
});

router.delete("/receipts/:id", async (req, res) => {
  const userId = currentUserId(req);
  await requireRecord("receipts", userId, req.params.id, "Receipt");
  await store.remove("receipts", userId, req.params.id);
  return sendNoContent(res);
});

export default router;
