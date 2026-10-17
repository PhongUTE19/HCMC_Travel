import React, { useState, useEffect } from 'react';
import ErrorMessage from '../ErrorMessage';
import SuccessMessage from '../SuccessMessage';
import { fetchSystemPrompt, updateSystemPrompt, resetSystemPrompt } from '../../services/adminApi';
import { UI_LABELS, APP_MESSAGES } from '../../constants';

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
      setError(err.message || APP_MESSAGES.ERROR.LOAD_PROMPT_FAILED);
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
      setError(APP_MESSAGES.ERROR.PROMPT_EMPTY);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await updateSystemPrompt(prompt);
      setSuccess(result.message || APP_MESSAGES.SUCCESS.PROMPT_UPDATED);
      setInitialPrompt(result.prompt || prompt);
    } catch (err) {
      setError(err.message || APP_MESSAGES.ERROR.UPDATE_PROMPT_FAILED);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPrompt(initialPrompt);
    setError(null);
    setSuccess(null);
  };

  const handleResetToDefault = async () => {
    if (!window.confirm(UI_LABELS.SYSTEM_PROMPT_EDITOR.RESET_CONFIRMATION)) {
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await resetSystemPrompt();
      setPrompt(result.prompt);
      setInitialPrompt(result.prompt);
      setSuccess(result.message || APP_MESSAGES.SUCCESS.PROMPT_RESET);
    } catch (err) {
      setError(err.message || APP_MESSAGES.ERROR.UPDATE_PROMPT_FAILED);
    } finally {
      setSaving(false);
    }
  };

  const isDirty = prompt !== initialPrompt;

  return (
    <div className="admin-panel">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">{UI_LABELS.SYSTEM_PROMPT_EDITOR.TITLE}</h3>
          <span className="panel-subtitle">
            {UI_LABELS.SYSTEM_PROMPT_EDITOR.SUBTITLE}
          </span>
        </div>
      </div>

      <ErrorMessage message={error} />
      <SuccessMessage message={success} onDismiss={() => setSuccess(null)} />

      {loading ? (
        <div className="empty-state">
          <span className="spinner"></span> {UI_LABELS.SYSTEM_PROMPT_EDITOR.LOADING}
        </div>
      ) : (
        <form onSubmit={handleSave} className="prompt-editor-form">
          <div className="form-group">
            <label htmlFor="system-prompt-textarea">
              {UI_LABELS.SYSTEM_PROMPT_EDITOR.ACTIVE_PROMPT_LABEL}
            </label>
            <textarea
              id="system-prompt-textarea"
              className="form-textarea prompt-textarea"
              rows={10}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={UI_LABELS.SYSTEM_PROMPT_EDITOR.TEXTAREA_PLACEHOLDER}
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
                  <span className="spinner"></span> {UI_LABELS.SYSTEM_PROMPT_EDITOR.SAVING_BTN}
                </>
              ) : (
                UI_LABELS.SYSTEM_PROMPT_EDITOR.SAVE_BTN
              )}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
              disabled={saving || !isDirty}
            >
              {UI_LABELS.SYSTEM_PROMPT_EDITOR.DISCARD_BTN}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResetToDefault}
              disabled={saving}
              title="Reset prompt back to system default configuration"
            >
              {UI_LABELS.SYSTEM_PROMPT_EDITOR.RESET_DEFAULT_BTN}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
