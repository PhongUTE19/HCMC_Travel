export const EXPENSE_CATEGORIES = Object.freeze([
  'Food & dining',
  'Transportation',
  'Shopping',
  'Education',
  'Health',
  'Entertainment',
  'Salary',
  'Other income',
  'Other expenses',
]);

export const INITIAL_TRANSACTION = Object.freeze({
  type: 'expense',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  category: 'Food & dining',
  merchant: '',
  note: '',
  items: [],
});

export const RECEIPT_ACCEPTED_TYPES = Object.freeze([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024;
