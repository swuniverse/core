import { Link } from 'react-router-dom';
import type {
  SpacecraftAlertState,
  StarmapContactDto,
} from '@swuniverse/shared';
import {
  CONTACT_REASON_LABELS,
  CONTACT_STANCE_LABELS,
  type StarmapContactBundle,
} from './StarmapShipOverlay';

const ALERT_LABELS: Record<SpacecraftAlertState, string> = {
  GREEN: 'Grün',
  YELLOW: 'Gelb',
  RED: 'Rot',
};

const STATUS_LABELS: Record<string, string> = {
  IDLE: 'Bereit',
  IN_FLIGHT: 'Im Flug',
  IN_COMBAT: 'Im Kampf',
};

interface StarmapContactPanelProps {
  bundle: StarmapContactBundle;
  systemName: (systemId: number) => string | null;
  onClose: () => void;
}

function locationText(
  contact: StarmapContactDto,
  systemName: (systemId: number) => string | null,
) {
  const { location } = contact;
  if (location.scope === 'GALAXY') return `${location.x}|${location.y}`;
  const name = systemName(location.systemId) ?? `System ${location.systemId}`;
  return `${name} · ${location.x}|${location.y}`;
}

/** Shows exactly the data the server delivered for the selected marker. */
export function StarmapContactPanel({
  bundle,
  systemName,
  onClose,
}: StarmapContactPanelProps) {
  const title = `Schiffe auf Feld ${bundle.key}`;
  return (
    <section
      aria-label={title}
      className="rounded-lg border border-swu-border bg-swu-surface p-3 space-y-2"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-swu-muted">{title}</h4>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-swu-muted hover:text-swu-primary"
          aria-label="Auswahl schließen"
        >
          ×
        </button>
      </div>
      <ul className="space-y-2">
        {bundle.contacts.map((contact) => (
          <li
            key={contact.spacecraftId}
            className="border-t border-swu-border pt-2 first:border-t-0 first:pt-0 space-y-0.5"
          >
            <p className="text-xs font-bold text-swu-primary">
              {contact.reason === 'OWN' ? (
                <Link
                  to={`/spacecraft/${contact.spacecraftId}`}
                  className="text-swu-accent hover:underline"
                >
                  {contact.spacecraftName}
                </Link>
              ) : (
                contact.spacecraftName
              )}
            </p>
            <p className="text-xs text-swu-muted">
              {CONTACT_REASON_LABELS[contact.reason]}
              {contact.stance && ` · ${CONTACT_STANCE_LABELS[contact.stance]}`}
            </p>
            {contact.ownerName && (
              <p className="text-xs text-swu-muted">{contact.ownerName}</p>
            )}
            {contact.alliance && (
              <p className="text-xs text-swu-muted">{contact.alliance.name}</p>
            )}
            <p className="text-xs text-swu-muted">
              {locationText(contact, systemName)}
            </p>
            {contact.management && (
              <>
                <p className="text-xs text-swu-muted">
                  {STATUS_LABELS[contact.management.status] ??
                    contact.management.status}
                </p>
                <p className="text-xs text-swu-muted">
                  Alarmstufe {ALERT_LABELS[contact.management.alertState]}
                </p>
                <p className="text-xs text-swu-muted">
                  Hülle {contact.management.hull}/{contact.management.hullMax}
                </p>
                <p className="text-xs text-swu-muted">
                  Crew {contact.management.crew}/{contact.management.crewMax}
                </p>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
