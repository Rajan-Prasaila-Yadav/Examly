// apps/web/src/lib/toast-context.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, Loader2, X, Sparkles } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => string;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
  loading: (title: string, message?: string) => string;
  dismissToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<Omit<Toast, 'id'>>) => void;
  promise: <T>(
    promise: Promise<T>,
    msgs: { loading: string; success: string | ((data: T) => string); error?: string | ((err: any) => string) },
  ) => Promise<T>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 4000): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: Toast = { id, type, title, message, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]);

      const effectiveDuration = duration > 0 ? duration : type === 'loading' ? 6000 : 4000;
      setTimeout(() => {
        dismissToast(id);
      }, effectiveDuration);

      return id;
    },
    [dismissToast],
  );

  const updateToast = useCallback(
    (id: string, updates: Partial<Omit<Toast, 'id'>>) => {
      setToasts((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            const updated = { ...t, ...updates };
            const effectiveDuration = updated.duration ?? (updated.type === 'loading' ? 6000 : 4000);
            setTimeout(() => {
              dismissToast(id);
            }, effectiveDuration);
            return updated;
          }
          return t;
        }),
      );
    },
    [dismissToast],
  );

  const success = useCallback((title: string, message?: string) => showToast('success', title, message, 4000), [showToast]);
  const error = useCallback((title: string, message?: string) => showToast('error', title, message, 5000), [showToast]);
  const info = useCallback((title: string, message?: string) => showToast('info', title, message, 4000), [showToast]);
  const loading = useCallback((title: string, message?: string) => showToast('loading', title, message, 6000), [showToast]);

  const promise = useCallback(
    async <T,>(
      prom: Promise<T>,
      msgs: { loading: string; success: string | ((data: T) => string); error?: string | ((err: any) => string) },
    ): Promise<T> => {
      const toastId = loading(msgs.loading);
      try {
        const result = await prom;
        const successMsg = typeof msgs.success === 'function' ? msgs.success(result) : msgs.success;
        updateToast(toastId, {
          type: 'success',
          title: successMsg,
          message: undefined,
          duration: 4000,
        });
        return result;
      } catch (err: any) {
        const errorMsg =
          typeof msgs.error === 'function'
            ? msgs.error(err)
            : msgs.error || err.response?.data?.message || err.message || 'An error occurred';
        updateToast(toastId, {
          type: 'error',
          title: errorMsg,
          message: undefined,
          duration: 5000,
        });
        throw err;
      }
    },
    [loading, updateToast],
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        success,
        error,
        info,
        loading,
        dismissToast,
        updateToast,
        promise,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toasts: [],
      showToast: () => '',
      success: () => '',
      error: () => '',
      info: () => '',
      loading: () => '',
      dismissToast: () => {},
      updateToast: () => {},
      promise: async <T,>(p: Promise<T>) => p,
    };
  }
  return context;
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-5 right-5 z-[999999] flex flex-col gap-3 max-w-md w-[calc(100vw-2.5rem)] sm:w-96 pointer-events-none"
    >
      {toasts.map((toast) => {
        let bg = 'bg-slate-900 text-white border-slate-700 shadow-2xl shadow-slate-950/60';
        let Icon = Info;
        let iconColor = 'text-sky-400';

        if (toast.type === 'success') {
          bg = 'bg-slate-900 text-white border-emerald-500/60 shadow-2xl shadow-emerald-950/50';
          Icon = CheckCircle2;
          iconColor = 'text-emerald-400';
        } else if (toast.type === 'error') {
          bg = 'bg-slate-900 text-white border-rose-500/60 shadow-2xl shadow-rose-950/50';
          Icon = AlertCircle;
          iconColor = 'text-rose-400';
        } else if (toast.type === 'loading') {
          bg = 'bg-slate-900 text-white border-brand-500/60 shadow-2xl shadow-brand-950/50';
          Icon = Loader2;
          iconColor = 'text-brand-400 animate-spin';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border-2 backdrop-blur-2xl transition-all duration-300 flex items-start gap-3.5 transform translate-y-0 opacity-100 ${bg}`}
          >
            <div className="p-1 rounded-xl bg-white/10 shrink-0 mt-0.5">
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <h4 className="text-xs sm:text-sm font-bold leading-tight text-white tracking-wide">
                {toast.title}
              </h4>
              {toast.message && (
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed break-words font-medium">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all shrink-0"
              title="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
