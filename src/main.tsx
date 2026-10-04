import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, motion } from 'motion/react';
import { categories, arrangements, statuses, terms, type Application } from '../shared/contracts';
import { label, request, Field, MultiSelect, Select } from './components/common';
import { Add } from './components/Add';
import { Detail } from './components/Detail';
import { Auth } from './components/Auth';
import { Settings } from './components/Settings';
import { useApplicationList } from './controllers/useApplicationList';
import { useAsyncStatus } from './controllers/useAsyncStatus';
import { useNotifications } from './controllers/useNotifications';
import { useSession } from './controllers/useSession';
import type { AppView } from './controllers/types';
import './style.css';
function App() {
  const [view, setView] = useState<AppView>('list');
  const { user, setUser } = useSession();
  const { busy, error, run, setBusy, setError } = useAsyncStatus();
  const [detail, setDetail] = useState<Application | null>(null);
  const [revision, setRevision] = useState(0);
  const { items, total, page, setPage, limit, filters, stats, filter, clearFilters, changeLimit } =
    useApplicationList({ view, user, revision, setBusy, setError });
  const [statCard, setStatCard] = useState(0);
  const [statDirection, setStatDirection] = useState(1);
  const { toast, notify } = useNotifications();
  const open = (id: string) =>
    run(async () => {
      setDetail(await request<Application>('/applications/' + id));
      setView('detail');
    });
  const showStatistic = (next: number) => {
    setStatDirection(next > statCard || (statCard === 2 && next === 0) ? 1 : -1);
    setStatCard(next);
  };
  const statisticCards = [
    { label: 'TOTAL APPLICATIONS', value: stats.total, detail: 'All application records' },
    { label: 'PAST MONTH', value: stats.month, detail: 'Added within 30 days' },
    { label: 'PAST YEAR', value: stats.year, detail: 'Added within 12 months' },
  ];
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
    <div className="shell">
      <aside>
        <a className="brand" href="#" onClick={() => setView('list')}>
          <span className="brand-main">
            <span className="logo">a.</span>
            <b>applytics</b>
          </span>
        </a>
        <button
          className={view === 'list' || view === 'detail' ? 'nav active' : 'nav'}
          onClick={() => setView('list')}
        >
          ▤ <span>My Applications</span>
        </button>
        <button
          className={view === 'add' ? 'nav active' : 'nav'}
          onClick={() => {
            setError('');
            setView('add');
          }}
        >
          ＋ <span>Add Application</span>
        </button>
        <button
          className={view === 'settings' ? 'nav nav-settings active' : 'nav nav-settings'}
          onClick={() => setView('settings')}
        >
          ⚙ <span>Settings</span>
        </button>
      </aside>
      <main>
        {toast && <div className="toast">{toast}</div>}
        {error && (
          <div role="alert" className="error">
            {error}
          </div>
        )}
        {view === 'list' ? (
          <>
            <div className="title-row">
              <div>
                <h1>My Applications</h1>
              </div>
            </div>
            <div className="stats-carousel" aria-label="Application statistics">
              <button
                className="carousel-arrow"
                aria-label="Previous statistic"
                onClick={() => {
                  setStatDirection(-1);
                  setStatCard((statCard + 2) % 3);
                }}
              >
                ‹
              </button>
              <div className="carousel-content">
                <AnimatePresence initial={false} custom={statDirection} mode="popLayout">
                  {statisticCards[statCard] && (
                    <motion.article
                      key={statCard}
                      custom={statDirection}
                      variants={{
                        enter: (direction: number) => ({
                          x: direction * 110,
                          rotateY: direction * -18,
                          opacity: 0,
                        }),
                        center: { x: 0, rotateY: 0, opacity: 1 },
                        exit: (direction: number) => ({
                          x: direction * -110,
                          rotateY: direction * 18,
                          opacity: 0,
                        }),
                      }}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                    >
                      {(() => {
                        const card = statisticCards[statCard];
                        return (
                          <>
                            <span>{card.label}</span>
                            <strong>{card.value}</strong>
                            <small>{card.detail}</small>
                            <div
                              className="carousel-dots"
                              aria-label={`Statistic ${statCard + 1} of 3`}
                            >
                              {[0, 1, 2].map((index) => (
                                <button
                                  key={index}
                                  className={index === statCard ? 'active' : ''}
                                  aria-label={`Show statistic ${index + 1}`}
                                  onClick={() => showStatistic(index)}
                                />
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </motion.article>
                  )}
                </AnimatePresence>
              </div>
              <button
                className="carousel-arrow"
                aria-label="Next statistic"
                onClick={() => {
                  setStatDirection(1);
                  setStatCard((statCard + 1) % 3);
                }}
              >
                ›
              </button>
            </div>
            <section className="panel filters-panel">
              <div className="filters-header">
                <h2>Search for Jobs</h2>
                {Object.values(filters).some(Boolean) && (
                  <button className="text-button" onClick={clearFilters}>
                    Clear all
                  </button>
                )}
              </div>
              <div className="filters primary-filters">
                <Field
                  name="Job Title"
                  value={filters.title || ''}
                  onChange={(v) => filter('title', v)}
                />
                <Field
                  name="Company"
                  value={filters.company || ''}
                  onChange={(v) => filter('company', v)}
                />
                <MultiSelect
                  name="Country"
                  value={filters.country || ''}
                  options={['US', 'CA', 'CN']}
                  labels={{ US: 'United States (US)', CA: 'Canada (CA)', CN: 'China (CN)' }}
                  onChange={(v) => filter('country', v)}
                />
                <MultiSelect
                  name="Employment Type"
                  value={filters.category || ''}
                  options={categories}
                  onChange={(v) => filter('category', v)}
                />
              </div>
              <details className="advanced-filters">
                <summary>Advanced Filters</summary>
                <div className="filters">
                  <MultiSelect
                    name="Application Status"
                    value={filters.status || ''}
                    options={statuses}
                    onChange={(v) => filter('status', v)}
                  />
                  <MultiSelect
                    name="Work Setting"
                    value={filters.workArrangement || ''}
                    options={arrangements}
                    onChange={(v) => filter('workArrangement', v)}
                  />
                  <MultiSelect
                    name="Term"
                    value={filters.term || ''}
                    options={terms}
                    onChange={(v) => filter('term', v)}
                  />
                  <Select
                    name="Applied Within"
                    value={filters.appliedWithin || ''}
                    options={['1d', '1w', '1m', '2m', '3m', '6m', '1y', '2y']}
                    labels={{
                      '1d': 'Past day',
                      '1w': 'Past week',
                      '1m': 'Past month',
                      '2m': 'Past 2 months',
                      '3m': 'Past 3 months',
                      '6m': 'Past 6 months',
                      '1y': 'Past year',
                      '2y': 'Past 2 years',
                    }}
                    all
                    onChange={(v) => filter('appliedWithin', v)}
                  />
                  <Field
                    name="Application Since"
                    type="date"
                    value={filters.from || ''}
                    onChange={(v) => filter('from', v)}
                  />
                  <Field
                    name="Application Until"
                    type="date"
                    value={filters.to || ''}
                    onChange={(v) => filter('to', v)}
                  />
                  <Field
                    name="Application Year"
                    type="number"
                    value={filters.year || ''}
                    onChange={(v) => filter('year', v)}
                  />
                  <Field
                    name="Location / State / Province"
                    value={filters.location || ''}
                    onChange={(v) => filter('location', v)}
                  />
                </div>
              </details>
            </section>
            <section className="panel records">
              <div className="section-heading">
                <h2>Application history</h2>
                <div className="history-controls">
                  <span>{busy ? 'Loading…' : `${total} records`}</span>
                  <Select
                    name="Sort By"
                    value={filters.sort || 'recently_updated'}
                    options={[
                      'recently_updated',
                      'newest_applied',
                      'oldest_applied',
                      'company_az',
                      'status',
                    ]}
                    labels={{
                      recently_updated: 'Recently Updated',
                      newest_applied: 'Newest Applied',
                      oldest_applied: 'Oldest Applied',
                      company_az: 'Company A–Z',
                      status: 'Application Status',
                    }}
                    onChange={(v) => filter('sort', v)}
                  />
                </div>
              </div>
              {items.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ROLE / COMPANY</th>
                        <th>EMPLOYMENT TYPE</th>
                        <th>LOCATION</th>
                        <th>STATUS</th>
                        <th>APPLICATION TIME</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <button className="row-link" onClick={() => open(a.id)}>
                              {a.title || 'Untitled position'}
                            </button>
                            <div className="muted">{a.company || 'Company not provided'}</div>
                          </td>
                          <td>{label(a.category)}</td>
                          <td>
                            {a.countryCode || '—'}
                            <div className="muted">{label(a.workArrangement)}</div>
                          </td>
                          <td>
                            <span className={'badge ' + a.status.toLowerCase()}>
                              {label(a.status)}
                            </span>
                          </td>
                          <td>{new Date(a.appliedAt).toLocaleDateString()}</td>
                          <td>
                            <button
                              className="view-button"
                              aria-label={`View ${a.title || 'application'} details`}
                              onClick={() => open(a.id)}
                            >
                              ›
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">
                  <div>▤</div>
                  <h3>
                    {busy ? 'Loading your ledger…' : 'A little organization. A lot of possibility.'}
                  </h3>
                  <p>
                    {error
                      ? 'Connect your local PostgreSQL database to load applications.'
                      : 'No applications match this view. Add a posting or adjust your filters.'}
                  </p>
                </div>
              )}
              <div className="pagination">
                <button disabled={page === 1 || busy} onClick={() => setPage(page - 1)}>
                  ← Previous
                </button>
                <span>
                  Page {page} of {Math.max(1, Math.ceil(total / limit))}
                </span>
                <Select
                  name="Per page"
                  value={String(limit)}
                  options={['10', '25', '50', '100']}
                  onChange={changeLimit}
                />
                <button disabled={page * limit >= total || busy} onClick={() => setPage(page + 1)}>
                  Next →
                </button>
              </div>
            </section>
          </>
        ) : view === 'add' ? (
          <Add
            busy={busy}
            run={run}
            saved={(a) => {
              setDetail(a);
              setRevision((v) => v + 1);
              notify('Application added to your list.');
              setView('detail');
            }}
          />
        ) : view === 'settings' ? (
          <Settings
            user={user}
            run={run}
            passwordChanged={() => {
              notify('Password changed successfully.');
            }}
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
              changed={(a) => {
                setDetail(a);
                setRevision((v) => v + 1);
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
      </main>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
