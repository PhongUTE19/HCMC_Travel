import React from 'react';
import { useSystemPrompt } from '../../hooks';
import { useToast } from '../../context/ToastContext';
import { UI_LABELS } from '../../constants';

export default function SystemPromptEditor() {
  const { toast } = useToast();
  const {
    prompt,
    setPrompt,
    loading,
    saving,
    isDirty,
    handleSave,
    handleReset,
    handleResetToDefault,
  } = useSystemPrompt({
    onError: toast.error,
    onSuccess: toast.success,
  });

  return (
    <div>
      {loading ? (
        <div className="empty-state">
          <span className="spinner"></span> {UI_LABELS.SYSTEM_PROMPT_EDITOR.LOADING}
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label htmlFor="system-prompt-textarea">
              {UI_LABELS.SYSTEM_PROMPT_EDITOR.ACTIVE_PROMPT_LABEL}
            </label>
            <textarea
              id="system-prompt-textarea"
              className="form-textarea"
              rows={10}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={UI_LABELS.SYSTEM_PROMPT_EDITOR.TEXTAREA_PLACEHOLDER}
              disabled={saving}
              required
            />
          </div>

          <div className="row-layout">
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
