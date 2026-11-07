import { ArrowLeft, ArrowRight, CaretRight, FunnelSimple } from '@phosphor-icons/react';
import { arrangements, categories, statuses, terms } from '../../../shared/contracts';
import type { ApplicationListRow } from '../../controllers/types';
import { Field, label, MultiSelect, Select } from '../common';
import { EmptyState, FilterToken, SkeletonRows, StatusIndicator } from './Primitives';

type Stats = { total: number; month: number; year: number };

type Props = {
  items: ApplicationListRow[];
  total: number;
  page: number;
  setPage: (page: number) => void;
  limit: number;
  filters: Record<string, string>;
  stats: Stats;
  busy: boolean;
  error: string;
  filter: (key: string, value: string) => void;
  clearFilters: () => void;
  changeLimit: (value: string) => void;
  open: (id: string) => void;
  addApplication: () => void;
};

const filterNames: Record<string, string> = {
  title: 'Job title',
  company: 'Company',
  country: 'Country',
  category: 'Employment type',
  status: 'Status',
  workArrangement: 'Work setting',
  term: 'Term',
  appliedWithin: 'Applied within',
  from: 'From',
  to: 'To',
  year: 'Year',
  location: 'Location',
};

const optionLabels: Record<string, string> = {
  US: 'United States',
  CA: 'Canada',
  CN: 'China',
  '1d': 'Past day',
  '1w': 'Past week',
  '1m': 'Past month',
  '2m': 'Past 2 months',
  '3m': 'Past 3 months',
  '6m': 'Past 6 months',
  '1y': 'Past year',
  '2y': 'Past 2 years',
};

const advancedKeys = new Set([
  'status',
  'workArrangement',
  'term',
  'appliedWithin',
  'from',
  'to',
  'year',
  'location',
]);

function displayFilterValue(value: string) {
  return optionLabels[value] ?? label(value);
}

