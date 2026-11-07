import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Application } from '../shared/contracts';
import { request } from './components/common';
import { Add } from './components/Add';
import { Detail } from './components/Detail';
import { Auth } from './components/Auth';
import { Settings } from './components/Settings';
import { AppShell } from './components/v2/AppShell';
import { MyApplications } from './components/v2/MyApplications';
import { useApplicationList } from './controllers/useApplicationList';
import { useAsyncStatus } from './controllers/useAsyncStatus';
import { useNotifications } from './controllers/useNotifications';
import { useSession } from './controllers/useSession';
import type { AppView } from './controllers/types';
import './style.css';
import './v2.css';

function App() {
  const [view, setView] = useState<AppView>('list');
  const { user, setUser } = useSession();
  const { busy, error, run, setBusy, setError } = useAsyncStatus();
  const [detail, setDetail] = useState<Application | null>(null);
  const [revision, setRevision] = useState(0);
  const list = useApplicationList({ view, user, revision, setBusy, setError });
  const { toast, notify } = useNotifications();

  const navigate = (nextView: 'list' | 'add' | 'settings') => {
    if (nextView === 'add') setError('');
    setView(nextView);
  };

  const open = (id: string) =>
    run(async () => {
      setDetail(await request<Application>('/applications/' + id));
      setView('detail');
    });

  const isPasswordResetPage = window.location.pathname === '/reset-password';
  if (isPasswordResetPage)
    return (
      <>
        {error && (
          <div role="alert" className="error auth-error">
            {error}
          </div>
        )}
        <Auth busy={busy} run={run} signedIn={setUser} />
      </>
    );

  if (user === undefined) return <div className="auth-loading">Loading Applytics…</div>;
  if (!user)
    return (
      <>
        {error && (
          <div role="alert" className="error auth-error">
            {error}
          </div>
        )}
        <Auth
          busy={busy}
          run={run}
          signedIn={(account) => {
            setError('');
            setUser(account);
          }}
        />
      </>
    );

  return (
    <AppShell view={view} navigate={navigate} toast={toast} error={error}>
      {view === 'list' ? (
        <MyApplications
          {...list}
          busy={busy}
          error={error}
          open={open}
          addApplication={() => navigate('add')}
        />
      ) : view === 'add' ? (
        <Add
          busy={busy}
          run={run}
          saved={(application) => {
            setDetail(application);
            setRevision((value) => value + 1);
            notify('Application added to your list.');
            setView('detail');
          }}
        />
      ) : view === 'settings' ? (
        <Settings
          user={user}
          run={run}
          passwordChanged={() => notify('Password changed successfully.')}
          signedOut={() => {
            setDetail(null);
            setView('list');
            setUser(null);
          }}
        />
      ) : (
        detail && (
          <Detail
            key={detail.id}
            data={detail}
            busy={busy}
            run={run}
            changed={(application) => {
              setDetail(application);
              setRevision((value) => value + 1);
            }}
            back={() => setView('list')}
            deleted={() => {
              setDetail(null);
              setRevision((value) => value + 1);
              notify('Application deleted.');
              setView('list');
            }}
          />
        )
      )}
    </AppShell>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
