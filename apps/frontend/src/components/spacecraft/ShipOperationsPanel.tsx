import { useEffect, useState } from 'react';
import type {
  SpacecraftCrewManagementDto,
  SpacecraftCrewManagementMemberDto,
  SpacecraftCrewPosition,
  SpacecraftDetailDto,
  SpacecraftEnergyFlowDto,
} from '@swuniverse/shared';
import { api } from '../../services/api';
import { SYSTEM_ASSETS } from './ShipControlCenter';
import { SHIP_SYSTEM_PRESENTATION } from './ship-system-presentation';

interface Props {
  shipId: number;
  showDetails: boolean;
  onCloseDetails: () => void;
  showEnergy: boolean;
  onCloseEnergy: () => void;
}

export function ShipOperationsPanel({
  shipId,
  showDetails,
  onCloseDetails,
  showEnergy,
  onCloseEnergy,
}: Props) {
  const [details, setDetails] = useState<SpacecraftDetailDto | null>(null);
  const [flow, setFlow] = useState<SpacecraftEnergyFlowDto | null>(null);
  const [crew, setCrew] = useState<SpacecraftCrewManagementDto | null>(null);
  const [showCrew, setShowCrew] = useState(false);
  const [crewNames, setCrewNames] = useState<Record<number, string>>({});
  const [crewName, setCrewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDetails(null);
    setFlow(null);
    setCrew(null);
    setShowCrew(false);
  }, [shipId]);

  useEffect(() => {
    if (!showDetails || details) return;
    api
      .get<SpacecraftDetailDto>(`/spacecraft/${shipId}/details`)
      .then(setDetails)
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : 'Details konnten nicht geladen werden',
        ),
      );
  }, [details, shipId, showDetails]);

  useEffect(() => {
    if (!showEnergy || flow) return;
    api
      .get<SpacecraftEnergyFlowDto>(`/spacecraft/${shipId}/energy-flow`)
      .then(setFlow)
      .catch((err: unknown) =>
        setError(
          err instanceof Error
            ? err.message
            : 'Energiefluss konnte nicht geladen werden',
        ),
      );
  }, [flow, shipId, showEnergy]);

  const loadCrew = async () => {
    try {
      const response = await api.get<SpacecraftCrewManagementDto>(
        `/spacecraft/${shipId}/crew`,
      );
      setCrew(response);
      setCrewNames(
        Object.fromEntries(
          [
            ...response.positions.flatMap((position) => position.crew),
            ...response.unassignedCrew,
          ].map((member) => [member.id, member.name]),
        ),
      );
      setShowCrew(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Crew konnte nicht geladen werden',
      );
    }
  };

  const updateSlot = async (
    member: SpacecraftCrewManagementMemberDto,
    slot: SpacecraftCrewPosition | null,
  ) => {
    try {
      setCrew(
        await api.patch(`/spacecraft/${shipId}/crew/${member.id}/slot`, {
          slot,
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Position konnte nicht geändert werden',
      );
    }
  };

  const promoteMember = async (member: SpacecraftCrewManagementMemberDto) => {
    try {
      setCrew(
        await api.post(`/spacecraft/${shipId}/crew/${member.id}/promote`, {}),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Crewmitglied konnte nicht befördert werden',
      );
    }
  };

  const renameMember = async (member: SpacecraftCrewManagementMemberDto) => {
    try {
      setCrew(
        await api.patch(`/spacecraft/${shipId}/crew/${member.id}/name`, {
          name: crewNames[member.id],
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Crewmitglied konnte nicht umbenannt werden',
      );
    }
  };

  const renameCompleteCrew = async () => {
    try {
      setCrew(
        await api.patch(`/spacecraft/${shipId}/crew/name`, { name: crewName }),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Crew konnte nicht umbenannt werden',
      );
    }
  };

  return (
    <>
      {showDetails && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Schiffsinformationen"
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onCloseDetails();
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded border border-swu-border bg-swu-bg p-4 shadow-xl">
            <div className="flex justify-between gap-2">
              <h3 className="text-sm font-bold text-swu-primary">
                Schiffsinformationen
              </h3>
              <button
                type="button"
                onClick={onCloseDetails}
                aria-label="Dialog schließen"
                className="text-xs text-swu-muted"
              >
                Schließen
              </button>
            </div>
            {details && (
              <div className="mt-2 grid gap-4 text-xs md:grid-cols-2">
                <InfoSection
                  title="Zustand"
                  rows={[
                    ['Hülle', `${details.hull}/${details.hullMax}`],
                    ['Schilde', `${details.shields}/${details.shieldsMax}`],
                    ['Energie', `${details.energy}/${details.energyMax}`],
                    ['Batterie', `${details.battery}/${details.batteryMax}`],
                  ]}
                />
                <section>
                  <InfoSection
                    title="Crew"
                    rows={
                      details.crewRoster?.length
                        ? details.crewRoster.map((member) => [
                            member.name,
                            `${member.position} · ${member.rank}`,
                          ])
                        : [
                            [
                              'Besatzung',
                              `${details.crew} (${details.crewRequired ?? 0},${details.crewMax || 'kA'})`,
                            ],
                          ]
                    }
                  />
                  <button
                    type="button"
                    onClick={() => void loadCrew()}
                    className="mt-2 border border-swu-border px-2 py-1 text-swu-primary"
                  >
                    Crew verwalten
                  </button>
                </section>
                <InfoSection
                  title="Informationen"
                  rows={[
                    [
                      'Reaktorleistung',
                      `${details.effectiveStats?.reactorOutput ?? details.reactorOutput}`,
                    ],
                    [
                      'Sensorreichweite',
                      `${details.effectiveStats?.sensorRange ?? '—'}`,
                    ],
                    [
                      'Frachtkapazität',
                      `${details.effectiveStats?.cargoMax ?? details.cargoMax ?? 0}`,
                    ],
                  ]}
                />
                <section>
                  <h4 className="font-bold text-swu-primary">Systemstatus</h4>
                  <ul>
                    {Object.entries(details.runtimeSystems).map(
                      ([key, value]) => {
                        const system = SHIP_SYSTEM_PRESENTATION.get(
                          key as never,
                        );
                        return (
                          <li key={key} className="flex items-center gap-1">
                            <img
                              src={`/assets/system/${SYSTEM_ASSETS[key] ?? '1.png'}`}
                              alt=""
                              className="size-4 border border-emerald-400 object-contain"
                            />
                            {system?.label ?? key}: {value?.integrity ?? 0}%
                          </li>
                        );
                      },
                    )}
                  </ul>
                </section>
              </div>
            )}
          </div>
        </div>
      )}

      {showCrew && crew && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Crew verwalten"
          className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4"
        >
          <section className="max-h-[90vh] w-full max-w-4xl overflow-y-auto border border-swu-border bg-swu-bg p-4 text-xs shadow-xl">
            <header className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-swu-primary">Crewposten verwalten</h3>
              <button type="button" onClick={() => setShowCrew(false)}>
                Schließen
              </button>
            </header>
            <div className="mb-3 flex gap-2">
              <label>
                Crewname
                <input
                  value={crewName}
                  onChange={(event) => setCrewName(event.target.value)}
                  className="ml-2 border border-swu-border bg-swu-surface px-2 py-1"
                />
              </label>
              <button
                type="button"
                onClick={() => void renameCompleteCrew()}
                className="border border-swu-border px-2"
              >
                Gesamte Crew umbenennen
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {crew.positions.map((position) => (
                <section key={position.slot} className="border border-swu-border p-2">
                  <h4 className="font-bold text-swu-primary">
                    {position.slot} · {position.crew.length}/
                    {position.target ?? '∞'}
                  </h4>
                  {position.crew.map((member) => (
                    <CrewMemberRow
                      key={member.id}
                      member={member}
                      positions={crew.positions}
                      name={crewNames[member.id] ?? member.name}
                      onNameChange={(name) =>
                        setCrewNames((names) => ({ ...names, [member.id]: name }))
                      }
                      onRename={() => void renameMember(member)}
                      onPromote={() => void promoteMember(member)}
                      onSlotChange={(slot) => void updateSlot(member, slot)}
                    />
                  ))}
                </section>
              ))}
            </div>
            {crew.unassignedCrew.map((member) => (
              <CrewMemberRow
                key={member.id}
                member={member}
                positions={crew.positions}
                name={crewNames[member.id] ?? member.name}
                onNameChange={(name) =>
                  setCrewNames((names) => ({ ...names, [member.id]: name }))
                }
                onRename={() => void renameMember(member)}
                onPromote={() => void promoteMember(member)}
                onSlotChange={(slot) => void updateSlot(member, slot)}
              />
            ))}
          </section>
        </div>
      )}

      {showEnergy && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="EPS Verbrauch"
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onCloseEnergy();
          }}
        >
          <section className="w-full max-w-sm border border-swu-border bg-swu-bg shadow-xl">
            <header className="flex items-center justify-between border-b border-swu-border px-3 py-2">
              <h3 className="text-sm font-bold text-swu-primary">
                EPS Verbrauch
              </h3>
              <button
                type="button"
                onClick={onCloseEnergy}
                aria-label="Dialog schließen"
                className="text-swu-muted"
              >
                Schließen
              </button>
            </header>
            {flow && (
              <div className="p-3 text-xs">
                <InfoSection
                  title="Energie"
                  rows={[
                    ['EPS', `${flow.energy.current}/${flow.energy.max}`],
                    ['Reaktor', `${flow.reactorOutput}`],
                    ['Produktion', `${flow.epsProduction}`],
                    ['Verbrauch', `${flow.totalSystemConsumption}`],
                    ['Netto', `${flow.netEps}`],
                  ]}
                />
                <h4 className="mt-3 font-bold text-swu-primary">
                  Systemverbrauch
                </h4>
                <ul>
                  {flow.systems.map((row) => (
                    <li key={row.systemKey} className="flex justify-between">
                      <span>{row.label}</span>
                      <span>{row.epsPerTick} EPS</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      )}
      {error && (showDetails || showEnergy) && (
        <p role="alert" className="sr-only">
          {error}
        </p>
      )}
    </>
  );
}

function CrewMemberRow({
  member,
  positions,
  name,
  onNameChange,
  onRename,
  onPromote,
  onSlotChange,
}: {
  member: SpacecraftCrewManagementMemberDto;
  positions: SpacecraftCrewManagementDto['positions'];
  name: string;
  onNameChange: (name: string) => void;
  onRename: () => void;
  onPromote: () => void;
  onSlotChange: (slot: SpacecraftCrewPosition | null) => void;
}) {
  return (
    <div className="mt-2 grid gap-1 border-t border-swu-border pt-2">
      <strong>{member.name}</strong>
      <span>
        {member.gender} · {member.type} · {member.originColony?.name ?? 'Unbekannt'}
      </span>
      <span>
        {member.rankLabel} ·{' '}
        {member.expertise.map((skill) => `${skill.amount.toLocaleString('de-DE')} Expertise (${skill.position})`).join(', ') || '0 Expertise'}
      </span>
      {member.promotion && (
        <button
          type="button"
          aria-label={`${member.name} zum ${member.promotion.label} befördern`}
          onClick={onPromote}
          className="w-fit border border-swu-border px-2"
        >
          Zum {member.promotion.label} befördern
        </button>
      )}
      <label>
        Position
        <select
          aria-label={`Position für ${member.name}`}
          value={member.position ?? ''}
          onChange={(event) =>
            onSlotChange(
              (event.target.value || null) as SpacecraftCrewPosition | null,
            )
          }
          className="ml-2 border border-swu-border bg-swu-surface"
        >
          <option value="">Nicht zugewiesen</option>
          {positions.map((position) => (
            <option key={position.slot} value={position.slot}>
              {position.slot}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-1">
        <input
          aria-label={`Name von ${member.name}`}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          className="min-w-0 flex-1 border border-swu-border bg-swu-surface px-1"
        />
        <button
          type="button"
          aria-label={`${member.name} umbenennen`}
          onClick={onRename}
          className="border border-swu-border px-2"
        >
          Umbenennen
        </button>
      </div>
    </div>
  );
}

function InfoSection({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section>
      <h4 className="font-bold text-swu-primary">{title}</h4>
      <dl>
        {rows.map(([label, value]) => (
          <div key={`${label}-${value}`} className="flex justify-between gap-3">
            <dt className="text-swu-muted">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
