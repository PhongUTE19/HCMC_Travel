import React from 'react';
import { UI_LABELS } from '../../constants';

export default function DocumentEditor({ editingDoc, onChange, onSave, onCancel }) {
  if (!editingDoc) return null;

  return (
    <div className="panel">
      <div className="panel-header split-layout">
        <h3 className="panel-title">
          {editingDoc.isNew
            ? UI_LABELS.DOCUMENT_EDITOR.ADD_NEW_DOC
            : `${UI_LABELS.DOCUMENT_EDITOR.EDIT_DOC_PREFIX}${editingDoc.filename}`}
        </h3>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          {UI_LABELS.COMMON.CANCEL}
        </button>
      </div>
      <form onSubmit={onSave}>
        <div className="form-group">
          <label>{UI_LABELS.DOCUMENT_EDITOR.FILENAME_LABEL}</label>
          <input
            type="text"
            className="form-input"
            value={editingDoc.filename}
            disabled={!editingDoc.isNew}
            placeholder={UI_LABELS.DOCUMENT_EDITOR.FILENAME_PLACEHOLDER}
            onChange={(e) => onChange({ ...editingDoc, filename: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label>{UI_LABELS.DOCUMENT_EDITOR.CONTENT_LABEL}</label>
          <textarea
            className="form-textarea"
            rows={12}
            value={editingDoc.content}
            onChange={(e) => onChange({ ...editingDoc, content: e.target.value })}
            placeholder={UI_LABELS.DOCUMENT_EDITOR.CONTENT_PLACEHOLDER}
            required
          />
        </div>
        <div className="row-layout">
          <button type="submit" className="btn btn-primary">
            {UI_LABELS.DOCUMENT_EDITOR.SAVE_BTN}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {UI_LABELS.COMMON.CANCEL}
          </button>
        </div>
      </form>
    </div>
  );
}
