'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error';

interface ToastContextType {
  showSaved: () => void;
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('Saved');
  const [type, setType] = useState<ToastType>('success');

  const showToast = useCallback((msg: string, toastType: ToastType = 'success') => {
    setMessage(msg);
    setType(toastType);
    setVisible(true);
    const duration = toastType === 'error' ? 3000 : 1500;
    setTimeout(() => setVisible(false), duration);
  }, []);

  const showSaved = useCallback(() => {
    showToast('Saved', 'success');
  }, [showToast]);

  const isError = type === 'error';

  return (
    <ToastContext.Provider value={{ showSaved, showToast }}>
      {children}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-sm rounded-full shadow-lg ${
          isError ? 'bg-red-700' : 'bg-slate-800'
        }`}>
          {isError ? (
            <svg
              className="w-4 h-4 text-red-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
          {message}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
