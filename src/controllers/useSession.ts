import { useEffect, useState } from 'react';
import type { SessionUser } from './types';

export function useSession() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(async (response) =>
        setUser(response.ok ? ((await response.json()) as SessionUser) : null),
      )
      .catch(() => setUser(null));
  }, []);

  return { user, setUser };
}
