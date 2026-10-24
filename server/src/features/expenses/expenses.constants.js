export const EXPENSE_LIMITS = Object.freeze({
  MAX_RECEIPT_SIZE_BYTES: 5 * 1024 * 1024,
  MAX_PAGE_SIZE: 50,
});

export const EXPENSE_MESSAGES = Object.freeze({
  TRANSACTION_NOT_FOUND: 'Transaction not found.',
  TRANSACTION_LINKED_TO_RECEIPT: 'This transaction is linked to a receipt and cannot be deleted.',
  RECEIPT_EXTRACTION_PENDING: 'Receipt extraction is not connected to an AI provider yet.',
});

export const RECEIPT_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
