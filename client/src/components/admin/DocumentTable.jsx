import React, { useRef } from 'react';
import { UI_LABELS, FILE_EXTENSIONS, UI_UNITS } from '../../constants';
import { formatFileSize } from '../../utils/formatters';

export default function DocumentTable({
  documents,
  editorLoading,
  onNew,
  onEdit,
  onDelete,
  onUpload,
}) {
  const fileInputRef = useRef(null);

  return (
    <div className="admin-panel">
      <div className="panel-header">
        <h3 className="panel-title">{UI_LABELS.DOCUMENT_TABLE.TITLE} ({documents.length})</h3>
        <div className="panel-actions">
          <input
            type="file"
            ref={fileInputRef}
            accept={FILE_EXTENSIONS.MARKDOWN}
            style={{ display: 'none' }}
            onChange={onUpload}
          />
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            title={UI_LABELS.DOCUMENT_TABLE.UPLOAD_TITLE}
          >
            {UI_LABELS.DOCUMENT_TABLE.UPLOAD_BTN}
          </button>
          <button className="btn btn-primary btn-sm" onClick={onNew}>
            {UI_LABELS.DOCUMENT_TABLE.ADD_DOC_BTN}
          </button>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="empty-state">{UI_LABELS.DOCUMENT_TABLE.EMPTY_STATE}</div>
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{UI_LABELS.DOCUMENT_TABLE.TH_FILENAME}</th>
                <th>{UI_LABELS.DOCUMENT_TABLE.TH_SECTIONS}</th>
                <th>{UI_LABELS.DOCUMENT_TABLE.TH_SIZE}</th>
                <th>{UI_LABELS.DOCUMENT_TABLE.TH_LAST_MODIFIED}</th>
                <th>{UI_LABELS.DOCUMENT_TABLE.TH_ACTIONS}</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.filename}>
                  <td className="doc-name">
                    <span className="file-icon">{UI_LABELS.DOCUMENT_TABLE.FILE_ICON}</span> {doc.filename}
                  </td>
                  <td>{doc.sectionCount} {UI_LABELS.COMMON.CHUNKS}</td>
                  <td>{formatFileSize(doc.size)} {UI_UNITS.KB}</td>
                  <td>{new Date(doc.modifiedAt).toLocaleDateString()}</td>
                  <td className="actions-cell">
                    <button
                      className="btn-link"
                      disabled={editorLoading}
                      onClick={() => onEdit(doc.filename)}
                    >
                      {UI_LABELS.COMMON.EDIT}
                    </button>
                    <button
                      className="btn-link btn-link-danger"
                      onClick={() => onDelete(doc.filename)}
                    >
                      {UI_LABELS.COMMON.DELETE}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
