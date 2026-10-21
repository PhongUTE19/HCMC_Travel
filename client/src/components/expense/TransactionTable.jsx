import { EXPENSE_CATEGORIES } from './expenseConstants';
import { formatMoney } from './expenseFormatters';

export default function TransactionTable({ data, filters, loading, onChangeFilters, onEdit, onDelete, onSearch }) {
  const toggleAmountSort = () => onChangeFilters((current) => ({
    ...current,
    sortBy: 'amount',
    sortOrder: current.sortOrder === 'desc' ? 'asc' : 'desc',
  }));

  return (
    <section className="transaction-panel">
      <div className="filters">
        <input
          value={filters.search}
          onChange={(event) => onChangeFilters((current) => ({ ...current, search: event.target.value, page: '1' }))}
          onKeyDown={(event) => event.key === 'Enter' && onSearch()}
          placeholder="Search merchant or note"
        />
        <select value={filters.type} onChange={(event) => onChangeFilters((current) => ({ ...current, type: event.target.value, page: '1' }))}>
          <option value="">All types</option><option value="expense">Expenses</option><option value="income">Income</option>
        </select>
        <select value={filters.category} onChange={(event) => onChangeFilters((current) => ({ ...current, category: event.target.value, page: '1' }))}>
          <option value="">All categories</option>
          {EXPENSE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
        </select>
        <input type="date" value={filters.from} onChange={(event) => onChangeFilters((current) => ({ ...current, from: event.target.value, page: '1' }))} />
        <input type="date" value={filters.to} onChange={(event) => onChangeFilters((current) => ({ ...current, to: event.target.value, page: '1' }))} />
        <button className="secondary-button" onClick={onSearch}>Search</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Transaction</th><th>Category</th><th>Date</th><th><button className="sort-button" onClick={toggleAmountSort}>Amount ↕</button></th><th>Actions</th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan="5" className="empty">Loading transactions…</td></tr>}
            {!loading && data.transactions.length === 0 && <tr><td colSpan="5" className="empty">No transactions match these filters.</td></tr>}
            {!loading && data.transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td><strong>{transaction.merchant}</strong><small>{transaction.note || transaction.type}</small></td>
                <td><span className="category-pill">{transaction.category}</span></td>
                <td>{transaction.date}</td>
                <td className={transaction.type === 'income' ? 'income' : 'expense'}>{transaction.type === 'income' ? '+' : '-'}{formatMoney(transaction.amount)}</td>
                <td><button className="row-action" onClick={() => onEdit(transaction)}>Edit</button><button className="row-action danger" onClick={() => onDelete(transaction)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="pagination">
        <span>{data.total} transaction{data.total === 1 ? '' : 's'}</span>
        <div>
          <button className="secondary-button" disabled={data.page <= 1} onClick={() => onChangeFilters((current) => ({ ...current, page: String(Number(current.page) - 1) }))}>Previous</button>
          <span>Page {data.page}</span>
          <button className="secondary-button" disabled={data.page * data.pageSize >= data.total} onClick={() => onChangeFilters((current) => ({ ...current, page: String(Number(current.page) + 1) }))}>Next</button>
        </div>
      </footer>
    </section>
  );
}
