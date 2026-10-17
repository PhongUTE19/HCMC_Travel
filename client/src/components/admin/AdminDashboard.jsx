import React, { useState, useEffect, useCallback } from 'react';
import ErrorMessage from '../ErrorMessage';
import SuccessMessage from '../SuccessMessage';
import AdminStats from './AdminStats';
import DocumentEditor from './DocumentEditor';
import DocumentTable from './DocumentTable';
import ChunkReview from './ChunkReview';
import SystemPromptEditor from './SystemPromptEditor';
import {
  fetchAdminStatus,
  fetchDocuments,
  fetchDocumentContent,
  saveDocument,
  updateDocument,
  deleteDocument,
  fetchChunks,
  triggerIndexing,
} from '../../services/adminApi';
import { UI_LABELS, APP_MESSAGES, FILE_EXTENSIONS, PAGINATION } from '../../constants';

export default function AdminDashboard() {
  const [status, setStatus] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Document Editor state
  const [editingDoc, setEditingDoc] = useState(null); // { filename, content, isNew }
  const [editorLoading, setEditorLoading] = useState(false);

  // Paginated Chunks state
  const [chunks, setChunks] = useState([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [chunkLimit, setChunkLimit] = useState(PAGINATION.DEFAULT_LIMIT);
  const [chunkOffset, setChunkOffset] = useState(PAGINATION.DEFAULT_OFFSET);
  const [hasMore, setHasMore] = useState(false);
  const [chunkSearch, setChunkSearch] = useState('');
  const [chunksLoading, setChunksLoading] = useState(false);

  // Load status and documents overview
  const loadOverview = async () => {
    try {
      const [statusData, docsData] = await Promise.all([
        fetchAdminStatus(),
        fetchDocuments(),
      ]);
      setStatus(statusData);
      setDocuments(docsData.documents || []);
    } catch (err) {
      setError(err.message || APP_MESSAGES.ERROR.LOAD_OVERVIEW_FAILED);
    }
  };

  // Load paginated chunks from backend
  const loadChunksData = useCallback(async (limit, offset, search) => {
    setChunksLoading(true);
    try {
      const chunksData = await fetchChunks({ limit, offset, search });
      setChunks(chunksData.chunks || []);
      setTotalChunks(chunksData.totalChunks || 0);
      setHasMore(Boolean(chunksData.hasMore));
    } catch (err) {
      setError(err.message || APP_MESSAGES.ERROR.LOAD_CHUNKS_FAILED);
    } finally {
      setChunksLoading(false);
    }
  }, []);

  const clearFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const refreshData = async () => {
    await Promise.all([
      loadOverview(),
      loadChunksData(chunkLimit, chunkOffset, chunkSearch),
    ]);
  };

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      await refreshData();
      setLoading(false);
    };
    init();
  }, []); // Run on mount

  // Trigger Indexing
  const handleTriggerIndexing = async () => {
    clearFeedback();
    setIndexing(true);
    try {
      const result = await triggerIndexing();
      setSuccess(result.message || APP_MESSAGES.SUCCESS.REINDEX_COMPLETED);
      await refreshData();
    } catch (err) {
      setError(err.message || APP_MESSAGES.ERROR.REINDEX_FAILED);
    } finally {
      setIndexing(false);
    }
  };

  // Upload File handler
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    clearFeedback();

    if (!file.name.endsWith(FILE_EXTENSIONS.MARKDOWN)) {
      setError(APP_MESSAGES.ERROR.INVALID_FILE_TYPE);
      event.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      if (!text.trim()) {
        setError(APP_MESSAGES.ERROR.UPLOADED_FILE_EMPTY);
        event.target.value = '';
        return;
      }

      await saveDocument(file.name, text, true);
      setSuccess(APP_MESSAGES.SUCCESS.FILE_UPLOADED(file.name));
      await refreshData();
    } catch (err) {
      setError(err.message || APP_MESSAGES.ERROR.UPLOAD_DOC_FAILED);
    } finally {
      event.target.value = '';
    }
  };

  // Open Document Editor for Create
  const handleNewDocument = () => {
    setEditingDoc({
      filename: '',
      content: UI_LABELS.ADMIN_DASHBOARD.DEFAULT_DOC_CONTENT,
      isNew: true,
    });
    clearFeedback();
  };

  // Open Document Editor for Edit
  const handleEditDocument = async (filename) => {
    clearFeedback();
    setEditorLoading(true);
    try {
      const doc = await fetchDocumentContent(filename);
      setEditingDoc({
        filename: doc.filename,
        content: doc.content,
        isNew: false,
      });
    } catch (err) {
      setError(err.message || APP_MESSAGES.ERROR.LOAD_DOC_CONTENT_FAILED);
    } finally {
      setEditorLoading(false);
    }
  };

  // Save Document (Create or Edit)
  const handleSaveDocument = async (e) => {
    e.preventDefault();
    if (!editingDoc) return;

    clearFeedback();

    const { filename, content, isNew } = editingDoc;
    if (!filename.trim()) {
      setError(APP_MESSAGES.ERROR.FILENAME_REQUIRED);
      return;
    }
    if (!content.trim()) {
      setError(APP_MESSAGES.ERROR.DOC_CONTENT_EMPTY);
      return;
    }

    try {
      if (isNew) {
        await saveDocument(filename.trim(), content, false);
        setSuccess(APP_MESSAGES.SUCCESS.DOC_CREATED(filename));
      } else {
        await updateDocument(filename, content);
        setSuccess(APP_MESSAGES.SUCCESS.DOC_UPDATED(filename));
      }
      setEditingDoc(null);
      await refreshData();
    } catch (err) {
      setError(err.message || APP_MESSAGES.ERROR.SAVE_DOC_FAILED);
    }
  };

  // Delete Document
  const handleDeleteDocument = async (filename) => {
    if (!window.confirm(UI_LABELS.ADMIN_DASHBOARD.DELETE_CONFIRMATION(filename))) {
      return;
    }

    clearFeedback();
    try {
      await deleteDocument(filename);
      setSuccess(APP_MESSAGES.SUCCESS.DOC_DELETED(filename));
      await refreshData();
    } catch (err) {
      setError(err.message || APP_MESSAGES.ERROR.DELETE_DOC_FAILED);
    }
  };

  // Chunk pagination and search handlers
  const handleSearchChange = (newQuery) => {
    setChunkSearch(newQuery);
    setChunkOffset(0);
    loadChunksData(chunkLimit, 0, newQuery);
  };

  const handleLimitChange = (newLimit) => {
    setChunkLimit(newLimit);
    setChunkOffset(0);
    loadChunksData(newLimit, 0, chunkSearch);
  };

  const handlePrevPage = () => {
    const nextOffset = Math.max(0, chunkOffset - chunkLimit);
    setChunkOffset(nextOffset);
    loadChunksData(chunkLimit, nextOffset, chunkSearch);
  };

  const handleNextPage = () => {
    const nextOffset = chunkOffset + chunkLimit;
    setChunkOffset(nextOffset);
    loadChunksData(chunkLimit, nextOffset, chunkSearch);
  };

  return (
    <div className="admin-container">
      <div className="admin-header-row">
        <div>
          <h2 className="admin-section-title">{UI_LABELS.ADMIN_DASHBOARD.TITLE}</h2>
          <p className="admin-section-desc">
            {UI_LABELS.ADMIN_DASHBOARD.DESCRIPTION}
          </p>
        </div>
        <button
          className="btn btn-primary btn-index"
          onClick={handleTriggerIndexing}
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

      <ErrorMessage message={error} />
      <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />

      {/* 1. Status Cards */}
      <AdminStats status={status} indexing={indexing} />

      {/* 2. Document Editor Modal / Inline Form */}
      <DocumentEditor
        editingDoc={editingDoc}
        onChange={setEditingDoc}
        onSave={handleSaveDocument}
        onCancel={() => setEditingDoc(null)}
      />

      {/* 3. Document Management Table */}
      <DocumentTable
        documents={documents}
        editorLoading={editorLoading}
        onNew={handleNewDocument}
        onEdit={handleEditDocument}
        onDelete={handleDeleteDocument}
        onUpload={handleFileUpload}
      />

      {/* 4. Chunk Review Interface */}
      <ChunkReview
        chunks={chunks}
        totalChunks={totalChunks}
        limit={chunkLimit}
        offset={chunkOffset}
        hasMore={hasMore}
        searchQuery={chunkSearch}
        loading={chunksLoading}
        onSearchChange={handleSearchChange}
        onLimitChange={handleLimitChange}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
      />

      {/* 5. System Prompt Configuration */}
      <SystemPromptEditor />
    </div>
  );
}