export function MyApplications(props: Props) {
  const {
    items,
    total,
    page,
    setPage,
    limit,
    filters,
    stats,
    busy,
    error,
    filter,
    clearFilters,
    changeLimit,
    open,
    addApplication,
  } = props;

  const activeFilters = Object.entries(filters).filter(([key, value]) => key !== 'sort' && value);
  const advancedCount = activeFilters.filter(([key]) => advancedKeys.has(key)).length;
  const hasFilters = activeFilters.length > 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const removeToken = (key: string, selectedValue: string) => {
    const current = filters[key] || '';
    const values = current.split(',').filter(Boolean);
    filter(
      key,
      values.length > 1 ? values.filter((value) => value !== selectedValue).join(',') : '',
    );
  };

  return (
    <div className="v2-page v2-applications-page">
      <header className="v2-page-header">
        <h1>My Applications</h1>
      </header>

      <section className="v2-summary-strip" aria-label="Application statistics">
        {[
          ['Total Applications', stats.total, 'All records'],
          ['Past Month', stats.month, 'Applied within 30 days'],
          ['Past Year', stats.year, 'Applied within 12 months'],
        ].map(([name, value, detail]) => (
          <div className="v2-summary-item" key={name}>
            <span>{name}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </div>
        ))}
      </section>

      {error && (
        <div role="alert" className="v2-page-error">
          {error}
        </div>
      )}

      <section className="v2-filter-region" aria-labelledby="search-applications-title">
        <div className="v2-filter-region__heading">
          <div>
            <span className="v2-kicker">Find a record</span>
            <h2 id="search-applications-title">Search applications</h2>
          </div>
          {hasFilters && (
            <button className="v2-text-button" onClick={clearFilters}>
              Clear all
            </button>
          )}
        </div>

        <div className="v2-primary-filters">
          <Field
            name="Job Title"
            value={filters.title || ''}
            onChange={(value) => filter('title', value)}
          />
          <Field
            name="Company"
            value={filters.company || ''}
            onChange={(value) => filter('company', value)}
          />
          <MultiSelect
            name="Country"
            value={filters.country || ''}
            options={['US', 'CA', 'CN']}
            labels={{ US: 'United States (US)', CA: 'Canada (CA)', CN: 'China (CN)' }}
            onChange={(value) => filter('country', value)}
          />
          <MultiSelect
            name="Employment Type"
            value={filters.category || ''}
            options={categories}
            onChange={(value) => filter('category', value)}
          />
        </div>

        <details className="v2-advanced-filters">
          <summary>
            <span>
              <FunnelSimple size={16} aria-hidden="true" /> Advanced filters
            </span>
            {advancedCount > 0 && <strong>{advancedCount} active</strong>}
          </summary>
          <div className="v2-advanced-filters__grid">
            <MultiSelect
              name="Application Status"
              value={filters.status || ''}
              options={statuses}
              onChange={(value) => filter('status', value)}
            />
            <MultiSelect
              name="Work Setting"
              value={filters.workArrangement || ''}
              options={arrangements}
              onChange={(value) => filter('workArrangement', value)}
            />
            <MultiSelect
              name="Recruiting Term"
              value={filters.term || ''}
              options={terms}
              onChange={(value) => filter('term', value)}
            />
            <Select
              name="Applied Within"
              value={filters.appliedWithin || ''}
              options={['1d', '1w', '1m', '2m', '3m', '6m', '1y', '2y']}
              labels={optionLabels}
              all
              onChange={(value) => filter('appliedWithin', value)}
            />
            <Field
              name="Date From"
              type="date"
              value={filters.from || ''}
              onChange={(value) => filter('from', value)}
            />
            <Field
              name="Date To"
              type="date"
              value={filters.to || ''}
              onChange={(value) => filter('to', value)}
            />
            <Field
              name="Application Year"
              type="number"
              value={filters.year || ''}
              onChange={(value) => filter('year', value)}
            />
            <Field
              name="Location / State / Province"
              value={filters.location || ''}
              onChange={(value) => filter('location', value)}
            />
          </div>
        </details>

        {hasFilters && (
          <div className="v2-active-filters" aria-label="Active filters">
            {activeFilters.flatMap(([key, rawValue]) =>
              rawValue
                .split(',')
                .filter(Boolean)
                .map((value) => (
                  <FilterToken
                    key={`${key}-${value}`}
                    label={`${filterNames[key] ?? key}: ${displayFilterValue(value)}`}
                    onRemove={() => removeToken(key, value)}
                  />
                )),
            )}
          </div>
        )}
      </section>

      <section className="v2-results" aria-labelledby="application-results-title">
        <div className="v2-results-toolbar">
          <div>
            <h2 id="application-results-title">Application history</h2>
            <span aria-live="polite">
              {busy
                ? 'Loading applications…'
                : `${total} ${total === 1 ? 'application' : 'applications'}`}
            </span>
          </div>
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
            onChange={(value) => filter('sort', value)}
          />
        </div>

        {(busy || items.length > 0) && (
          <>
            <div className="v2-table-wrap">
              <table className="v2-application-table">
                <thead>
                  <tr>
                    <th>Role / Company</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Application date</th>
                    <th>
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {busy ? (
                    <SkeletonRows />
                  ) : (
                    items.map((application) => (
                      <tr key={application.id}>
                        <td>
                          <button className="v2-row-title" onClick={() => open(application.id)}>
                            {application.title || 'Untitled position'}
                          </button>
                          <span>{application.company || 'Company not provided'}</span>
                        </td>
                        <td>{label(application.category)}</td>
                        <td>
                          <strong>{application.countryCode || '—'}</strong>
                          <span>{label(application.workArrangement)}</span>
                        </td>
                        <td>
                          <StatusIndicator status={application.status} />
                        </td>
                        <td>{new Date(application.appliedAt).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="v2-icon-button"
                            aria-label={`View ${application.title || 'application'} details`}
                            onClick={() => open(application.id)}
                          >
                            <CaretRight size={18} weight="bold" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="v2-mobile-records">
              {busy
                ? Array.from({ length: 5 }, (_, index) => (
                    <div className="v2-mobile-record v2-mobile-record--skeleton" key={index}>
                      <span className="v2-skeleton v2-skeleton--title" />
                      <span className="v2-skeleton v2-skeleton--company" />
                      <span className="v2-skeleton v2-skeleton--date" />
                    </div>
                  ))
                : items.map((application) => (
                    <article className="v2-mobile-record" key={application.id}>
                      <div className="v2-mobile-record__top">
                        <button onClick={() => open(application.id)}>
                          {application.title || 'Untitled position'}
                        </button>
                        <StatusIndicator status={application.status} />
                      </div>
                      <strong>{application.company || 'Company not provided'}</strong>
                      <div className="v2-mobile-record__meta">
                        <span>{label(application.category)}</span>
                        <span>
                          {application.countryCode || '—'} · {label(application.workArrangement)}
                        </span>
                        <span>{new Date(application.appliedAt).toLocaleDateString()}</span>
                      </div>
                      <button
                        className="v2-icon-button"
                        aria-label={`View ${application.title || 'application'} details`}
                        onClick={() => open(application.id)}
                      >
                        <CaretRight size={18} weight="bold" aria-hidden="true" />
                      </button>
                    </article>
                  ))}
            </div>
          </>
        )}

        {!busy && items.length === 0 && (
          <EmptyState
            title={
              hasFilters
                ? 'No applications match these filters'
                : 'Your application ledger is ready'
            }
            description={
              hasFilters
                ? 'Remove one or more filters to broaden this view.'
                : 'Add your first job posting to begin tracking applications and status history.'
            }
            action={
              hasFilters
                ? { label: 'Clear filters', onClick: clearFilters }
                : { label: 'Add Application', onClick: addApplication }
            }
          />
        )}

        <div className="v2-pagination">
          <button
            className="v2-button v2-button--secondary"
            disabled={page === 1 || busy}
            onClick={() => setPage(page - 1)}
          >
            <ArrowLeft size={16} aria-hidden="true" /> Previous
          </button>
          <span>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </span>
          <Select
            name="Per page"
            value={String(limit)}
            options={['10', '25', '50', '100']}
            onChange={changeLimit}
          />
          <button
            className="v2-button v2-button--secondary"
            disabled={page * limit >= total || busy}
            onClick={() => setPage(page + 1)}
          >
            Next <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
