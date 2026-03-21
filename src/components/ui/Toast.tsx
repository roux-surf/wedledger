'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

interface ToastState {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
}

interface ToastContextType {
  showSaved: () => void;
  showError: (message: string) => void;
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
  const [toast, setToast] = useState<ToastState>({ visible: false, message: 'Saved', type: 'success' });
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((message: string, type: 'success' | 'error') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ visible: true, message, type });
    timerRef.current = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), type === 'error' ? 3000 : 1500);
  }, []);

  const showSaved = useCallback(() => show('Saved', 'success'), [show]);
  const showError = useCallback((message: string) => show(message, 'error'), [show]);

  return (
    <ToastContext.Provider value={{ showSaved, showError }}>
      {children}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 ${
          toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-sm rounded-full shadow-lg ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-slate-800'
        }`}>
          {toast.type === 'error' ? (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {toast.message}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
