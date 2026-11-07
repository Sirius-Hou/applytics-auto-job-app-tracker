import type { ReactNode } from 'react';
import { ArrowRight, X } from '@phosphor-icons/react';
import { label } from '../common';

export function StatusIndicator({ status }: { status: string }) {
  return (
    <span className={`v2-status v2-status--${status.toLowerCase()}`}>
      <span className="v2-status__dot" aria-hidden="true" />
      <span>{label(status)}</span>
    </span>
  );
}

export function FilterToken({ label: text, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button className="v2-filter-token" onClick={onRemove} aria-label={`Remove ${text} filter`}>
      <span>{text}</span>
      <X size={13} weight="bold" aria-hidden="true" />
    </button>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="v2-empty-state">
      <div className="v2-empty-state__mark" aria-hidden="true">
        a.
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <button className="v2-button v2-button--secondary" onClick={action.onClick}>
          {action.label}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <tr className="v2-skeleton-row" key={index} aria-hidden="true">
          <td>
            <span className="v2-skeleton v2-skeleton--title" />
            <span className="v2-skeleton v2-skeleton--company" />
          </td>
          <td>
            <span className="v2-skeleton v2-skeleton--short" />
          </td>
          <td>
            <span className="v2-skeleton v2-skeleton--short" />
          </td>
          <td>
            <span className="v2-skeleton v2-skeleton--status" />
          </td>
          <td>
            <span className="v2-skeleton v2-skeleton--date" />
          </td>
          <td />
        </tr>
      ))}
    </>
  );
}

export function Section({
  title,
  action,
  children,
  className = '',
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`v2-section ${className}`.trim()}>
      {(title || action) && (
        <div className="v2-section__header">
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
