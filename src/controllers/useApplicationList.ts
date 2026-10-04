import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { request } from '../components/common';
import type { AppView, ApplicationListRow, SessionUser } from './types';

type Options = {
  view: AppView;
  user: SessionUser | null | undefined;
  revision: number;
  setBusy: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string>>;
};

export function useApplicationList({ view, user, revision, setBusy, setError }: Options) {
  const [items, setItems] = useState<ApplicationListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({ total: 0, month: 0, year: 0 });

  useEffect(() => {
    if (view !== 'list' || !user) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setBusy(true);
      setError('');
      const params = new URLSearchParams({
        ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
        page: String(page),
        limit: String(limit),
      });
      request<{ items: ApplicationListRow[]; total: number }>('/applications?' + params)
        .then((result) => {
          if (!cancelled) {
            setItems(result.items);
            setTotal(result.total);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setError(error.message);
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
  }, [filters, page, limit, view, revision, user, setBusy, setError]);

  useEffect(() => {
    if (view !== 'list' || !user) return;
    let cancelled = false;
    Promise.all([
      request<{ total: number }>('/applications?limit=1'),
      request<{ total: number }>('/applications?limit=1&appliedWithin=1m'),
      request<{ total: number }>('/applications?limit=1&appliedWithin=1y'),
    ])
      .then(([all, month, year]) => {
        if (!cancelled) setStats({ total: all.total, month: month.total, year: year.total });
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load totals');
      });
    return () => {
      cancelled = true;
    };
  }, [view, revision, user, setError]);

  const filter = (key: string, value: string) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const changeLimit = (value: string) => {
    setPage(1);
    setLimit(Number(value));
  };

  return {
    items,
    total,
    page,
    setPage,
    limit,
    filters,
    setFilters,
    stats,
    filter,
    clearFilters,
    changeLimit,
  };
}
