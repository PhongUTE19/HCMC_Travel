import { useState } from 'react';
import { EXPENSE_CATEGORIES, INITIAL_TRANSACTION } from './expenseConstants';
import { categoriesForType } from './expenseFormatters';

export default function ReceiptReview({ file, draft, onConfirm, onDiscard }) {
  const [form, setForm] = useState({
    ...INITIAL_TRANSACTION,
    ...draft,
    merchant: draft.merchant || file.name.replace(/\.[^.]+$/, ''),
  });
  const [error, setError] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleConfirm() {
    if (!form.merchant.trim()) {
      setError('Merchant is required.');
      return;
    }
    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) {
      setError('Enter a total amount greater than zero before saving.');
      return;
    }
    try {
      await onConfirm({ ...form, amount: Number(form.amount) });
      onDiscard();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="receipt-review">
      <div className="review-title">
        <div>
          <p className="eyebrow">STEP 3 OF 3</p>
          <h2>Review extracted details</h2>
          <p>AI extraction is a draft. Check every field before saving.</p>
        </div>
        <button className="secondary-button" onClick={onDiscard}>Discard</button>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="review-grid">
        <div className="receipt-preview">
          <span>Receipt image</span>
          <strong>{file.name}</strong>
          <small>{Math.round(file.size / 1024)} KB</small>
        </div>
        <div className="form-grid">
          <label>Merchant<input name="merchant" value={form.merchant} onChange={handleChange} required /></label>
          <label>Date<input name="date" type="date" value={form.date} onChange={handleChange} required /></label>
          <label>Total amount<input name="amount" type="number" min="1" value={form.amount} onChange={handleChange} required /></label>
          <label>Category
            <select name="category" value={form.category} onChange={handleChange}>
              {categoriesForType(EXPENSE_CATEGORIES, 'expense').map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <label className="full">Note<textarea name="note" value={form.note} onChange={handleChange} rows="2" /></label>
        </div>
      </div>

      <div className="modal-actions">
        <button className="primary-button" onClick={handleConfirm}>Confirm and save transaction</button>
      </div>
    </section>
  );
}
