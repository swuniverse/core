import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { SpacecraftFieldContextDto } from '@swuniverse/shared';
import {
  planetThumbnail,
  starTileImage,
  systemTypeImage,
} from '../../lib/assets';
import { api } from '../../services/api';
import { ColonizationDialog } from './ColonizationDialog';
import { TransferDialog } from './TransferDialog';

type SectorScanResult = {
  field: {
    x: number;
    y: number;
    fieldType: { id: number; name: string };
    movementEnergyCost: number;
    damage: number;
    specialDamage: number;
    effects: string[];
    celestialObject: { name: string | null; classId: number | null } | null;
  };
};

export function FieldContextPanel({
  shipId,
  context,
  onUpdate,
  canColonize = false,
  onColonized,
  onLanded,
}: {
  shipId: number;
  context: SpacecraftFieldContextDto | null;
  onUpdate: () => Promise<void> | void;
  canColonize?: boolean;
  onColonized?: (colonyId: number) => void;
  onLanded?: (colonyId: number) => void;
}) {
  const [transfer, setTransfer] = useState<'TO_SHIP' | 'TO_COLONY' | null>(
    null,
  );
  const [leaving, setLeaving] = useState(false);
  const [scan, setScan] = useState<{
    result: SectorScanResult;
    energyCost: number;
  } | null>(null);
  const [message, setMessage] = useState<{
    colonyName: string;
    message: string | null;
  } | null>(null);
  const [colonizationOpen, setColonizationOpen] = useState(false);
  const [landing, setLanding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function scanSector() {
    setError(null);
    try {
      const result = await api.post<{
        result: SectorScanResult;
        energyCost: number;
      }>(`/spacecraft/${shipId}/sector-scan`, {});
      setScan(result);
      onUpdate();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Sektor-Scan fehlgeschlagen',
      );
    }
  }
  async function showMessage() {
    if (!context?.colony) return;
    setError(null);
    try {
      setMessage(
        await api.get<{ colonyName: string; message: string | null }>(
          `/spacecraft/${shipId}/communications/colony-message?colonyId=${context.colony.id}`,
        ),
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Koloniebotschaft nicht verfügbar',
      );
    }
  }

  async function landShip() {
    if (!context?.colony?.canLand || landing) return;
    setLanding(true);
    setError(null);
    try {
      await api.post(`/colonies/${context.colony.id}/ships/${shipId}/land`, {});
      onLanded?.(context.colony.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Landen fehlgeschlagen');
      setLanding(false);
    }
  }
  async function enterSystem() {
    setLeaving(true);
    setError(null);
    try {
      await api.post(`/spacecraft/${shipId}/enter-system`, {});
      await onUpdate();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'System konnte nicht betreten werden',
      );
    } finally {
      setLeaving(false);
    }
  }

  async function leaveSystem() {
    setLeaving(true);
    setError(null);
    try {
      await api.post(`/spacecraft/${shipId}/leave-system`, {});
      await onUpdate();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'System konnte nicht verlassen werden',
      );
    } finally {
      setLeaving(false);
    }
  }

  if (!context) return null;
  return (
    <section className="space-y-3 text-xs">
      <div className="border border-swu-border bg-swu-surface">
        <div className="grid grid-cols-2 border-b border-swu-border">
          <h3 className="px-3 py-1 text-center font-bold text-swu-primary">
            Informationen
          </h3>
          <h3 className="border-l border-swu-border px-3 py-1 text-center font-bold text-swu-primary">
            Sternensystem
          </h3>
        </div>
        <div className="grid grid-cols-2">
          <div className="p-2">
            {context.information.canSectorScan && (
              <button
                type="button"
                onClick={() => void scanSector()}
                className="inline-flex items-center gap-1 text-swu-primary hover:text-swu-accent"
              >
                <img
                  src="/assets/buttons/lupe1.png"
                  alt=""
                  className="size-5"
                />
                Sektor {context.coordinates.x}|{context.coordinates.y} scannen
              </button>
            )}
            {!context.information.cartographyKnown && context.starSystem && (
              <span className="ml-2 text-swu-muted">
                System nicht kartographiert
              </span>
            )}
          </div>
          <div className="border-l border-swu-border p-2">
            {context.starSystem ? (
              <>
                <div className="text-swu-primary">
                  ✦ {context.starSystem.name}
                </div>
                <button
                  type="button"
                  disabled={leaving || !context.starSystem.canLeave}
                  title={context.starSystem.leaveReason ?? undefined}
                  onClick={() => void leaveSystem()}
                  className="inline-flex items-center gap-1 text-swu-muted hover:text-swu-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <img
                    src="/assets/buttons/sysleave1.png"
                    alt=""
                    className="size-5"
                  />
                  System verlassen
                </button>
              </>
            ) : context.information.entrySystem ? (
              <>
                <div className="flex items-center gap-1 text-swu-primary">
                  {context.information.entrySystem.systemTypeId != null && (
                    <img
                      src={systemTypeImage(
                        context.information.entrySystem.systemTypeId,
                      )}
                      alt=""
                      className="size-5 object-contain"
                    />
                  )}
                  {context.information.entrySystem.name}
                </div>
                <button
                  type="button"
                  disabled={leaving}
                  onClick={() => void enterSystem()}
                  className="inline-flex items-center gap-1 text-swu-muted hover:text-swu-accent disabled:opacity-40"
                >
                  <img
                    src="/assets/buttons/sysenter1.png"
                    alt=""
                    className="size-5"
                  />
                  einfliegen
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
      {canColonize && context.information.colonizationTarget && (
        <div className="border border-swu-border bg-swu-surface">
          <div className="flex items-center gap-2 border-b border-swu-border px-2 py-1">
            {context.information.colonizationTarget.classId != null && (
              <img
                src={planetThumbnail(context.information.colonizationTarget.classId)}
                alt=""
                className="size-5 object-contain"
              />
            )}
            <span className="text-swu-primary">
              {context.information.colonizationTarget.className ??
                context.information.colonizationTarget.name ??
                'Unbekannter Himmelskörper'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setColonizationOpen(true)}
            className="inline-flex items-center gap-1 px-2 py-1 text-swu-primary hover:text-swu-accent"
          >
            ◉{' '}
            {context.information.colonizationTarget.isAbandoned
              ? 'Ruinen übernehmen'
              : 'Kolonie gründen'}
          </button>
        </div>
      )}
      {context.colony && (
        <div className="border border-swu-border bg-swu-surface">
          <h3 className="border-b border-swu-border px-3 py-1 text-center font-bold text-swu-primary">
            {context.colony.planetName}
          </h3>
          <div className="flex items-center gap-2 p-2">
            <div className="flex flex-1 items-center gap-1">
              {context.colony.isOwn ? (
                <Link
                  to={`/colonies?selected=${context.colony.id}`}
                  className="text-swu-primary hover:text-swu-accent"
                >
                  ◉ {context.colony.name}
                </Link>
              ) : (
                <span className="text-swu-primary">
                  ◉ {context.colony.name}
                </span>
              )}
              <button
                type="button"
                onClick={() => void showMessage()}
                title="Koloniebotschaft"
                className="border border-swu-border px-1 text-swu-primary"
              >
                ?
              </button>
            </div>
            <button
              type="button"
              onClick={() => setTransfer('TO_COLONY')}
              title="Zur Kolonie entladen"
            >
              <img
                src="/assets/buttons/b_down1.png"
                alt="Entladen"
                className="size-5"
              />
            </button>
            <button
              type="button"
              onClick={() => setTransfer('TO_SHIP')}
              title="Von Kolonie verladen"
            >
              <img
                src="/assets/buttons/b_up1.png"
                alt="Verladen"
                className="size-5"
              />
            </button>
            {context.colony.canLand && (
              <button
                type="button"
                disabled={landing}
                onClick={() => void landShip()}
                title="Schiff auf der Kolonie landen"
                className="inline-flex items-center gap-1 border border-swu-border px-1.5 py-0.5 text-swu-primary hover:border-swu-accent disabled:opacity-40"
              >
                <img
                  src="/assets/buttons/dock1.png"
                  alt=""
                  className="size-5"
                />
                Landen
              </button>
            )}
          </div>
        </div>
      )}
      {colonizationOpen && context.information.colonizationTarget && (
        <ColonizationDialog
          shipId={shipId}
          celestialObjectId={
            context.information.colonizationTarget.celestialObjectId
          }
          planetName={context.information.colonizationTarget.name}
          isRuins={context.information.colonizationTarget.isAbandoned}
          onClose={() => setColonizationOpen(false)}
          onColonized={(colonyId) => onColonized?.(colonyId)}
        />
      )}
      {scan && <SectorScanDialog scan={scan} onClose={() => setScan(null)} />}
      {message && (
        <Dialog
          title={message.colonyName}
          label="Koloniebotschaft"
          onClose={() => setMessage(null)}
        >
          <p className="whitespace-pre-wrap">
            {message.message ?? 'Keine Koloniebotschaft hinterlegt.'}
          </p>
        </Dialog>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}
      {transfer && context.colony && (
        <TransferDialog
          shipId={shipId}
          colonyId={context.colony.id}
          colonyName={context.colony.name}
          direction={transfer}
          onClose={() => setTransfer(null)}
          onTransfer={onUpdate}
        />
      )}
    </section>
  );
}

function SectorScanDialog({
  scan,
  onClose,
}: {
  scan: { result: SectorScanResult; energyCost: number };
  onClose: () => void;
}) {
  const field = scan.result.field;
  const object = field.celestialObject;
  const image =
    object?.classId != null
      ? planetThumbnail(object.classId)
      : starTileImage(field.fieldType.id);
  return (
    <Dialog title="Sektor-Scan" label="Sektor-Scan" onClose={onClose}>
      <div className="grid grid-cols-[64px_1fr] gap-3">
        <img src={image} alt="" className="h-14 w-14 object-contain" />
        <div>
          <h4 className="border-b border-swu-border pb-1 font-bold text-swu-primary">
            {object?.name ?? field.fieldType.name}
          </h4>
          <div className="mt-2 grid grid-cols-2 gap-y-1">
            <span className="text-swu-muted">Energiekosten</span>
            <span>{field.movementEnergyCost}</span>
            <span className="text-swu-muted">Schaden</span>
            <span className="inline-flex items-center gap-1">
              {field.specialDamage} ({field.damage})
              <img
                src="/assets/buttons/info2.png"
                alt="Direkter Einflugschaden bei Deflektorausfall"
                title="Direkter Einflugschaden (Schaden bei Deflektorausfall)"
                className="size-4"
              />
            </span>
          </div>
          {field.effects.length > 0 && (
            <div className="mt-2 border-t border-swu-border pt-2 text-swu-muted">
              Effekte: {field.effects.join(', ')}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function Dialog({
  title,
  label,
  onClose,
  children,
}: {
  title: string;
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
    >
      <section className="w-full max-w-md border border-swu-border bg-swu-bg p-3 text-xs">
        <header className="mb-2 flex justify-between border-b border-swu-border pb-2">
          <h3 className="font-bold text-swu-primary">{title}</h3>
          <button type="button" onClick={onClose}>
            Schließen
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
