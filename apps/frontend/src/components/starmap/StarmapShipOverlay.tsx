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
import {
  CONTACT_REASON_LABELS,
  CONTACT_STANCE_LABELS,
  CONTACT_STANCE_SYMBOLS,
} from './starmap-contact-labels';

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

const OWN_SHIP_COLOR = '#38bdf8';
/** Uniform colour for alliance ships whose alliance has no colour set. */
export const DEFAULT_ALLIANCE_SHIP_COLOR = '#a78bfa';
/** Partner ships with a shared live position; also drawn with a dashed rim. */
export const SHARED_POSITION_SHIP_COLOR = '#2dd4bf';

function contactColor(contact: StarmapContactDto) {
  if (contact.reason === 'ALLIANCE') {
    return contact.alliance?.color ?? DEFAULT_ALLIANCE_SHIP_COLOR;
  }
  if (contact.reason === 'SHARED_LIVE_POSITION') {
    return SHARED_POSITION_SHIP_COLOR;
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

/** Symbol marking a bundle whose ships are visible for different reasons. */
export const MIXED_ORIGIN_SYMBOL = '◆';

const REASON_ORDER: StarmapContactReason[] = [
  'OWN',
  'ALLIANCE',
  'SHARED_LIVE_POSITION',
];
const STANCE_ORDER: StarmapContactStance[] = ['FRIEND', 'NEUTRAL', 'ENEMY'];

/** Origins and stances present in a bundle, in a fixed display order. */
function bundleSummary(bundle: StarmapContactBundle) {
  const reasons = new Set(bundle.contacts.map((contact) => contact.reason));
  const stances = new Set(bundle.contacts.map((contact) => contact.stance));
  return {
    reasons: REASON_ORDER.filter((reason) => reasons.has(reason)),
    stances: STANCE_ORDER.filter((stance) => stances.has(stance)),
  };
}

/**
 * Accessible marker name. Names origin and stances whenever they are not just
 * the viewer's own ships, and flags bundles of mixed origin.
 */
function markerLabel(bundle: StarmapContactBundle) {
  const { reasons, stances } = bundleSummary(bundle);
  const count = bundle.contacts.length;
  const label =
    count > 1
      ? `${count} Schiffe bei ${bundle.label}`
      : `Schiff ${bundle.contacts[0].spacecraftName} bei ${bundle.label}`;
  const stanceTexts = stances.map((stance) => CONTACT_STANCE_LABELS[stance]);
  if (reasons.length > 1) {
    const origins = reasons.map((reason) => CONTACT_REASON_LABELS[reason]);
    const details = [origins.join(', '), stanceTexts.join(', ')].filter(
      Boolean,
    );
    return `${label} (gemischt: ${details.join('; ')})`;
  }
  if (reasons[0] === 'OWN') return label;
  const details = [CONTACT_REASON_LABELS[reasons[0]], ...stanceTexts];
  return `${label} (${details.join(', ')})`;
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
        const { reasons, stances } = bundleSummary(bundle);
        const mixed = reasons.length > 1;
        const stanceSymbols = stances
          .map((stance) => CONTACT_STANCE_SYMBOLS[stance])
          .join('');
        return (
          <button
            key={bundle.key}
            type="button"
            aria-label={markerLabel(bundle)}
            aria-pressed={selected}
            data-reason={mixed ? 'MIXED' : first.reason}
            data-stance={stances.length > 0 ? stances.join(' ') : undefined}
            onClick={() => onSelect(bundle)}
            className="pointer-events-auto absolute flex h-5 min-w-5 items-center justify-center gap-0.5 rounded-full border-2 px-1 text-[10px] font-bold text-slate-950 shadow"
            style={{
              left: bundle.left,
              top: bundle.top,
              transform:
                'translate(-50%, -50%) scale(var(--starmap-inverse-scale, 1))',
              backgroundColor: contactColor(first),
              borderColor: selected ? '#ffffff' : '#0f172a',
              borderStyle:
                first.reason === 'SHARED_LIVE_POSITION' ? 'dashed' : 'solid',
            }}
          >
            {count > 1 && <span>{count}</span>}
            {mixed && <span aria-hidden="true">{MIXED_ORIGIN_SYMBOL}</span>}
            {stanceSymbols ? (
              <span aria-hidden="true">{stanceSymbols}</span>
            ) : (
              count === 1 && <span aria-hidden="true">▲</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
