import type { ReactNode } from 'react';

export type ShipSymbolKind =
  | 'reactor'
  | 'energy'
  | 'shield'
  | 'weapon'
  | 'torpedo'
  | 'drive'
  | 'sensor'
  | 'computer'
  | 'special'
  | 'life-support'
  | 'module'
  | 'self-destruct';

export function ShipSymbol({
  kind,
  className = '',
}: {
  kind: ShipSymbolKind;
  className?: string;
}) {
  const paths: Record<ShipSymbolKind, ReactNode> = {
    reactor: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3a9 9 0 0 1 7.8 13.5M4.2 16.5A9 9 0 0 1 12 3m0 18a9 9 0 0 1-7.8-4.5" />
      </>
    ),
    energy: <path d="m13 2-9 12h7l-1 8 9-12h-7z" />,
    shield: <path d="M12 3 4 6v5c0 5 3.4 8.2 8 10 4.6-1.8 8-5 8-10V6z" />,
    weapon: (
      <>
        <path d="m4 20 6-6m4-4 6-6" />
        <path d="m14 4 6 6M4 10l6 6" />
      </>
    ),
    torpedo: (
      <>
        <path d="M4 12h12l4-4v8l-4-4H4z" />
        <path d="M7 9v6" />
      </>
    ),
    drive: (
      <>
        <path d="M4 12h11" />
        <path d="m11 6 6 6-6 6" />
        <path d="M4 7v10" />
      </>
    ),
    sensor: (
      <>
        <circle cx="12" cy="12" r="2" />
        <path d="M5 5a10 10 0 0 0 0 14m14 0a10 10 0 0 0 0-14M8 8a5.5 5.5 0 0 0 0 8m8 0a5.5 5.5 0 0 0 0-8" />
      </>
    ),
    computer: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M8 9h8M8 13h5M8 17h7" />
      </>
    ),
    special: (
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    ),
    'life-support': (
      <>
        <path d="M12 20s-7-4.2-7-10a3.5 3.5 0 0 1 6-2.4L12 9l1-1.4A3.5 3.5 0 0 1 19 10c0 5.8-7 10-7 10Z" />
        <path d="M8 12h8" />
      </>
    ),
    module: (
      <>
        <path d="M5 5h14v14H5z" />
        <path d="M9 5v14m6-14v14M5 9h14m-14 6h14" />
      </>
    ),
    'self-destruct': (
      <>
        <path d="M12 3 2.8 20h18.4z" />
        <path d="M12 9v4m0 3h.01" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths[kind]}
    </svg>
  );
}
