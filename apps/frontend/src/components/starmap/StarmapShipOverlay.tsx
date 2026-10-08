import type {
  StarmapContactDto,
  StarmapContactReason,
  StarmapContactStance,
} from '@swuniverse/shared';
import { STARMAP_CELL_SIZE } from '../../lib/starmap-render';

/** Contacts sharing one galaxy cell, drawn as a single marker. */
export interface StarmapContactBundle {
  key: string;
  x: number;
  y: number;
  contacts: StarmapContactDto[];
}

export const CONTACT_REASON_LABELS: Record<StarmapContactReason, string> = {
  OWN: 'Eigenes Schiff',
  ALLIANCE: 'Allianzschiff',
  SHARED_LIVE_POSITION: 'Geteilte Position',
};

export const CONTACT_STANCE_LABELS: Record<StarmapContactStance, string> = {
  FRIEND: 'Freund',
  NEUTRAL: 'Neutral',
  ENEMY: 'Feind',
};

const OWN_SHIP_COLOR = '#38bdf8';

export function bundleStarmapContacts(
  contacts: StarmapContactDto[],
): StarmapContactBundle[] {
  const bundles = new Map<string, StarmapContactBundle>();
  for (const contact of contacts) {
    const { x, y } = contact.galaxyCell;
    const key = `${x}|${y}`;
    const bundle = bundles.get(key) ?? { key, x, y, contacts: [] };
    bundle.contacts.push(contact);
    bundles.set(key, bundle);
  }
  return [...bundles.values()];
}

function markerLabel(bundle: StarmapContactBundle) {
  return bundle.contacts.length === 1
    ? `Schiff ${bundle.contacts[0].spacecraftName} bei ${bundle.key}`
    : `${bundle.contacts.length} Schiffe bei ${bundle.key}`;
}

interface StarmapShipOverlayProps {
  bundles: StarmapContactBundle[];
  selectedKey: string | null;
  onSelect: (bundle: StarmapContactBundle) => void;
}

/**
 * DOM overlay of ship markers in starmap world coordinates. The canvas places
 * it under its pan/zoom transform and exposes `--starmap-inverse-scale` so
 * markers keep a constant on-screen size.
 */
export function StarmapShipOverlay({
  bundles,
  selectedKey,
  onSelect,
}: StarmapShipOverlayProps) {
  if (bundles.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0" data-testid="starmap-ship-overlay">
      {bundles.map((bundle) => {
        const selected = bundle.key === selectedKey;
        const count = bundle.contacts.length;
        return (
          <button
            key={bundle.key}
            type="button"
            aria-label={markerLabel(bundle)}
            aria-pressed={selected}
            data-reason={bundle.contacts[0].reason}
            onClick={() => onSelect(bundle)}
            className="pointer-events-auto absolute flex h-5 min-w-5 items-center justify-center rounded-full border-2 px-1 text-[10px] font-bold text-slate-950 shadow"
            style={{
              left: (bundle.x - 0.5) * STARMAP_CELL_SIZE,
              top: (bundle.y - 0.5) * STARMAP_CELL_SIZE,
              transform:
                'translate(-50%, -50%) scale(var(--starmap-inverse-scale, 1))',
              backgroundColor: OWN_SHIP_COLOR,
              borderColor: selected ? '#ffffff' : '#0f172a',
            }}
          >
            {count > 1 ? <span>{count}</span> : <span aria-hidden="true">▲</span>}
          </button>
        );
      })}
    </div>
  );
}
