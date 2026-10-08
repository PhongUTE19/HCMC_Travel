import React, { useState, useEffect } from 'react';
import ErrorMessage from '../ErrorMessage';
import SuccessMessage from '../SuccessMessage';
import { fetchSystemPrompt, updateSystemPrompt } from '../../services/adminApi';

export default function SystemPromptEditor() {
  const [prompt, setPrompt] = useState('');
  const [initialPrompt, setInitialPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadPrompt = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSystemPrompt();
      setPrompt(data.prompt || '');
      setInitialPrompt(data.prompt || '');
    } catch (err) {
      setError(err.message || 'Failed to load system prompt.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrompt();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('System prompt cannot be empty.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateSystemPrompt(prompt);
      setSuccess(result.message || 'System prompt updated successfully.');
      setInitialPrompt(result.prompt || prompt);
    } catch (err) {
      setError(err.message || 'Failed to update system prompt.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPrompt(initialPrompt);
    setError(null);
    setSuccess(null);
  };

  const isDirty = prompt !== initialPrompt;

  return (
    <div className="admin-panel">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">System Prompt Configuration</h3>
          <span className="panel-subtitle">
            Configure the assistant persona, grounding constraints, and answer instructions for Gemini.
          </span>
        </div>
      </div>

      <ErrorMessage message={error} />
      <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />

      {loading ? (
        <div className="empty-state">
          <span className="spinner"></span> Loading system prompt...
        </div>
      ) : (
        <form onSubmit={handleSave} className="prompt-editor-form">
          <div className="form-group">
            <label htmlFor="system-prompt-textarea">
              Active System Prompt (Persistent across restarts)
            </label>
            <textarea
              id="system-prompt-textarea"
              className="form-textarea prompt-textarea"
              rows={10}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter system prompt instructions..."
              disabled={saving}
              required
            />
          </div>

          <div className="editor-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !isDirty || !prompt.trim()}
            >
              {saving ? (
                <>
                  <span className="spinner"></span> Saving...
                </>
              ) : (
                '💾 Save System Prompt'
              )}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
              disabled={saving || !isDirty}
            >
              Discard Changes
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
