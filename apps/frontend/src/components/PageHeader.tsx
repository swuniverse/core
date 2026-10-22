import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface PageHeaderSegment {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  segments: PageHeaderSegment[];
  children?: ReactNode;
}

const DEFAULT_TITLE = 'SWU · Star Wars Universe';

/** Short confirmations use toasts; multi-line action results belong below PageHeader. */
export function PageHeader({ segments, children }: PageHeaderProps) {
  const lastSegment = segments.at(-1);

  useEffect(() => {
    document.title = lastSegment
      ? `${lastSegment.label} · Star Wars Universe`
      : DEFAULT_TITLE;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [lastSegment?.label]);

  const breadcrumb = segments.map((segment) => segment.label).join(' / ');

  return (
    <header className="space-y-3">
      <div className="border border-swu-border bg-black/30 px-3 py-1.5 font-mono text-xs text-swu-muted">
        <span aria-hidden="true">/ </span>
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          return (
            <span key={`${segment.label}-${index}`}>
              {segment.to && !isLast ? (
                <Link className="text-swu-primary hover:text-swu-accent" to={segment.to}>
                  {segment.label}
                </Link>
              ) : (
                <span className={isLast ? 'font-bold' : undefined}>{segment.label}</span>
              )}
              {!isLast && <span aria-hidden="true"> / </span>}
            </span>
          );
        })}
        <span className="sr-only">{`/ ${breadcrumb}`}</span>
      </div>
      {children}
    </header>
  );
}
