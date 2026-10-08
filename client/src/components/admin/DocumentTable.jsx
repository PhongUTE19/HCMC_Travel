import React, { useRef } from 'react';

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
        <h3 className="panel-title">Documents ({documents.length})</h3>
        <div className="panel-actions">
          <input
            type="file"
            ref={fileInputRef}
            accept=".md"
            style={{ display: 'none' }}
            onChange={onUpload}
          />
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            title="Upload Markdown file from your computer"
          >
            📤 Upload .md File
          </button>
          <button className="btn btn-primary btn-sm" onClick={onNew}>
            + Add Document
          </button>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="empty-state">No documents found in knowledge directory.</div>
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Filename</th>
                <th>Sections</th>
                <th>Size</th>
                <th>Last Modified</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.filename}>
                  <td className="doc-name">
                    <span className="file-icon">📄</span> {doc.filename}
                  </td>
                  <td>{doc.sectionCount} chunks</td>
                  <td>{(doc.size / 1024).toFixed(1)} KB</td>
                  <td>{new Date(doc.modifiedAt).toLocaleDateString()}</td>
                  <td className="actions-cell">
                    <button
                      className="btn-link"
                      disabled={editorLoading}
                      onClick={() => onEdit(doc.filename)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-link btn-link-danger"
                      onClick={() => onDelete(doc.filename)}
                    >
                      Delete
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
