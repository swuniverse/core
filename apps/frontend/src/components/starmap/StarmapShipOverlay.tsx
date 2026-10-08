import type {
  StarmapContactDto,
  StarmapContactReason,
  StarmapContactStance,
  StarmapSystemGridDto,
  StarmapSystemListItemDto,
} from '@swuniverse/shared';
import {
  getInlineSystemPlacement,
  STARMAP_CELL_SIZE,
} from '../../lib/starmap-render';

/**
 * Contacts sharing one galaxy cell, or one system field while the system grid
 * is shown, drawn as a single marker.
 */
export interface StarmapContactBundle {
  key: string;
  /** Position text, e.g. `40|41` or `Kessel 12|13`. */
  label: string;
  /** Marker centre in starmap world pixels. */
  left: number;
  top: number;
  contacts: StarmapContactDto[];
}

/** A system whose grid is currently drawn on the starmap. */
export interface StarmapOpenSystemGrid {
  grid: Pick<StarmapSystemGridDto, 'system'>;
  anchor: Pick<StarmapSystemListItemDto, 'cx' | 'cy' | 'name'>;
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

/** Stance symbols, so the stance is recognisable without colour perception. */
export const CONTACT_STANCE_SYMBOLS: Record<StarmapContactStance, string> = {
  FRIEND: '+',
  NEUTRAL: '○',
  ENEMY: '×',
};

const OWN_SHIP_COLOR = '#38bdf8';
/** Uniform colour for alliance ships whose alliance has no colour set. */
export const DEFAULT_ALLIANCE_SHIP_COLOR = '#a78bfa';

function contactColor(contact: StarmapContactDto) {
  if (contact.reason === 'ALLIANCE') {
    return contact.alliance?.color ?? DEFAULT_ALLIANCE_SHIP_COLOR;
  }
  return OWN_SHIP_COLOR;
}

function markerPosition(
  contact: StarmapContactDto,
  openSystems: ReadonlyMap<number, StarmapOpenSystemGrid>,
): Omit<StarmapContactBundle, 'contacts'> {
  const { location } = contact;
  const open =
    location.scope === 'SYSTEM' ? openSystems.get(location.systemId) : undefined;
  if (location.scope === 'SYSTEM' && open) {
    const { grid, fieldPixelSize } = getInlineSystemPlacement(
      open.grid,
      open.anchor,
    );
    const position = `${location.x}|${location.y}`;
    return {
      key: `system:${location.systemId}:${position}`,
      label: `${open.anchor.name} ${position}`,
      left: grid.x + (location.x - 0.5) * fieldPixelSize,
      top: grid.y + (location.y - 0.5) * fieldPixelSize,
    };
  }
  const { x, y } = contact.galaxyCell;
  return {
    key: `${x}|${y}`,
    label: `${x}|${y}`,
    left: (x - 0.5) * STARMAP_CELL_SIZE,
    top: (y - 0.5) * STARMAP_CELL_SIZE,
  };
}

/**
 * Bundles contacts per galaxy cell. Contacts inside a system listed in
 * `openSystems` are bundled per system field at their system position instead.
 */
export function bundleStarmapContacts(
  contacts: StarmapContactDto[],
  openSystems: ReadonlyMap<number, StarmapOpenSystemGrid> = new Map(),
): StarmapContactBundle[] {
  const bundles = new Map<string, StarmapContactBundle>();
  for (const contact of contacts) {
    const position = markerPosition(contact, openSystems);
    const bundle = bundles.get(position.key) ?? { ...position, contacts: [] };
    bundle.contacts.push(contact);
    bundles.set(position.key, bundle);
  }
  return [...bundles.values()];
}

function markerLabel(bundle: StarmapContactBundle) {
  if (bundle.contacts.length > 1) {
    return `${bundle.contacts.length} Schiffe bei ${bundle.label}`;
  }
  const [contact] = bundle.contacts;
  const label = `Schiff ${contact.spacecraftName} bei ${bundle.label}`;
  if (contact.reason === 'OWN') return label;
  const origin = CONTACT_REASON_LABELS[contact.reason];
  return contact.stance
    ? `${label} (${origin}, ${CONTACT_STANCE_LABELS[contact.stance]})`
    : `${label} (${origin})`;
}

function markerSymbol(contact: StarmapContactDto) {
  return contact.stance ? CONTACT_STANCE_SYMBOLS[contact.stance] : '▲';
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
        const [first] = bundle.contacts;
        return (
          <button
            key={bundle.key}
            type="button"
            aria-label={markerLabel(bundle)}
            aria-pressed={selected}
            data-reason={first.reason}
            data-stance={count === 1 ? first.stance : undefined}
            onClick={() => onSelect(bundle)}
            className="pointer-events-auto absolute flex h-5 min-w-5 items-center justify-center rounded-full border-2 px-1 text-[10px] font-bold text-slate-950 shadow"
            style={{
              left: bundle.left,
              top: bundle.top,
              transform:
                'translate(-50%, -50%) scale(var(--starmap-inverse-scale, 1))',
              backgroundColor: contactColor(first),
              borderColor: selected ? '#ffffff' : '#0f172a',
            }}
          >
            {count > 1 ? (
              <span>{count}</span>
            ) : (
              <span aria-hidden="true">{markerSymbol(first)}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
