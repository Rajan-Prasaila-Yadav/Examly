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
      className="fixed top-6 right-6 z-[999999] flex flex-col gap-3 max-w-md w-[calc(100vw-3rem)] sm:w-[400px] pointer-events-none"
    >
      {toasts.map((toast) => {
        let bg = 'bg-slate-900 text-white border-slate-700 shadow-2xl shadow-slate-950/60';
        let Icon = Info;
        let iconColor = 'text-sky-300';
        let badgeBg = 'bg-white/15';

        if (toast.type === 'success') {
          bg = 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400/80 shadow-2xl shadow-emerald-900/50';
          Icon = CheckCircle2;
          iconColor = 'text-white';
          badgeBg = 'bg-white/20';
        } else if (toast.type === 'error') {
          bg = 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-rose-400/80 shadow-2xl shadow-rose-900/50';
          Icon = AlertCircle;
          iconColor = 'text-white';
          badgeBg = 'bg-white/20';
        } else if (toast.type === 'loading') {
          bg = 'bg-slate-900 text-white border-brand-500 shadow-2xl shadow-slate-950/80 ring-2 ring-brand-500/30';
          Icon = Loader2;
          iconColor = 'text-brand-400 animate-spin';
          badgeBg = 'bg-brand-500/20';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border-2 backdrop-blur-2xl transition-all duration-300 flex items-start gap-3.5 shadow-2xl animate-in slide-in-from-top-4 fade-in ${bg}`}
          >
            <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${badgeBg}`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <h4 className="text-xs sm:text-sm font-extrabold leading-tight text-white tracking-wide">
                {toast.title}
              </h4>
              {toast.message && (
                <p className="text-xs text-white/90 mt-1 leading-relaxed break-words font-medium">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-all shrink-0 cursor-pointer"
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
