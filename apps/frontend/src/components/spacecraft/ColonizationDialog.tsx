import { useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import { colonyFieldTileImage } from '../../lib/assets';
import { SettlementBadge, type SwuSettlementAssessment } from '../../lib/settlement-rating';
import { BONUS_MARKER_FRAME_CLASS, BonusMarkerBadge } from '../../lib/bonus-markers';

type SwuZoneSlot = 1 | 2 | 3;

type SwuColonizationProposal = {
  zoneSlot: SwuZoneSlot;
  label: string;
  primaryBiome: string | null;
  secondaryBiome: string | null;
  temperatureRangeK: [number, number] | null;
  seedQuality: 'JA' | 'OPT' | 'GAP';
  colonizable: boolean;
  previewSurface: string[][] | null;
  bonusMarkers?: Array<{
    type: string;
    layer: 'SURFACE' | 'UNDERGROUND';
    x: number;
    y: number;
    emoji: string;
    label: string;
    effect: string;
  }>;
  solarOutputTJ: number | null;
  settlement?: SwuSettlementAssessment | null;
  ores?: Array<{
    commodityId: number;
    name: string;
    tier: 'rich' | 'trace';
    sources: number;
  }>;
};

type Check = {
  canColonize: boolean;
  reasons: string[];
  target: { reclaimed?: boolean } | null;
  surface: {
    width: number;
    fields: Array<{
      fieldIndex: number;
      fieldType: number;
      terrainTileId: number | null;
      layer: string | null;
      selectable: boolean;
    }>;
  } | null;
  swu?: {
    archetype: string;
    rotation: 'rotating' | 'tidal-locked';
    tidalLocked: boolean;
    dayNightSwitchMinutes: number | null;
    terminatorShiftHours?: number | null;
    aurodiumDeposit?: { min: number; max: number };
    proposals: SwuColonizationProposal[];
  } | null;
};

const SEED_QUALITY_LABEL: Record<SwuColonizationProposal['seedQuality'], string> = {
  JA: 'Seed: gesichert',
  OPT: 'Seed: eingeschränkt',
  GAP: 'Kein Seed-Feld',
};

/** Zonenkarten: ab 780px nebeneinander (feste Breite 520px, horizontal scrollbar/mit
 * Pfeilen falls nicht alle passen), darunter ein reines Links-Rechts-Karussell (1 Karte,
 * volle Breite). Beides ist dieselbe scrollende Leiste - nur die Kartenbreite ändert sich. */
function SwuZoneProposals({
  proposals,
  aurodiumDeposit,
  selected,
  onSelect,
}: {
  proposals: SwuColonizationProposal[];
  aurodiumDeposit?: { min: number; max: number };
  selected: SwuZoneSlot | null;
  onSelect: (slot: SwuZoneSlot) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  function scrollByCard(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>('[data-zone-card]');
    const step = (card?.offsetWidth ?? track.clientWidth) + 12;
    track.scrollBy({ left: direction * step, behavior: 'smooth' });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Vorherige Zone"
        onClick={() => scrollByCard(-1)}
        className="absolute left-0 top-1/2 z-10 -translate-y-1/2 border border-swu-border bg-swu-bg/90 px-1.5 py-3 text-swu-primary hover:border-swu-accent"
      >
        ‹
      </button>
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-7 py-1"
      >
        {proposals.map((proposal) => {
          const isSelected = selected === proposal.zoneSlot;
          return (
            <article
              key={proposal.zoneSlot}
              data-zone-card
              className={`w-full shrink-0 snap-start border min-[780px]:w-[520px] ${
                proposal.colonizable
                  ? isSelected
                    ? 'border-swu-accent bg-swu-surface'
                    : 'border-swu-border bg-swu-surface/60'
                  : 'border-swu-border/50 bg-black/30 opacity-50'
              }`}
            >
              <button
                type="button"
                disabled={!proposal.colonizable}
                onClick={() => onSelect(proposal.zoneSlot)}
                className="w-full p-3 text-left disabled:cursor-not-allowed"
              >
                <header className="mb-2 flex items-center justify-between gap-2 border-b border-swu-border/50 pb-1">
                  <span className="text-sm font-bold text-swu-primary">
                    {proposal.label}
                  </span>
                  <span className="flex items-center gap-2">
                    {proposal.settlement && (
                      <SettlementBadge settlement={proposal.settlement} />
                    )}
                    {isSelected && <span className="text-swu-accent">✓ gewählt</span>}
                  </span>
                </header>
                <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1">
                  <dt className="text-swu-muted">Oberfläche</dt>
                  <dd className="text-swu-primary">
                    {proposal.primaryBiome ?? 'Unbekannt'}
                    {proposal.secondaryBiome ? ` · ${proposal.secondaryBiome}` : ''}
                  </dd>
                  {proposal.settlement && (
                    <>
                      <dt className="text-swu-muted">Bedingungen</dt>
                      <dd className="text-swu-primary">
                        Besiedlung: {proposal.settlement.label}
                        <span className="text-swu-muted">
                          {' '}
                          · Ressourcen {proposal.settlement.factors.resources.points}/2 ·
                          Atmosphäre{' '}
                          {proposal.settlement.factors.atmosphere.present ? 'ja' : 'nein'} ·
                          Solar {proposal.settlement.factors.solar.points}/2 ·
                          Deuterium {proposal.settlement.factors.deuterium.points}/2
                        </span>
                      </dd>
                    </>
                  )}
                  <dt className="text-swu-muted">Temperatur</dt>
                  <dd className="text-swu-primary">
                    {proposal.temperatureRangeK
                      ? `${Math.round(proposal.temperatureRangeK[0])} – ${Math.round(proposal.temperatureRangeK[1])} K`
                      : 'Unbekannt'}
                  </dd>
                  {proposal.solarOutputTJ != null && (
                    <>
                      <dt className="text-swu-muted">Solarertrag</dt>
                      <dd className="text-swu-accent">
                        {proposal.solarOutputTJ.toLocaleString('de-DE')} TJ
                      </dd>
                    </>
                  )}
                  {proposal.bonusMarkers && proposal.bonusMarkers.length > 0 && (
                    <>
                      <dt className="text-swu-muted">Planetarer Bonus</dt>
                      <dd className="text-swu-primary">
                        <ul className="space-y-0.5">
                          {proposal.bonusMarkers.map((marker) => (
                            <li key={`${marker.layer}-${marker.x}-${marker.y}`}>
                              {marker.emoji} {marker.label}
                              {marker.layer === 'UNDERGROUND' ? ' (Untergrund)' : ''}
                              <span className="text-swu-muted">
                                {' '}
                                – {marker.effect}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </>
                  )}
                  {aurodiumDeposit && (
                    <>
                      <dt className="text-swu-muted">Aurodium</dt>
                      <dd className="text-swu-primary">
                        Erwarteter Ertrag{' '}
                        {aurodiumDeposit.min.toLocaleString('de-DE')} –{' '}
                        {aurodiumDeposit.max.toLocaleString('de-DE')}
                      </dd>
                    </>
                  )}
                  {proposal.ores && proposal.ores.length > 0 && (
                    <>
                      <dt className="text-swu-muted">Mineralien</dt>
                      <dd>
                        <ul className="space-y-0.5">
                          {proposal.ores.map((ore) => (
                            <li
                              key={ore.commodityId}
                              className={
                                ore.tier === 'rich'
                                  ? 'text-swu-primary'
                                  : 'text-swu-muted'
                              }
                            >
                              {ore.tier === 'rich' ? 'Reich an' : 'Spuren von'}{' '}
                              {ore.name}{' '}
                              <span className="text-swu-muted">
                                [{ore.sources}{' '}
                                {ore.sources === 1 ? 'Quelle' : 'Quellen'}]
                              </span>
                            </li>
                          ))}
                        </ul>
                      </dd>
                    </>
                  )}
                </dl>
                {!proposal.colonizable && (
                  <p className="mt-2 text-red-300">
                    {SEED_QUALITY_LABEL[proposal.seedQuality]}
                  </p>
                )}
                {proposal.previewSurface && (
                  <div
                    className="mt-2 grid gap-px overflow-hidden border border-swu-border/40 bg-swu-border/40"
                    style={{
                      gridTemplateColumns: `repeat(${proposal.previewSurface[0]?.length ?? 1}, minmax(0, 1fr))`,
                    }}
                  >
                    {proposal.previewSurface.flatMap((row, y) =>
                      row.map((code, x) => {
                        const marker = proposal.bonusMarkers?.find(
                          (entry) =>
                            entry.layer === 'SURFACE' &&
                            entry.x === x &&
                            entry.y === y,
                        );
                        return (
                          <div
                            key={`${y}-${x}`}
                            className={`relative ${marker ? BONUS_MARKER_FRAME_CLASS : ''}`}
                          >
                            <img
                              src={colonyFieldTileImage(code)}
                              alt=""
                              loading="lazy"
                              className="aspect-square w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.style.visibility = 'hidden';
                              }}
                            />
                            {marker && (
                              <BonusMarkerBadge
                                emoji={marker.emoji}
                                title={`${marker.label} – ${marker.effect}`}
                              />
                            )}
                          </div>
                        );
                      }),
                    )}
                  </div>
                )}
              </button>
            </article>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="Nächste Zone"
        onClick={() => scrollByCard(1)}
        className="absolute right-0 top-1/2 z-10 -translate-y-1/2 border border-swu-border bg-swu-bg/90 px-1.5 py-3 text-swu-primary hover:border-swu-accent"
      >
        ›
      </button>
    </div>
  );
}

export function ColonizationDialog({
  shipId,
  celestialObjectId,
  planetName,
  isRuins,
  onClose,
  onColonized,
}: {
  shipId: number;
  celestialObjectId: number;
  planetName: string | null;
  isRuins: boolean;
  onClose: () => void;
  onColonized: (colonyId: number) => void;
}) {
  const [check, setCheck] = useState<Check | null>(null);
  const [fieldIndex, setFieldIndex] = useState<number | null>(null);
  const [zoneSlot, setZoneSlot] = useState<SwuZoneSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api
      .get<Check>(`/colonization/targets/${celestialObjectId}?shipId=${shipId}`)
      .then(setCheck)
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : 'Kolonisierungsprüfung fehlgeschlagen',
        ),
      );
  }, [celestialObjectId, shipId]);

  const isSwu = !!check?.swu;
  const canSubmit =
    check?.canColonize &&
    (isRuins || (isSwu ? zoneSlot != null : fieldIndex != null));

  async function colonize() {
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      const result = await api.post<{ colonyId: number }>(
        `/spacecraft/${shipId}/colonize`,
        {
          celestialObjectId,
          ...(fieldIndex != null ? { initialFieldIndex: fieldIndex } : {}),
          ...(zoneSlot != null ? { zoneSlot } : {}),
        },
      );
      onColonized(result.colonyId);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Kolonisierung fehlgeschlagen',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isRuins ? 'Ruinen übernehmen' : 'Kolonie gründen'}
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
    >
      <section
        className={`w-full border border-swu-border bg-swu-bg text-xs ${
          isSwu ? 'max-w-[1200px]' : 'max-w-lg'
        }`}
      >
        <header className="flex justify-between border-b border-swu-border px-3 py-2">
          <h3 className="font-bold text-swu-primary">
            {isRuins ? 'Ruinenkolonie übernehmen' : 'Kolonie gründen'}
          </h3>
          <button type="button" onClick={onClose} disabled={pending}>
            Schließen
          </button>
        </header>
        <div className="space-y-3 p-3">
          <p className="text-swu-primary">
            {planetName ?? 'Unbenannter Himmelskörper'}
          </p>
          <p className="text-swu-muted">
            {isRuins
              ? 'Bestehende Gebäude und Lager werden übernommen. Das Kolonieschiff wird verbraucht.'
              : isSwu
                ? 'Wähle eine Zone für die Kolonie. Das Kolonieschiff wird verbraucht.'
                : 'Wähle das Feld für das Startgebäude. Das Kolonieschiff wird verbraucht.'}
          </p>
          {check?.reasons.length ? (
            <ul className="list-disc pl-4 text-red-300">
              {check.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
          {!isRuins && check?.swu && (
            <p className="text-swu-muted">
              Tagesdauer:{' '}
              <span className="text-swu-primary">
                {check.swu.tidalLocked
                  ? `Gebundene Rotation, Terminator pendelt alle ${check.swu.terminatorShiftHours ?? '?'} Stunden`
                  : `${check.swu.dayNightSwitchMinutes ?? '?'} Stunden`}
              </span>
            </p>
          )}
          {!isRuins && check?.swu && (
            <SwuZoneProposals
              proposals={check.swu.proposals}
              aurodiumDeposit={check.swu.aurodiumDeposit}
              selected={zoneSlot}
              onSelect={setZoneSlot}
            />
          )}
          {!isRuins && !check?.swu && check?.surface && (
            <div
              className="grid gap-px bg-swu-border"
              style={{
                gridTemplateColumns: `repeat(${check.surface.width}, minmax(0, 1fr))`,
              }}
            >
              {check.surface.fields.map((field) => (
                <button
                  key={field.fieldIndex}
                  type="button"
                  disabled={!field.selectable}
                  onClick={() => setFieldIndex(field.fieldIndex)}
                  className={`aspect-square border text-[9px] ${field.selectable ? 'bg-swu-surface hover:border-swu-accent' : 'bg-black/40 opacity-50'} ${fieldIndex === field.fieldIndex ? 'ring-2 ring-swu-accent' : ''}`}
                  title={`Feld ${field.fieldIndex}`}
                >
                  {field.selectable ? field.fieldIndex : ''}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            disabled={!canSubmit || pending}
            onClick={() => void colonize()}
            className="border border-swu-accent px-3 py-1 text-swu-primary disabled:opacity-40"
          >
            {pending
              ? 'Gründe…'
              : isRuins
                ? 'Ruinen übernehmen'
                : 'Kolonie gründen'}
          </button>
          {error && (
            <p role="alert" className="text-red-300">
              {error}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
