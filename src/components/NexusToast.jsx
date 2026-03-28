/**
 * Lightweight toast notification system for NexusOS.
 * Usage: import { showToast } from '@/components/NexusToast';
 *        showToast('Operation complete', 'success');
 *        showToast('Integration failed — check Admin Settings', 'error');
 */
import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

/**
 * @typedef {'success' | 'error' | 'warning' | 'info'} ToastType
 * @typedef {{ id: number, message: string, type: ToastType, duration: number }} ToastItem
 */

/** @type {(toast: ToastItem) => void} */
let _addToast = () => {};

/**
 * @param {string} message
 * @param {ToastType} [type]
 * @param {number} [duration]
 */
export function showToast(message, type = 'info', duration = 5000) {
  _addToast({ id: Date.now() + Math.random(), message, type, duration });
}

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: { color: 'var(--live)', bg: 'var(--live-bg)', border: 'var(--live-b)' },
  error: { color: 'var(--danger)', bg: 'var(--danger-bg)', border: 'var(--danger-b)' },
  warning: { color: 'var(--warn)', bg: 'var(--warn-bg)', border: 'var(--warn-b)' },
  info: { color: 'var(--info)', bg: 'var(--info-bg)', border: 'var(--info-b)' },
};

function Toast({ toast, onDismiss }) {
  const cfg = COLORS[toast.type] || COLORS.info;
  const Icon = ICONS[toast.type] || Info;

  useEffect(() => {
    if (toast.duration > 0) {
      const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', borderRadius: 'var(--r-md)',
      background: cfg.bg, border: `0.5px solid ${cfg.border}`,
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      animation: 'slideIn 0.2s ease-out',
      maxWidth: 400,
    }}>
      <Icon size={14} style={{ color: cfg.color, flexShrink: 0 }} />
      <span style={{ color: 'var(--t0)', fontSize: 11, flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)',
        padding: 2, flexShrink: 0,
      }}>
        <X size={12} />
      </button>
    </div>
  );
}

export default function NexusToastContainer() {
  /** @type {[ToastItem[], React.Dispatch<React.SetStateAction<ToastItem[]>>]} */
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    setToasts(prev => [...prev.slice(-4), toast]); // max 5 visible
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    _addToast = addToast;
    return () => { _addToast = () => {}; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', top: 56, right: 16, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 6,
      pointerEvents: 'auto',
    }}>
      {toasts.map(t => <Toast key={t.id} toast={t} onDismiss={dismiss} />)}
    </div>
  );
}
