import { createContext, useContext, useState, useCallback, useRef } from 'react';
import Toast from './Toast.jsx';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timeoutRef = useRef(null);

  const showToast = useCallback((message, options = {}) => {
    const { action, duration = 1150 } = options;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ message, action, duration });
    timeoutRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  const dismissToast = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          action={toast.action}
          duration={toast.duration}
          onDismiss={dismissToast}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
