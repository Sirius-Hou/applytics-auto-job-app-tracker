import type { ReactNode } from 'react';
import { Briefcase, GearSix, Plus } from '@phosphor-icons/react';
import type { AppView } from '../../controllers/types';

type NavigationItem = {
  view: 'list' | 'add' | 'settings';
  label: string;
  icon: typeof Briefcase;
};

const navigation: NavigationItem[] = [
  { view: 'list', label: 'My Applications', icon: Briefcase },
  { view: 'add', label: 'Add Application', icon: Plus },
  { view: 'settings', label: 'Settings', icon: GearSix },
];

export function AppShell({
  view,
  navigate,
  toast,
  error,
  children,
}: {
  view: AppView;
  navigate: (view: NavigationItem['view']) => void;
  toast: string;
  error: string;
  children: ReactNode;
}) {
  const activeView = view === 'detail' ? 'list' : view;
  const navItems = (mobile = false) =>
    navigation.map((item) => {
      const Icon = item.icon;
      const active = activeView === item.view;
      return (
        <button
          key={item.view}
          className={`v2-nav-item${active ? ' is-active' : ''}`}
          onClick={() => navigate(item.view)}
          aria-current={active ? 'page' : undefined}
          title={item.label}
        >
          <Icon size={mobile ? 21 : 20} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
          <span>{item.label}</span>
        </button>
      );
    });

  return (
    <div className="v2-shell">
      <aside className="v2-sidebar" aria-label="Primary navigation">
        <button className="v2-brand" onClick={() => navigate('list')} aria-label="Applytics home">
          <span className="v2-brand__mark" aria-hidden="true">
            a.
          </span>
          <span className="v2-brand__wordmark">Applytics</span>
        </button>
        <nav className="v2-sidebar__nav">{navItems()}</nav>
      </aside>

      <header className="v2-mobile-header">
        <button className="v2-brand" onClick={() => navigate('list')} aria-label="Applytics home">
          <span className="v2-brand__mark" aria-hidden="true">
            a.
          </span>
          <span className="v2-brand__wordmark">Applytics</span>
        </button>
      </header>

      <main className="v2-main">
        {toast && (
          <div className="v2-toast" role="status">
            {toast}
          </div>
        )}
        {error && view !== 'list' && (
          <div role="alert" className="error">
            {error}
          </div>
        )}
        {children}
      </main>

      <nav className="v2-mobile-nav" aria-label="Primary navigation">
        {navItems(true)}
      </nav>
    </div>
  );
}
