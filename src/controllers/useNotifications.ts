import { useState } from 'react';

const toastDuration = 3500;

export function useNotifications() {
  const [toast, setToast] = useState('');

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), toastDuration);
  };

  return { toast, notify };
}
