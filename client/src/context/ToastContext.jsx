import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import ToastContainer from '../components/toast/ToastContainer';
import { TOAST_TYPES, TOAST_DURATIONS } from '../constants';

const ToastContext = createContext(null);

let toastSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = TOAST_TYPES.INFO, customDuration) => {
    if (!message) return null;

    const id = ++toastSeq;
    const duration = customDuration !== undefined
      ? customDuration
      : (TOAST_DURATIONS[type.toUpperCase()] ?? TOAST_DURATIONS.INFO);

    const newToast = { id, message, type, duration };
    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      const timer = setTimeout(() => {
        dismissToast(id);
      }, duration);
      timersRef.current.set(id, timer);
    }

    return id;
  }, [dismissToast]);

  const clearAllToasts = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  // Cleanup active timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const toast = {
    success: (msg, dur) => showToast(msg, TOAST_TYPES.SUCCESS, dur),
    error: (msg, dur) => showToast(msg, TOAST_TYPES.ERROR, dur),
    info: (msg, dur) => showToast(msg, TOAST_TYPES.INFO, dur),
    warning: (msg, dur) => showToast(msg, TOAST_TYPES.WARNING, dur),
    dismiss: dismissToast,
    clearAll: clearAllToasts,
  };

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, clearAllToasts, toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
