import { useEffect, useMemo, useState } from 'react';
import { expenseApi } from '../../services/expenseApi';
import ExpenseSidebar from './ExpenseSidebar';
import ReceiptReview from './ReceiptReview';
import TransactionForm from './TransactionForm';
import TransactionTable from './TransactionTable';
import { INITIAL_TRANSACTION, MAX_RECEIPT_SIZE_BYTES, RECEIPT_ACCEPTED_TYPES } from './expenseConstants';
import { formatMoney } from './expenseFormatters';
import './expenseTracker.css';

const INITIAL_FILTERS = {
  search: '', type: '', category: '', from: '', to: '',
  page: '1', pageSize: '10', sortBy: 'date', sortOrder: 'desc',
};

function pageTitle(view) {
  return { transactions: 'Transactions', receipt: 'Scan a receipt', categories: 'Categories' }[view];
}

export default function ExpenseTrackerApp({ user, onSignOut }) {
  const [view, setView] = useState('transactions');
  const [data, setData] = useState({ transactions: [], total: 0, page: 1, pageSize: 10 });
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [receipt, setReceipt] = useState(null);

  async function loadTransactions() {
    setLoading(true);
    setError('');
    try {
      setData(await expenseApi.list(filters));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  // Tải lại danh sách khi bộ lọc hoặc phân trang phía server thay đổi.
  useEffect(() => {
    loadTransactions();
  }, [filters.page, filters.pageSize, filters.sortBy, filters.sortOrder, filters.type, filters.category, filters.from, filters.to]);

  const summary = useMemo(() => data.transactions.reduce((totals, transaction) => ({
    income: totals.income + (transaction.type === 'income' ? transaction.amount : 0),
    expense: totals.expense + (transaction.type === 'expense' ? transaction.amount : 0),
  }), { income: 0, expense: 0 }), [data.transactions]);

  async function saveTransaction(transaction) {
    if (editingTransaction?.id) {
      await expenseApi.update(editingTransaction.id, transaction);
    } else {
      await expenseApi.create(transaction);
    }
    await loadTransactions();
  }

  async function deleteTransaction(transaction) {
    if (!window.confirm(`Delete ${transaction.merchant}?`)) return;
    try {
      await expenseApi.remove(transaction.id);
      await loadTransactions();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function uploadReceipt(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!RECEIPT_ACCEPTED_TYPES.includes(file.type) || file.size > MAX_RECEIPT_SIZE_BYTES) {
      setError('Upload a JPG, PNG, or WebP file up to 5 MB.');
      return;
    }
    try {
      const result = await expenseApi.upload(file);
      setReceipt({ file, draft: result.receipt.extraction });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      event.target.value = '';
    }
  }

  function closeReceiptReview() {
    setReceipt(null);
    setView('transactions');
  }

  return (
    <main className="expense-shell">
      <ExpenseSidebar activeView={view} onNavigate={setView} user={user} onSignOut={onSignOut} />
      <section className="expense-main">
        <header className="expense-header">
          <div><p className="eyebrow">PERSONAL FINANCE</p><h1>{pageTitle(view)}</h1></div>
          {view === 'transactions' && <button className="primary-button" onClick={() => setEditingTransaction(INITIAL_TRANSACTION)}>+ New transaction</button>}
        </header>
        {error && <div className="page-error">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
        {view === 'receipt' && <div className="upload-card">
          <h2>Upload a receipt</h2>
          <p>Upload an image to prepare an expense transaction. You will always review and confirm the extracted data before it is saved.</p>
          <label className="upload-zone"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadReceipt} /><strong>Choose a receipt image</strong><small>JPG, PNG, or WebP · maximum 5 MB</small></label>
          {receipt && <ReceiptReview file={receipt.file} draft={receipt.draft} onConfirm={saveTransaction} onDiscard={closeReceiptReview} />}
        </div>}
        {view === 'categories' && <div className="coming-soon"><h2>Categories are a secondary flow</h2><p>The final-project core is receipt-to-transaction and transaction CRUD. This page stays out of the primary demo flow until the core is validated.</p></div>}
        {view === 'transactions' && <>
          <section className="summary-grid" aria-label="Transaction page summary">
            <article className="summary-card summary-card--income"><span>Income on this page</span><strong>{formatMoney(summary.income)}</strong><small>Funds recorded in this result set</small></article>
            <article className="summary-card summary-card--expense"><span>Expenses on this page</span><strong>{formatMoney(summary.expense)}</strong><small>Spending recorded in this result set</small></article>
            <article className="summary-card summary-card--balance"><span>Balance on this page</span><strong>{formatMoney(summary.income - summary.expense)}</strong><small>Income less expenses shown</small></article>
          </section>
          <TransactionTable data={data} filters={filters} loading={loading} onChangeFilters={setFilters} onEdit={setEditingTransaction} onDelete={deleteTransaction} onSearch={loadTransactions} />
        </>}
      </section>
      {editingTransaction && <TransactionForm transaction={editingTransaction.id ? editingTransaction : null} onSave={saveTransaction} onClose={() => setEditingTransaction(null)} />}
    </main>
  );
}
