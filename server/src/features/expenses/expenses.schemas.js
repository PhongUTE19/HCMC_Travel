import { z } from "zod";

// Các schema này chặn dữ liệu sai trước khi ghi vào kho dữ liệu.
export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Amount must be greater than 0."),
  occurredAt: z.coerce.date(),
  categoryId: z.string().min(1, "A category is required."),
  merchant: z
    .string()
    .trim()
    .min(1, "A merchant or description is required.")
    .max(120),
  note: z.string().trim().max(500).optional().default(""),
  receiptId: z.string().optional().nullable(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required.").max(60),
  type: z.enum(["income", "expense"]),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value.")
    .optional()
    .default("#6366f1"),
});

export const budgetSchema = z.object({
  categoryId: z.string().min(1, "A category is required."),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must use YYYY-MM."),
  limit: z.coerce.number().positive("Budget limit must be greater than 0."),
});

export const receiptExtractionSchema = z.object({
  merchant: z.string().trim().max(120).optional().default(""),
  occurredAt: z.preprocess(
    (value) => value === null || value === "" ? undefined : value,
    z.coerce.date().optional()
  ),
  total: z.coerce.number().positive().optional(),
  currency: z.string().trim().length(3).optional().default("VND"),
  suggestedCategoryId: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        amount: z.coerce.number().nonnegative(),
      }),
    )
    .optional()
    .default([]),
});

// Client gửi ảnh dưới dạng data URL để prototype chạy không cần dịch vụ storage ngoài.
export const receiptUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(120),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  imageData: z.string().startsWith('data:image/', 'Receipt image is required.'),
});
