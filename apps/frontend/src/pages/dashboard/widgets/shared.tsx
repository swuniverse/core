import { Link } from 'react-router-dom';

export function StatTile({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: number;
  sub?: string;
  href?: string;
}) {
  const content = (
    <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 hover:border-swu-accent/40 transition-colors h-full">
      <div className="text-[10px] text-swu-muted uppercase tracking-wider">
        {label}
      </div>
      <div className="text-lg font-bold text-swu-accent font-mono">{value}</div>
      {sub && <div className="text-[10px] text-swu-muted">{sub}</div>}
    </div>
  );
  if (href) return <Link to={href}>{content}</Link>;
  return content;
}

export function SegmentedBar({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const segments = 10;
  const filled = Math.round((pct / 100) * segments);
  return (
    <div
      className="flex gap-px w-16 shrink-0"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 ${i < filled ? color : 'bg-swu-bg'} ${i === 0 ? 'rounded-l-sm' : ''} ${i === segments - 1 ? 'rounded-r-sm' : ''} border border-swu-border/30`}
        />
      ))}
    </div>
  );
}

export function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 h-full">
      <div className="text-[10px] text-swu-muted uppercase mb-2 tracking-wider">
        {title}
      </div>
      {children}
    </div>
  );
}

export function LimitRow({
  label,
  count,
  limit,
}: {
  label: string;
  count: number;
  limit: number;
}) {
  const atLimit = count >= limit;
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-swu-muted">{label}</span>
      <span
        className={`font-mono ${atLimit ? 'text-swu-warning' : 'text-swu-primary'}`}
      >
        {count}/{limit}
      </span>
    </div>
  );
}
