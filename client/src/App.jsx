import React, { useCallback, useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});
const today = () => new Date().toISOString().slice(0, 10);
// Một hàm gọi API dùng chung để mọi trang xử lý lỗi theo cùng một cách.
async function api(path, options = {}) {
  const r = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-demo-user-id": "demo-user",
      ...options.headers,
    },
  });
  if (!r.ok)
    throw new Error(
      (await r.json().catch(() => ({}))).error ||
        "Không thể thực hiện thao tác.",
    );
  return r.status === 204 ? null : r.json();
}
const Empty = ({ text }) => <div className="empty">{text}</div>;

export default function App() {
  const [page, setPage] = useState("dashboard"),
    [categories, setCategories] = useState([]),
    [transactions, setTransactions] = useState([]),
    [budgets, setBudgets] = useState([]),
    [receipts, setReceipts] = useState([]),
    [meta, setMeta] = useState({ total: 0 }),
    [modal, setModal] = useState(null),
    [notice, setNotice] = useState(""),
    [filters, setFilters] = useState({
      search: "",
      type: "",
      categoryId: "",
      sort: "occurredAt:desc",
      page: 1,
    });
  // Tải lại sau mỗi CRUD để Dashboard luôn hiển thị số liệu mới nhất.
  const load = useCallback(async () => {
    try {
      const [c, t, b, r] = await Promise.all([
        api("/categories"),
        api(`/transactions?${new URLSearchParams({ ...filters, limit: 10 })}`),
        api("/budgets"),
        api("/receipts"),
      ]);
      setCategories(c.data);
      setTransactions(t.data);
      setMeta(t.meta);
      setBudgets(b.data);
      setReceipts(r.data);
    } catch (e) {
      setNotice(e.message);
    }
  }, [filters]);
  useEffect(() => {
    load();
  }, [load]);
  const cat = (id) => categories.find((x) => x.id === id);
  const summary = useMemo(
    () =>
      transactions.reduce(
        (s, x) => ({
          income: s.income + (x.type === "income" ? x.amount : 0),
          expense: s.expense + (x.type === "expense" ? x.amount : 0),
        }),
        { income: 0, expense: 0 },
      ),
    [transactions],
  );
  // Form thêm và sửa đều gọi vào đây để tránh lặp code.
  const save = async (path, method, body) => {
    try {
      await api(path, { method, body: JSON.stringify(body) });
      setModal(null);
      setNotice("Đã lưu thay đổi.");
      load();
    } catch (e) {
      setNotice(e.message);
    }
  };
  const remove = async (path, label) => {
    if (!confirm(`Xóa ${label}?`)) return;
    try {
      await api(path, { method: "DELETE" });
      setNotice("Đã xóa.");
      load();
    } catch (e) {
      setNotice(e.message);
    }
  };
  const nav = [
    ["dashboard", "Tổng quan"],
    ["transactions", "Giao dịch"],
    ["categories", "Danh mục"],
    ["budgets", "Ngân sách"],
    ["receipts", "Hóa đơn"],
  ];
  const addKind =
    page === "transactions"
      ? "transaction"
      : page === "categories"
        ? "category"
        : page === "budgets"
          ? "budget"
          : "upload";
  return (
    <main className="expense-app">
      <aside>
        <div className="brand">
          <span>◎</span>
          <div>
            spendwise<small>SMART EXPENSE TRACKER</small>
          </div>
        </div>
        <nav>
          {nav.map(([id, label]) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => setPage(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="profile">
          <div className="avatar">DN</div>
          <div>
            Demo User<small>Chế độ phát triển</small>
          </div>
        </div>
      </aside>
      <section className="content">
        <header>
          <div>
            <p className="eyebrow">QUẢN LÝ TÀI CHÍNH CÁ NHÂN</p>
            <h1>{nav.find((x) => x[0] === page)[1]}</h1>
          </div>
          <button
            className="primary"
            onClick={() => setModal({ kind: addKind })}
          >
            + Thêm mới
          </button>
        </header>
        {notice && (
          <div className="notice">
            {notice}
            <button onClick={() => setNotice("")}>×</button>
          </div>
        )}
        {page === "dashboard" && (
          <Dashboard {...{ summary, transactions, cat, setPage }} />
        )}
        {page === "transactions" && (
          <Transactions
            {...{
              transactions,
              categories,
              cat,
              filters,
              setFilters,
              meta,
              setModal,
              remove,
            }}
          />
        )}
        {page === "categories" && (
          <Categories {...{ categories, setModal, remove }} />
        )}
        {page === "budgets" && (
          <Budgets {...{ budgets, cat, setModal, remove }} />
        )}
        {page === "receipts" && (
          <Receipts {...{ receipts, setModal, remove }} />
        )}
      </section>
      {modal && (
        <Editor
          {...{ modal, categories, onClose: () => setModal(null), save }}
        />
      )}
    </main>
  );
}
function Dashboard({ summary, transactions, cat, setPage }) {
  const balance = summary.income - summary.expense;
  return (
    <>
      <div className="hero">
        <div>
          <p>Chào bạn, hãy để tiền bạc bớt rắc rối.</p>
          <h2>
            Biết tiền đi đâu, <em>chủ động</em> hơn mỗi ngày.
          </h2>
          <button
            className="light-button"
            onClick={() => setPage("transactions")}
          >
            Xem giao dịch →
          </button>
        </div>
        <div className="hero-orb">₫</div>
      </div>
      <div className="metrics">
        <Metric label="Tổng thu" value={summary.income} kind="income" />
        <Metric label="Tổng chi" value={summary.expense} kind="expense" />
        <Metric label="Số dư hiện tại" value={balance} kind="balance" />
      </div>
      <section className="panel">
        <div className="section-title">
          <div>
            <p className="eyebrow">HOẠT ĐỘNG MỚI NHẤT</p>
            <h2>Giao dịch gần đây</h2>
          </div>
          <button
            className="link-button"
            onClick={() => setPage("transactions")}
          >
            Xem tất cả
          </button>
        </div>
        {transactions.length ? (
          transactions
            .slice(0, 5)
            .map((x) => (
              <Row key={x.id} item={x} category={cat(x.categoryId)} />
            ))
        ) : (
          <Empty text="Chưa có giao dịch nào. Hãy thêm giao dịch đầu tiên." />
        )}
      </section>
    </>
  );
}
function Metric({ label, value, kind }) {
  return (
    <div className={`metric ${kind}`}>
      <p>{label}</p>
      <strong>{money.format(value)}</strong>
      <span>
        {kind === "income"
          ? "↗ Tiền vào"
          : kind === "expense"
            ? "↙ Tiền ra"
            : "◎ Tổng quan"}
      </span>
    </div>
  );
}
function Row({ item, category }) {
  return (
    <div className="transaction-row">
      <div
        className="category-dot"
        style={{ background: category?.color || "#94a3b8" }}
      >
        {item.type === "income" ? "↗" : "↙"}
      </div>
      <div>
        <strong>{item.merchant}</strong>
        <small>
          {category?.name || "Chưa phân loại"} ·{" "}
          {new Date(item.occurredAt).toLocaleDateString("vi-VN")}
        </small>
      </div>
      <b className={item.type}>
        {item.type === "income" ? "+" : "−"}
        {money.format(item.amount)}
      </b>
    </div>
  );
}
function Transactions({
  transactions,
  categories,
  cat,
  filters,
  setFilters,
  meta,
  setModal,
  remove,
}) {
  const update = (k, v) => setFilters({ ...filters, [k]: v, page: 1 });
  return (
    <>
      <section className="toolbar">
        <input
          placeholder="Tìm theo mô tả hoặc cửa hàng..."
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
        />
        <select
          value={filters.type}
          onChange={(e) => update("type", e.target.value)}
        >
          <option value="">Tất cả loại</option>
          <option value="expense">Chi tiêu</option>
          <option value="income">Thu nhập</option>
        </select>
        <select
          value={filters.categoryId}
          onChange={(e) => update("categoryId", e.target.value)}
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <select
          value={filters.sort}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="occurredAt:desc">Mới nhất</option>
          <option value="occurredAt:asc">Cũ nhất</option>
          <option value="amount:desc">Số tiền cao</option>
          <option value="amount:asc">Số tiền thấp</option>
        </select>
      </section>
      <section className="panel table-panel">
        <div className="section-title">
          <h2>Danh sách giao dịch</h2>
          <span>{meta.total} kết quả</span>
        </div>
        {transactions.length ? (
          <table>
            <thead>
              <tr>
                <th>GIAO DỊCH</th>
                <th>DANH MỤC</th>
                <th>NGÀY</th>
                <th>SỐ TIỀN</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((x) => (
                <tr key={x.id}>
                  <td>
                    <strong>{x.merchant}</strong>
                    <small>
                      {x.note ||
                        (x.type === "income" ? "Thu nhập" : "Chi tiêu")}
                    </small>
                  </td>
                  <td>
                    <span className="tag">{cat(x.categoryId)?.name}</span>
                  </td>
                  <td>{new Date(x.occurredAt).toLocaleDateString("vi-VN")}</td>
                  <td className={x.type}>
                    {x.type === "income" ? "+" : "−"}
                    {money.format(x.amount)}
                  </td>
                  <td>
                    <button
                      className="text-action"
                      onClick={() => setModal({ kind: "transaction", data: x })}
                    >
                      Sửa
                    </button>
                    <button
                      className="text-action danger"
                      onClick={() =>
                        remove(`/transactions/${x.id}`, "giao dịch này")
                      }
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty text="Không tìm thấy giao dịch phù hợp." />
        )}
      </section>
      {meta.total > 10 && (
        <div className="pager">
          <button
            disabled={filters.page === 1}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
          >
            ← Trước
          </button>
          <span>Trang {filters.page}</span>
          <button
            disabled={filters.page * 10 >= meta.total}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
          >
            Sau →
          </button>
        </div>
      )}
    </>
  );
}
function Categories({ categories, setModal, remove }) {
  return (
    <section className="cards-grid">
      {categories.map((x) => (
        <article className="category-card" key={x.id}>
          <i style={{ background: x.color }}></i>
          <span className="tag">
            {x.type === "income" ? "THU NHẬP" : "CHI TIÊU"}
          </span>
          <h2>{x.name}</h2>
          <p>{x.isDefault ? "Danh mục mặc định" : "Danh mục tùy chỉnh"}</p>
          {!x.isDefault && (
            <footer>
              <button
                className="text-action"
                onClick={() => setModal({ kind: "category", data: x })}
              >
                Chỉnh sửa
              </button>
              <button
                className="text-action danger"
                onClick={() => remove(`/categories/${x.id}`, "danh mục này")}
              >
                Xóa
              </button>
            </footer>
          )}
        </article>
      ))}
    </section>
  );
}
function Budgets({ budgets, cat, setModal, remove }) {
  return (
    <section className="cards-grid budgets">
      {budgets.length ? (
        budgets.map((x) => {
          const pct = Math.min(100, Math.round((x.spent / x.limit) * 100));
          return (
            <article className="budget-card" key={x.id}>
              <p>{x.month}</p>
              <h2>{cat(x.categoryId)?.name || "Danh mục"}</h2>
              <strong>
                {money.format(x.spent)} <small>/ {money.format(x.limit)}</small>
              </strong>
              <div className="progress">
                <i style={{ width: `${pct}%` }} />
              </div>
              <p className={pct >= 100 ? "danger" : ""}>
                {pct >= 100
                  ? "Đã vượt ngân sách"
                  : `Còn lại ${money.format(x.limit - x.spent)}`}
              </p>
              <footer>
                <button
                  className="text-action"
                  onClick={() => setModal({ kind: "budget", data: x })}
                >
                  Sửa
                </button>
                <button
                  className="text-action danger"
                  onClick={() => remove(`/budgets/${x.id}`, "ngân sách này")}
                >
                  Xóa
                </button>
              </footer>
            </article>
          );
        })
      ) : (
        <Empty text="Chưa có ngân sách. Hãy tạo hạn mức cho một danh mục." />
      )}
    </section>
  );
}
function Receipts({ receipts, setModal, remove }) {
  return (
    <section className="cards-grid receipts">
      {receipts.length ? (
        receipts.map((x) => (
          <article className="receipt-card" key={x.id}>
            <div className="receipt-icon">▧</div>
            <span className="tag">CẦN KIỂM TRA</span>
            <h2>{x.merchant || "Hóa đơn chưa đặt tên"}</h2>
            <p>
              {x.total ? money.format(x.total) : "Chưa có tổng tiền"} ·{" "}
              {x.occurredAt
                ? new Date(x.occurredAt).toLocaleDateString("vi-VN")
                : "Chưa có ngày"}
            </p>
            <footer>
              <button
                className="text-action"
                onClick={() => setModal({ kind: "receipt", data: x })}
              >
                Chỉnh sửa
              </button>
              <button
                className="text-action danger"
                onClick={() => remove(`/receipts/${x.id}`, "hóa đơn này")}
              >
                Xóa
              </button>
            </footer>
          </article>
        ))
      ) : (
        <Empty text="Chưa có hóa đơn nào. Thêm metadata để chuẩn bị cho luồng AI trích xuất." />
      )}
    </section>
  );
}
function Editor({ modal, categories, onClose, save }) {
  const old = modal.data || {};
  const [d, setD] = useState({
    type: old.type || "expense",
    amount: old.amount || "",
    occurredAt: old.occurredAt?.slice(0, 10) || today(),
    categoryId: old.categoryId || "",
    merchant: old.merchant || "",
    note: old.note || "",
    name: old.name || "",
    color: old.color || "#6366f1",
    month: old.month || today().slice(0, 7),
    limit: old.limit || "",
    total: old.total || "",
    currency: old.currency || "VND",
    fileName: "",
    mimeType: "",
    imageData: "",
  });
  const set = (k, v) => setD({ ...d, [k]: v });
  const cfg = {
    transaction: ["Giao dịch", "/transactions"],
    category: ["Danh mục", "/categories"],
    budget: ["Ngân sách", "/budgets"],
    receipt: ["Hóa đơn", "/receipts"],
    upload: ["ảnh hóa đơn", "/receipts/upload"],
  }[modal.kind];
  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setD({ ...d, fileName: file.name, mimeType: file.type, imageData: reader.result });
    reader.readAsDataURL(file);
  };
  const submit = (e) => {
    e.preventDefault();
    const bodies = {
      transaction: {
        type: d.type,
        amount: +d.amount,
        occurredAt: d.occurredAt,
        categoryId: d.categoryId,
        merchant: d.merchant,
        note: d.note,
      },
      category: { name: d.name, type: d.type, color: d.color },
      budget: { categoryId: d.categoryId, month: d.month, limit: +d.limit },
      receipt: {
        merchant: d.merchant,
        occurredAt: d.occurredAt,
        total: +d.total,
        currency: d.currency,
      },
      upload: { fileName: d.fileName, mimeType: d.mimeType, imageData: d.imageData },
    };
    save(
      `${cfg[1]}${old.id ? `/${old.id}` : ""}`,
      old.id ? "PUT" : "POST",
      bodies[modal.kind],
    );
  };
  const selectCategories = categories.filter((x) =>
    modal.kind !== "transaction" ? x.type === "expense" : x.type === d.type,
  );
  return (
    <div className="modal-backdrop">
      <section className="modal">
        <button className="icon-button" onClick={onClose}>
          ×
        </button>
        <h2>
          {old.id ? "Chỉnh sửa" : "Thêm"} {cfg[0].toLowerCase()}
        </h2>
        <form onSubmit={submit}>
          {["transaction", "category"].includes(modal.kind) && (
            <label>
              Loại
              <select
                value={d.type}
                onChange={(e) => set("type", e.target.value)}
              >
                <option value="expense">Chi tiêu</option>
                <option value="income">Thu nhập</option>
              </select>
            </label>
          )}
          {modal.kind === "category" && (
            <>
              <label>
                Tên danh mục
                <input
                  required
                  value={d.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </label>
              <label>
                Màu nhận diện
                <input
                  type="color"
                  value={d.color}
                  onChange={(e) => set("color", e.target.value)}
                />
              </label>
            </>
          )}
          {modal.kind === "transaction" && (
            <>
              <label>
                Số tiền
                <input
                  type="number"
                  min="1"
                  required
                  value={d.amount}
                  onChange={(e) => set("amount", e.target.value)}
                />
              </label>
              <label>
                Ngày
                <input
                  type="date"
                  required
                  value={d.occurredAt}
                  onChange={(e) => set("occurredAt", e.target.value)}
                />
              </label>
              <label>
                Danh mục
                <select
                  required
                  value={d.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                >
                  <option value="">Chọn danh mục</option>
                  {selectCategories.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {modal.kind === "budget" && (
            <>
              <label>
                Tháng
                <input
                  type="month"
                  required
                  value={d.month}
                  onChange={(e) => set("month", e.target.value)}
                />
              </label>
              <label>
                Danh mục
                <select
                  required
                  value={d.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                >
                  <option value="">Chọn danh mục</option>
                  {selectCategories.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Hạn mức
                <input
                  type="number"
                  min="1"
                  required
                  value={d.limit}
                  onChange={(e) => set("limit", e.target.value)}
                />
              </label>
            </>
          )}
          {["transaction", "receipt"].includes(modal.kind) && (
            <>
              <label>
                {modal.kind === "receipt"
                  ? "Tên cửa hàng"
                  : "Cửa hàng hoặc mô tả"}
                <input
                  required={modal.kind === "transaction"}
                  value={d.merchant}
                  onChange={(e) => set("merchant", e.target.value)}
                />
              </label>
              {modal.kind === "transaction" && (
                <label>
                  Ghi chú
                  <input
                    value={d.note}
                    onChange={(e) => set("note", e.target.value)}
                  />
                </label>
              )}
              {modal.kind === "receipt" && (
                <>
                  <label>
                    Ngày hóa đơn
                    <input
                      type="date"
                      value={d.occurredAt}
                      onChange={(e) => set("occurredAt", e.target.value)}
                    />
                  </label>
                  <label>
                    Tổng tiền
                    <input
                      type="number"
                      min="1"
                      value={d.total}
                      onChange={(e) => set("total", e.target.value)}
                    />
                  </label>
                </>
              )}
            </>
          )}
          {modal.kind === "upload" && (
            <label>
              Chọn ảnh hóa đơn (JPG, PNG hoặc WebP; tối đa 5 MB)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                onChange={handleImageChange}
              />
            </label>
          )}
          <div className="form-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Hủy
            </button>
            <button className="primary">Lưu thay đổi</button>
          </div>
        </form>
      </section>
    </div>
  );
}
