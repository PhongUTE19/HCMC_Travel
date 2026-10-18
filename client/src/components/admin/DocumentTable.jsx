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
  onReindex,
  indexing,
  loading,
}) {
  const fileInputRef = useRef(null);

  return (
    <div>
      <div className="row-layout">
        <input
          type="file"
          ref={fileInputRef}
          accept={FILE_EXTENSIONS.MARKDOWN}
          style={{ display: 'none' }}
          onChange={onUpload}
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => fileInputRef.current?.click()}
          title={UI_LABELS.DOCUMENT_TABLE.UPLOAD_TITLE}
        >
          {UI_LABELS.DOCUMENT_TABLE.UPLOAD_BTN}
        </button>
        <button type="button" className="btn btn-primary" onClick={onNew}>
          {UI_LABELS.DOCUMENT_TABLE.ADD_DOC_BTN}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onReindex}
          disabled={indexing || loading}
        >
          {indexing ? (
            <>
              <span className="spinner"></span> {UI_LABELS.ADMIN_DASHBOARD.INDEXING_BTN}
            </>
          ) : (
            UI_LABELS.ADMIN_DASHBOARD.REINDEX_BTN
          )}
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="empty-state">{UI_LABELS.DOCUMENT_TABLE.EMPTY_STATE}</div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
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
                  <td>
                    {doc.filename}
                  </td>
                  <td>{doc.sectionCount} {UI_LABELS.COMMON.CHUNKS}</td>
                  <td>{formatFileSize(doc.size)} {UI_UNITS.KB}</td>
                  <td>{new Date(doc.modifiedAt).toLocaleDateString()}</td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={editorLoading}
                      onClick={() => onEdit(doc.filename)}
                    >
                      {UI_LABELS.COMMON.EDIT}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
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
