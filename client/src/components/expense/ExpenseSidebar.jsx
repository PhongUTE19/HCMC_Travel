const navigationItems = [
  ['transactions', 'Transactions'],
  ['receipt', 'Receipts'],
  ['categories', 'Categories'],
];

export default function ExpenseSidebar({ activeView, onNavigate }) {
  return (
    <aside className="expense-sidebar">
      <div className="brand">
        <span className="brand-mark">◉</span>
        <div>
          <strong>spendwise</strong>
          <small>SMART EXPENSE TRACKER</small>
        </div>
      </div>

      <nav aria-label="Expense tracker navigation">
        {navigationItems.map(([view, label]) => (
          <button
            className={activeView === view ? 'active' : ''}
            key={view}
            onClick={() => onNavigate(view)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="sidebar-user">
        <span>NU</span>
        <div>
          <strong>Demo user</strong>
          <small>Personal workspace</small>
        </div>
      </div>
    </aside>
  );
}
