import React from 'react';

export default function DocumentEditor({ editingDoc, onChange, onSave, onCancel }) {
  if (!editingDoc) return null;

  return (
    <div className="editor-card">
      <div className="editor-header">
        <h3>{editingDoc.isNew ? 'Add New Document' : `Edit: ${editingDoc.filename}`}</h3>
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <form onSubmit={onSave}>
        <div className="form-group">
          <label>Filename (must end in .md)</label>
          <input
            type="text"
            className="form-input"
            value={editingDoc.filename}
            disabled={!editingDoc.isNew}
            placeholder="e.g. festivals.md"
            onChange={(e) => onChange({ ...editingDoc, filename: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label>Content (Use "## Section Title" for chunks)</label>
          <textarea
            className="form-textarea"
            rows={12}
            value={editingDoc.content}
            onChange={(e) => onChange({ ...editingDoc, content: e.target.value })}
            placeholder="## Section Title&#10;&#10;Description..."
            required
          />
        </div>
        <div className="editor-actions">
          <button type="submit" className="btn btn-primary">
            Save Document
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
