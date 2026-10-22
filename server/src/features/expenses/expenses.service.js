import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AppError } from '../../shared/errors/index.js';
import { HTTP_STATUS } from '../../constants/index.js';
import { EXPENSE_MESSAGES } from './expenses.constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storePath = path.resolve(__dirname, '../../../data/expense-transactions.json');
const EMPTY_TRANSACTIONS = [];

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(storePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return EMPTY_TRANSACTIONS;
    throw error;
  }
}

// Cô lập phần lưu JSON tạm thời để sau này thay bằng database repository.
function writeStore(transactions) {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(transactions, null, 2), 'utf8');
}
function makeId() {
  return `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function findOrThrow(id) {
  const transaction = readStore().find((entry) => entry.id === id);
  if (!transaction) {
    throw new AppError(EXPENSE_MESSAGES.TRANSACTION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  return transaction;
}

export function listTransactions(query) {
  const { search, type, category, from, to, page, pageSize, sortBy, sortOrder } = query;
  const normalizedSearch = search.toLowerCase();
  const filtered = readStore().filter((transaction) => (
    (!type || transaction.type === type)
    && (!category || transaction.category === category)
    && (!from || transaction.date >= from)
    && (!to || transaction.date <= to)
    && (!normalizedSearch || `${transaction.merchant} ${transaction.note}`.toLowerCase().includes(normalizedSearch))
  )).sort((a, b) => {
    const left = sortBy === 'amount' ? a.amount : a.date;
    const right = sortBy === 'amount' ? b.amount : b.date;
    return (left > right ? 1 : left < right ? -1 : 0) * (sortOrder === 'asc' ? 1 : -1);
  });
  const start = (page - 1) * pageSize;
  return {
    transactions: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
  };
}

export function getTransaction(id) {
  return findOrThrow(id);
}

export function createTransaction(input) {
  const now = new Date().toISOString();
  const transaction = { id: makeId(), ...input, createdAt: now, updatedAt: now };
  const transactions = readStore();
  transactions.push(transaction);
  writeStore(transactions);
  return transaction;
}

export function updateTransaction(id, input) {
  const transactions = readStore();
  const index = transactions.findIndex((entry) => entry.id === id);
  if (index < 0) {
    throw new AppError(EXPENSE_MESSAGES.TRANSACTION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  transactions[index] = { ...transactions[index], ...input, id, updatedAt: new Date().toISOString() };
  writeStore(transactions);
  return transactions[index];
}

export function deleteTransaction(id) {
  const transactions = readStore();
  const index = transactions.findIndex((entry) => entry.id === id);
  if (index < 0) {
    throw new AppError(EXPENSE_MESSAGES.TRANSACTION_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }
  const [deleted] = transactions.splice(index, 1);
  writeStore(transactions);
  return deleted;
}

// Trả về draft an toàn để review trong khi chưa tích hợp AI extraction thật.
export function createReceiptDraft(file) {
  return {
    id: `receipt_${Date.now()}`,
    filename: file.filename,
    status: 'draft',
    extraction: {
      merchant: '',
      date: new Date().toISOString().slice(0, 10),
      amount: '',
      currency: 'VND',
      category: 'Other expenses',
      items: [],
    },
  };
}
