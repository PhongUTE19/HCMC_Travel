import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  receiptSchema,
  transactionQuerySchema,
  transactionSchema,
} from '../server/src/features/expenses/expenses.schemas.js';
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listTransactions,
  updateTransaction,
} from '../server/src/features/expenses/expenses.service.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = path.join(projectRoot, 'server', 'data');
const dataFile = path.join(dataDirectory, 'expense-transactions.json');

const validTransaction = {
  type: 'expense',
  amount: 120000,
  date: '2026-10-21',
  category: 'Food & dining',
  merchant: 'Test cafe',
  note: 'Test receipt',
  items: [{ name: 'Coffee', amount: 120000 }],
};

// Xóa dữ liệu test sau khi chạy để không để lại giao dịch giả.
after(() => {
  fs.rmSync(dataDirectory, { recursive: true, force: true });
});

describe('Expense tracker schema and service', () => {
  it('accepts a valid transaction and rejects a zero amount', () => {
    assert.equal(transactionSchema.parse(validTransaction).amount, 120000);
    assert.throws(() => transactionSchema.parse({ ...validTransaction, amount: 0 }));
  });

  it('validates receipt type, size, and paginated query defaults', () => {
    assert.equal(receiptSchema.parse({ filename: 'receipt.png', mimeType: 'image/png', size: 100 }).filename, 'receipt.png');
    assert.throws(() => receiptSchema.parse({ filename: 'receipt.pdf', mimeType: 'application/pdf', size: 100 }));
    assert.deepEqual(transactionQuerySchema.parse({ page: '2' }), {
      search: '', page: 2, pageSize: 10, sortBy: 'date', sortOrder: 'desc',
    });
  });

  it('creates, filters, updates, and deletes a transaction', () => {
    const created = createTransaction(validTransaction);
    assert.equal(getTransaction(created.id).merchant, 'Test cafe');

    const searchResult = listTransactions({
      search: 'cafe', type: 'expense', category: 'Food & dining',
      from: '2026-10-01', to: '2026-10-31', page: 1, pageSize: 10,
      sortBy: 'date', sortOrder: 'desc',
    });
    assert.equal(searchResult.total, 1);

    const updated = updateTransaction(created.id, { ...validTransaction, amount: 150000 });
    assert.equal(updated.amount, 150000);
    assert.equal(deleteTransaction(created.id).id, created.id);
    assert.throws(() => getTransaction(created.id));
  });
});
