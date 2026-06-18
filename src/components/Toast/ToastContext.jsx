import { createContext, useContext, useState, useCallback } from 'react';
import Toast from './Toast.jsx';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 1150);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && <Toast message={toast} />}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
