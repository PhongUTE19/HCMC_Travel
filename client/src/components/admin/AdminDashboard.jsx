import React from 'react';
import AdminStats from './AdminStats';
import DocumentEditor from './DocumentEditor';
import DocumentTable from './DocumentTable';
import ChunkReview from './ChunkReview';
import SystemPromptEditor from './SystemPromptEditor';
import AdminAnalyticsDashboard from './analytics/AdminAnalyticsDashboard';
import { useAdminDashboard } from '../../hooks';
import { UI_LABELS, ADMIN_PANELS, ADMIN_TABS } from '../../constants';

export default function AdminDashboard({ health, onRefreshHealth }) {
  const isOffline = Boolean(health?.error);
  const {
    loading,
    activeTab,
    setActiveTab,
    drawer,
    chunksState,
    kb,
    docs,
  } = useAdminDashboard({ isOffline });

  return (
    <div className="dashboard-container">
      {/* Top Admin Section Tabs */}
      <div className="tab-nav" role="tablist" aria-label="Admin Navigation Tabs">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === ADMIN_TABS.KNOWLEDGE}
          className={`tab-btn ${activeTab === ADMIN_TABS.KNOWLEDGE ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab(ADMIN_TABS.KNOWLEDGE)}
        >
          {UI_LABELS.ANALYTICS.TAB_KNOWLEDGE}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === ADMIN_TABS.ANALYTICS}
          className={`tab-btn ${activeTab === ADMIN_TABS.ANALYTICS ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab(ADMIN_TABS.ANALYTICS)}
        >
          {UI_LABELS.ANALYTICS.TAB_ANALYTICS}
        </button>
      </div>

      {activeTab === ADMIN_TABS.ANALYTICS ? (
        <AdminAnalyticsDashboard />
      ) : (
        <>
          {/* 1. Status Cards */}
          <AdminStats status={kb.status} indexing={kb.indexing} />

          {/* 2. Management Navigation Bar */}
          <div className="dashboard-content-layout">
            <nav className="dashboard-nav" aria-label="Admin panels">
              <button
                type="button"
                className={`btn ${drawer.isDrawerOpen && drawer.activePanel === ADMIN_PANELS.DOCUMENTS ? 'btn-primary' : 'btn-secondary'}`}
                onClick={(e) => drawer.openDrawer(ADMIN_PANELS.DOCUMENTS, e)}
                aria-expanded={drawer.isDrawerOpen && drawer.activePanel === ADMIN_PANELS.DOCUMENTS}
                aria-controls="admin-drawer"
              >
                {UI_LABELS.ADMIN_DASHBOARD.NAV_DOCUMENTS}
              </button>
              <button
                type="button"
                className={`btn ${drawer.isDrawerOpen && drawer.activePanel === ADMIN_PANELS.CHUNKS ? 'btn-primary' : 'btn-secondary'}`}
                onClick={(e) => drawer.openDrawer(ADMIN_PANELS.CHUNKS, e)}
                aria-expanded={drawer.isDrawerOpen && drawer.activePanel === ADMIN_PANELS.CHUNKS}
                aria-controls="admin-drawer"
              >
                {UI_LABELS.ADMIN_DASHBOARD.NAV_CHUNKS}
              </button>
              <button
                type="button"
                className={`btn ${drawer.isDrawerOpen && drawer.activePanel === ADMIN_PANELS.PROMPT ? 'btn-primary' : 'btn-secondary'}`}
                onClick={(e) => drawer.openDrawer(ADMIN_PANELS.PROMPT, e)}
                aria-expanded={drawer.isDrawerOpen && drawer.activePanel === ADMIN_PANELS.PROMPT}
                aria-controls="admin-drawer"
              >
                {UI_LABELS.ADMIN_DASHBOARD.NAV_PROMPT}
              </button>
            </nav>
          </div>

          {/* Backdrop */}
          <div
            className={`drawer-backdrop ${drawer.isDrawerOpen ? 'drawer-backdrop--open' : ''}`}
            onClick={drawer.closeDrawer}
            aria-hidden="true"
          />

          {/* Slide-out Drawer */}
          <aside
            id="admin-drawer"
            className={`drawer ${drawer.isDrawerOpen ? 'drawer--open' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
            aria-hidden={!drawer.isDrawerOpen}
            tabIndex={-1}
            ref={drawer.drawerRef}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <h3 id="drawer-title" className="drawer-title">
                  {drawer.getDrawerTitle()}
                </h3>
              </div>
            </div>

            <div className="drawer-body">
              {/* Documents Management & Inline Editor */}
              {drawer.activePanel === ADMIN_PANELS.DOCUMENTS && (
                <>
                  <DocumentEditor
                    editingDoc={docs.editingDoc}
                    onChange={docs.setEditingDoc}
                    onSave={docs.handleSaveDocument}
                    onCancel={docs.cancelEdit}
                  />
                  <DocumentTable
                    documents={docs.documents}
                    editorLoading={docs.editorLoading}
                    onNew={docs.handleNewDocument}
                    onEdit={docs.handleEditDocument}
                    onDelete={docs.handleDeleteDocument}
                    onUpload={docs.handleFileUpload}
                    onReindex={kb.handleTriggerIndexing}
                    indexing={kb.indexing}
                    loading={loading}
                  />
                </>
              )}

              {/* Chunk Review Interface */}
              {drawer.activePanel === ADMIN_PANELS.CHUNKS && (
                <ChunkReview
                  chunks={chunksState.chunks}
                  totalChunks={chunksState.totalChunks}
                  limit={chunksState.chunkLimit}
                  offset={chunksState.chunkOffset}
                  hasMore={chunksState.hasMore}
                  searchQuery={chunksState.chunkSearch}
                  loading={chunksState.chunksLoading}
                  onSearchChange={chunksState.handleSearchChange}
                  onLimitChange={chunksState.handleLimitChange}
                  onPrevPage={chunksState.handlePrevPage}
                  onNextPage={chunksState.handleNextPage}
                />
              )}

              {/* System Prompt Configuration */}
              {drawer.activePanel === ADMIN_PANELS.PROMPT && (
                <SystemPromptEditor isOffline={isOffline} />
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
