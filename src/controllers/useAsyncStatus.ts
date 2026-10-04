import { useCallback, useState } from 'react';
import type { Runner } from '../components/common';

export function useAsyncStatus() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const run: Runner = useCallback(async (fn) => {
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, error, run, setBusy, setError };
}
