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
  const [chunkLimit, setChunkLimit] = useState(10);
  const [chunkOffset, setChunkOffset] = useState(0);
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
      setError(err.message || 'Failed to load status and documents.');
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
      setError(err.message || 'Failed to load chunks.');
    } finally {
      setChunksLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      await Promise.all([
        loadOverview(),
        loadChunksData(chunkLimit, chunkOffset, chunkSearch),
      ]);
      setLoading(false);
    };
    init();
  }, []); // Run on mount

  // Trigger Indexing
  const handleTriggerIndexing = async () => {
    setError(null);
    setSuccess(null);
    setIndexing(true);
    try {
      const result = await triggerIndexing();
      setSuccess(result.message || 'Indexing completed successfully.');
      await Promise.all([
        loadOverview(),
        loadChunksData(chunkLimit, chunkOffset, chunkSearch),
      ]);
    } catch (err) {
      setError(err.message || 'Failed to trigger indexing.');
    } finally {
      setIndexing(false);
    }
  };

  // Upload File handler
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    if (!file.name.endsWith('.md')) {
      setError('Invalid file type. Only Markdown (.md) files are supported.');
      event.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      if (!text.trim()) {
        setError('Uploaded file is empty.');
        event.target.value = '';
        return;
      }

      await saveDocument(file.name, text, true);
      setSuccess(`File "${file.name}" uploaded successfully. Remember to re-index!`);
      await Promise.all([
        loadOverview(),
        loadChunksData(chunkLimit, chunkOffset, chunkSearch),
      ]);
    } catch (err) {
      setError(err.message || 'Failed to upload document.');
    } finally {
      event.target.value = '';
    }
  };

  // Open Document Editor for Create
  const handleNewDocument = () => {
    setEditingDoc({
      filename: '',
      content: '## New Section Title\n\nEnter section details here...\n',
      isNew: true,
    });
    setError(null);
    setSuccess(null);
  };

  // Open Document Editor for Edit
  const handleEditDocument = async (filename) => {
    setError(null);
    setSuccess(null);
    setEditorLoading(true);
    try {
      const doc = await fetchDocumentContent(filename);
      setEditingDoc({
        filename: doc.filename,
        content: doc.content,
        isNew: false,
      });
    } catch (err) {
      setError(err.message || 'Failed to load document content.');
    } finally {
      setEditorLoading(false);
    }
  };

  // Save Document (Create or Edit)
  const handleSaveDocument = async (e) => {
    e.preventDefault();
    if (!editingDoc) return;

    setError(null);
    setSuccess(null);

    const { filename, content, isNew } = editingDoc;
    if (!filename.trim()) {
      setError('Filename is required.');
      return;
    }
    if (!content.trim()) {
      setError('Document content cannot be empty.');
      return;
    }

    try {
      if (isNew) {
        await saveDocument(filename.trim(), content, false);
        setSuccess(`Document "${filename}" created successfully.`);
      } else {
        await updateDocument(filename, content);
        setSuccess(`Document "${filename}" updated successfully.`);
      }
      setEditingDoc(null);
      await Promise.all([
        loadOverview(),
        loadChunksData(chunkLimit, chunkOffset, chunkSearch),
      ]);
    } catch (err) {
      setError(err.message || 'Failed to save document.');
    }
  };

  // Delete Document
  const handleDeleteDocument = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      await deleteDocument(filename);
      setSuccess(`Document "${filename}" deleted successfully.`);
      await Promise.all([
        loadOverview(),
        loadChunksData(chunkLimit, chunkOffset, chunkSearch),
      ]);
    } catch (err) {
      setError(err.message || 'Failed to delete document.');
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
          <h2 className="admin-section-title">Knowledge Base Management</h2>
          <p className="admin-section-desc">
            Manage Markdown documents, review indexed chunks, and sync with Qdrant Cloud.
          </p>
        </div>
        <button
          className="btn btn-primary btn-index"
          onClick={handleTriggerIndexing}
          disabled={indexing || loading}
        >
          {indexing ? (
            <>
              <span className="spinner"></span> Indexing...
            </>
          ) : (
            '⚡ Re-index Knowledge Base'
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
