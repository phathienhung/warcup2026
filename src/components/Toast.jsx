import React, { useState, useCallback } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  const ToastContainer = () => {
    if (!toast) return null;
    return (
      <div className={`toast toast-${toast.type}`}>
        {toast.type === 'success' ? '✅ ' : '❌ '}
        {toast.message}
      </div>
    );
  };

  return { showToast, ToastContainer };
}

export default useToast;
