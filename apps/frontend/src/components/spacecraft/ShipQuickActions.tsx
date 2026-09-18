import { useState } from 'react';
import { api } from '../../services/api';
import { CommunicationDrawer } from './CommunicationDrawer';

interface ShipQuickActionsProps {
  shipId: number;
  onRefresh: () => void;
  onInfo: () => void;
  standby: boolean;
  onNavigation: () => void;
  onSensors: () => void;
}

type QuickAction = {
  label: string;
  icon: string;
  action?:
    'refresh' | 'info' | 'communication' | 'standby' | 'navigation' | 'sensors';
  target?: string;
  disabled?: boolean;
};

const ACTIONS: QuickAction[] = [
  { label: 'Aktualisieren', icon: 'update0.png', action: 'refresh' },
  { label: 'Schiffsinformationen', icon: 'info1.png', action: 'info' },
  { label: 'Kommunikation', icon: 'msg1.png', action: 'communication' },
  {
    label: 'Navigation und Karte',
    icon: 'map1.png',
    action: 'navigation',
  },
  { label: 'Sensoren', icon: 'lss_button1.png', action: 'sensors' },
  {
    label: 'Energieverbrauch minimieren',
    icon: 'shutdown1.png',
    action: 'standby',
  },
];

export function ShipQuickActions({
  shipId,
  onRefresh,
  onInfo,
  standby,
  onNavigation,
  onSensors,
}: ShipQuickActionsProps) {
  const [dialog, setDialog] = useState<'communication' | null>(null);

  function activate(action: QuickAction) {
    if (action.disabled) return;
    if (action.action === 'refresh') return onRefresh();
    if (action.action === 'info') return onInfo();
    if (action.action === 'navigation') return onNavigation();
    if (action.action === 'sensors') return onSensors();
    if (action.action === 'standby') {
      void api
        .patch(`/spacecraft/${shipId}/operating-mode`, {
          operatingMode: standby ? 'NORMAL' : 'STANDBY',
        })
        .then(onRefresh);
      return;
    }
    if (action.action === 'communication') {
      setDialog(action.action);
      return;
    }
    document
      .getElementById(action.target!)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      <div
        className="flex flex-wrap gap-1"
        role="toolbar"
        aria-label="Schiffsaktionen"
      >
        {ACTIONS.map((action, index) => (
          <button
            key={`${action.action ?? action.target ?? action.label}-${index}`}
            type="button"
            onClick={() => activate(action)}
            disabled={action.disabled}
            aria-pressed={action.action === 'standby' ? standby : undefined}
            className="rounded border border-swu-border bg-black/30 p-1 hover:border-swu-accent focus:outline-none focus:ring-1 focus:ring-swu-accent aria-pressed:border-amber-400 aria-pressed:bg-amber-950/30 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={
              action.disabled
                ? `${action.label} (nicht verfügbar)`
                : action.label
            }
            title={
              action.disabled
                ? `${action.label}: in SWU noch nicht verfügbar`
                : action.label
            }
          >
            <img
              src={`/assets/buttons/${action.icon}`}
              alt=""
              className="size-5 object-contain"
            />
          </button>
        ))}
      </div>

      {dialog === 'communication' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Kommunikation"
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDialog(null);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-swu-border bg-swu-bg p-3 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-swu-primary">
                Kommunikation
              </h2>
              <button
                type="button"
                autoFocus
                onClick={() => setDialog(null)}
                className="text-xs text-swu-muted hover:text-swu-primary"
              >
                Schließen
              </button>
            </div>
            <CommunicationDrawer
              shipId={shipId}
              onClose={() => setDialog(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
