import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, motion } from 'motion/react';
import { categories, arrangements, statuses, terms, type Application } from '../shared/contracts';
import { label, request, Field, MultiSelect, Select } from './components/common';
import { Add } from './components/Add';
import { Detail } from './components/Detail';
import { Auth, type SessionUser } from './components/Auth';
import { Settings } from './components/Settings';
import './style.css';
type Row = {
  id: string;
  company: string | null;
  title: string | null;
  status: string;
  customStatusName: string | null;
  appliedAt: string;
  category: string;
  term: string;
  workArrangement: string;
  countryCode: string | null;
  updatedAt: string;
};
type TourTargetRect = { top: number; left: number; width: number; height: number };
function App() {
  const isDemoPage = ['/demo', '/demo/'].includes(window.location.pathname);
  const [view, setView] = useState<'list' | 'add' | 'detail' | 'settings'>('list');
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<Application | null>(null);
  const [revision, setRevision] = useState(0);
  const [stats, setStats] = useState({ total: 0, month: 0, year: 0 });
  const [statCard, setStatCard] = useState(0);
  const [statDirection, setStatDirection] = useState(1);
  const [toast, setToast] = useState('');
  const [demoTourStep, setDemoTourStep] = useState(isDemoPage ? 1 : 0);
  const [tourTargetRect, setTourTargetRect] = useState<TourTargetRect | null>(null);
  const run = useCallback(async (fn: () => Promise<void>) => {
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }, []);
  const clearSessionState = useCallback(() => {
    setDetail(null);
    setItems([]);
    setTotal(0);
    setStats({ total: 0, month: 0, year: 0 });
    setView('list');
  }, []);
  const restartFormal = useCallback(async () => {
    setUser(undefined);
    try {
      await request('/auth/logout', 'POST');
    } finally {
      clearSessionState();
      setUser(null);
    }
  }, [clearSessionState]);
  const restartDemo = useCallback(async () => {
    setUser(undefined);
    try {
      await request('/auth/logout', 'POST');
      clearSessionState();
      await request('/demo/reset', 'POST');
      setDemoTourStep(1);
    } finally {
      setUser(null);
    }
  }, [clearSessionState]);
  useEffect(() => {
    if (isDemoPage) {
      restartDemo().catch((cause) => {
        setError(cause instanceof Error ? cause.message : 'Could not reset the demo');
        setUser(null);
      });
      const restoreDemoSession = (event: PageTransitionEvent) => {
        if (!event.persisted) return;
        restartDemo().catch((cause) =>
          setError(cause instanceof Error ? cause.message : 'Could not reset the demo'),
        );
      };
      window.addEventListener('pageshow', restoreDemoSession);
      return () => window.removeEventListener('pageshow', restoreDemoSession);
    }
    restartFormal().catch(() => setUser(null));
    const restoreLoginScreen = (event: PageTransitionEvent) => {
      if (event.persisted) restartFormal().catch(() => setUser(null));
    };
    window.addEventListener('pageshow', restoreLoginScreen);
    return () => window.removeEventListener('pageshow', restoreLoginScreen);
  }, [isDemoPage, restartDemo, restartFormal]);
  useEffect(() => {
    if (view !== 'list' || !user) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setBusy(true);
      setError('');
      const params = new URLSearchParams({
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
        page: String(page),
        limit: String(limit),
      });
      request<{ items: Row[]; total: number }>('/applications?' + params)
        .then((r) => {
          if (!cancelled) {
            setItems(r.items);
            setTotal(r.total);
          }
        })
        .catch((e) => {
          if (!cancelled) {
            setError(e.message);
            setItems([]);
            setTotal(0);
          }
        })
        .finally(() => {
          if (!cancelled) setBusy(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filters, page, limit, view, revision, user]);
  useEffect(() => {
    if (view !== 'list' || !user) return;
    let cancelled = false;
    Promise.all([
      request<{ total: number }>('/applications?limit=1'),
      request<{ total: number }>('/applications?limit=1&appliedWithin=1m'),
      request<{ total: number }>('/applications?limit=1&appliedWithin=1y'),
    ])
      .then(([all, month, year]) => {
        if (!cancelled)
          setStats({
            total: all.total,
            month: month.total,
            year: year.total,
          });
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load totals');
      });
    return () => {
      cancelled = true;
    };
  }, [view, revision, user]);
  useEffect(() => {
    if (!isDemoPage || demoTourStep < 2) return;
    setTourTargetRect(null);
    window.setTimeout(() => {
      const target = document.querySelector('.demo-tour-target');
      target?.scrollIntoView({ block: 'center' });
      if (target) {
        const rect = target.getBoundingClientRect();
        setTourTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }
    });
  }, [demoTourStep, isDemoPage, view]);
  const filter = (k: string, v: string) => {
    setPage(1);
    setFilters({ ...filters, [k]: v });
  };
  const open = (id: string, fromTour = false) =>
    run(async () => {
      setDetail(await request<Application>('/applications/' + id));
      if (fromTour) setDemoTourStep(4);
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
          demo={isDemoPage}
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
      <aside className={demoTourStep === 6 ? 'demo-tour-sidebar' : undefined}>
        <a className="brand" href="#" onClick={() => setView('list')}>
          <span className="brand-main">
            <span className="logo">a.</span>
            <b>applytics</b>
          </span>
        </a>
        <button
          className={`${view === 'list' || view === 'detail' ? 'nav active' : 'nav'}${demoTourStep === 1 && view === 'list' ? ' demo-tour-target' : ''}`}
          onClick={() => setView('list')}
        >
          ▤ <span>My Applications</span>
        </button>
        <button
          className={`${view === 'add' ? 'nav active' : 'nav'}${demoTourStep === 6 ? ' demo-tour-target' : ''}`}
          onClick={() => {
            setError('');
            if (demoTourStep === 6) setDemoTourStep(7);
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
        {!isDemoPage && (
          <a className="nav nav-demo" href="/demo/">
            🚀 <span>Try Demo</span>
          </a>
        )}
      </aside>
      {isDemoPage && view === 'list' && demoTourStep >= 1 && demoTourStep <= 3 && (
        <div
          className={`demo-tour demo-tour-step-${demoTourStep}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-tour-title"
        >
          <div className="demo-tour-backdrop" />
          <div
            className="demo-tour-arrow"
            aria-hidden="true"
            style={
              demoTourStep === 3 && tourTargetRect
                ? {
                    top: tourTargetRect.top - 45,
                    left: tourTargetRect.left + tourTargetRect.width / 2,
                  }
                : undefined
            }
          >
            {demoTourStep === 1 ? '←' : '↓'}
          </div>
          <section
            className="demo-tour-card"
            style={
              demoTourStep === 3 && tourTargetRect
                ? {
                    top: Math.max(24, tourTargetRect.top - 245),
                    left: Math.min(
                      window.innerWidth - 440,
                      Math.max(20, tourTargetRect.left + tourTargetRect.width / 2 - 210),
                    ),
                    transform: 'none',
                  }
                : undefined
            }
          >
            <small>DEMO TOUR · {demoTourStep} OF 9</small>
            <h2 id="demo-tour-title">
              {demoTourStep === 1
                ? 'Your application history'
                : demoTourStep === 2
                  ? 'Find previous applications'
                  : 'Open an application'}
            </h2>
            <p>
              {demoTourStep === 1
                ? 'This is where you can view every application you have saved, including the role, company, status, location, and application date.'
                : demoTourStep === 2
                  ? 'Search and filter the jobs you have already applied to.'
                  : 'Select the first application to review its complete details.'}
            </p>
            {demoTourStep < 3 && (
              <button
                className="primary"
                autoFocus
                onClick={() => setDemoTourStep(demoTourStep + 1)}
              >
                Next
              </button>
            )}
          </section>
        </div>
      )}
      {isDemoPage && demoTourStep === 6 && (
        <div className="demo-tour demo-tour-step-6" role="dialog" aria-modal="true">
          <div className="demo-tour-backdrop" />
          <div
            className="demo-tour-arrow"
            aria-hidden="true"
            style={
              tourTargetRect
                ? {
                    top: tourTargetRect.top + tourTargetRect.height / 2 - 17,
                    left: tourTargetRect.left + tourTargetRect.width + 55,
                  }
                : undefined
            }
          >
            ←
          </div>
          <section
            className="demo-tour-card"
            style={
              tourTargetRect
                ? { top: Math.max(20, tourTargetRect.top + tourTargetRect.height / 2 - 95) }
                : undefined
            }
          >
            <small>DEMO TOUR · 6 OF 9</small>
            <h2>Try to add a new application</h2>
            <p>Select Add Application to try AI-assisted job description parsing.</p>
          </section>
        </div>
      )}
      {isDemoPage && demoTourStep === 10 && (
        <div className="demo-tour demo-tour-step-10" role="dialog" aria-modal="true">
          <div className="demo-tour-backdrop" />
          <section className="demo-tour-card">
            <small>DEMO COMPLETE</small>
            <h2>Enjoy exploring Applytics</h2>
            <p>Your sample application was added. Feel free to explore the rest of the app.</p>
            <div className="demo-complete-actions">
              <button onClick={() => run(restartDemo)}>Retry the tour</button>
              <button className="primary" onClick={() => setDemoTourStep(0)}>
                Continue exploring
              </button>
            </div>
          </section>
        </div>
      )}
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
            <section
              className={`panel filters-panel${demoTourStep === 2 ? ' demo-tour-target' : ''}`}
            >
              <div className="filters-header">
                <h2>Search for Jobs</h2>
                {Object.values(filters).some(Boolean) && (
                  <button
                    className="text-button"
                    onClick={() => {
                      setFilters({});
                      setPage(1);
                    }}
                  >
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
              <details
                className="advanced-filters"
                open={isDemoPage && demoTourStep >= 2 ? true : undefined}
              >
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
                      {items.map((a, index) => (
                        <tr key={a.id}>
                          <td>
                            <button
                              className={`row-link${demoTourStep === 3 && index === 0 ? ' demo-tour-target' : ''}`}
                              onClick={() => open(a.id, demoTourStep === 3 && index === 0)}
                            >
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
                              {a.customStatusName || label(a.status)}
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
                  onChange={(value) => {
                    setPage(1);
                    setLimit(Number(value));
                  }}
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
            demoTourStep={demoTourStep}
            advanceDemoTour={() => setDemoTourStep((step) => (step === 9 ? 0 : step + 1))}
            saved={(a) => {
              setRevision((v) => v + 1);
              if (demoTourStep === 9) {
                setDemoTourStep(10);
                setView('list');
                window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
                return;
              }
              setDetail(a);
              setToast('Application added to your list.');
              window.setTimeout(() => setToast(''), 3500);
              setView('detail');
            }}
          />
        ) : view === 'settings' ? (
          <Settings
            user={user}
            run={run}
            passwordChanged={() => {
              setToast('Password changed successfully.');
              window.setTimeout(() => setToast(''), 3500);
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
              demoTourStep={demoTourStep}
              advanceDemoTour={() => setDemoTourStep((step) => (step === 9 ? 0 : step + 1))}
              changed={(a) => {
                setDetail(a);
                setRevision((v) => v + 1);
              }}
              back={() => setView('list')}
              deleted={() => {
                setDetail(null);
                setRevision((value) => value + 1);
                setToast('Application deleted.');
                window.setTimeout(() => setToast(''), 3500);
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
