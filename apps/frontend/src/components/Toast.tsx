import { createContext, useCallback, useContext, useRef, useState } from 'react';

type Severity = 'error' | 'warning';

interface Toast {
  id: number;
  message: string;
  severity: Severity;
}

interface ToastContextValue {
  error: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast requires ToastProvider');
  return ctx;
}

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const add = useCallback((message: string, severity: Severity) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, message, severity }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  const value: ToastContextValue = {
    error: useCallback((msg: string) => add(msg, 'error'), [add]),
    warning: useCallback((msg: string) => add(msg, 'warning'), [add]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className={`pointer-events-auto cursor-pointer px-4 py-2 rounded border text-xs max-w-sm shadow-lg animate-slide-in-right ${
              t.severity === 'error'
                ? 'bg-red-900/90 border-red-500/60 text-red-200'
                : 'bg-yellow-900/90 border-yellow-500/60 text-yellow-200'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
