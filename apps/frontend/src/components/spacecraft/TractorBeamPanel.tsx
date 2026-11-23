import type { SpacecraftTractorPeerDto } from '@swuniverse/shared';
import { shipImage } from '../../lib/assets';

/** STU `control_right.twig` tractor block: only while a beam holds or is held. */
export function TractorBeamPanel({
  holding,
  heldBy,
  isStation,
  deflectorHealthy,
  onDeactivate,
  onDock,
  onEscape,
}: {
  holding: SpacecraftTractorPeerDto | null;
  heldBy: SpacecraftTractorPeerDto | null;
  isStation: boolean;
  deflectorHealthy: boolean;
  onDeactivate: () => void;
  onDock: () => void;
  onEscape: () => void;
}) {
  const peer = holding ?? heldBy;
  if (!peer) return null;
  const button =
    'border border-swu-border bg-swu-surface px-2 py-0.5 text-[10px] hover:bg-white/5';
  return (
    <section
      aria-labelledby="tractor-panel-heading"
      className="rounded-lg border border-swu-border bg-swu-surface p-3 text-xs"
    >
      <h3
        id="tractor-panel-heading"
        className="mb-2 border-b border-swu-border/60 pb-1 text-center font-bold text-swu-primary"
      >
        <img
          src="/assets/buttons/trak.png"
          alt=""
          aria-hidden="true"
          className="mr-1 inline size-5 align-middle"
        />
        Traktorstrahl
      </h3>
      <div className="divide-y divide-swu-border/60 overflow-hidden rounded-md border border-swu-border/60">
        <p className="p-2">
          {holding ? 'Gerichtet auf' : 'Gehalten von'}: {peer.name}
        </p>
        <div className="flex items-center justify-between gap-2 p-2">
          <span className="flex items-center gap-2">
            {holding && isStation && (
              <button
                type="button"
                onClick={onDock}
                aria-label="Gehaltenes Schiff andocken"
                title="Gehaltenes Schiff andocken"
              >
                <img
                  src="/assets/buttons/dock1.png"
                  alt=""
                  aria-hidden="true"
                />
              </button>
            )}
            <img
              src={shipImage(peer.shipClassId, peer.shipClassKey)}
              alt={peer.name}
              className="max-h-10"
            />
          </span>
          {holding ? (
            <button type="button" onClick={onDeactivate} className={button}>
              deaktivieren
            </button>
          ) : (
            deflectorHealthy && (
              <button type="button" onClick={onEscape} className={button}>
                Fluchtversuch
              </button>
            )
          )}
        </div>
      </div>
    </section>
  );
}
