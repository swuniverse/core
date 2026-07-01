import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ColonyDetailV2 } from '../types';

type PanelOrbitProps = {
  orbitShips: ColonyDetailV2['orbitShips'];
  orbitBlockers?: ColonyDetailV2['orbitBlockers'];
  isBlockaded?: boolean;
  onLandShip: (shipId: number) => Promise<void> | void;
  onDisassembleShip: (shipId: number) => Promise<void> | void;
};

type OrbitShip = ColonyDetailV2['orbitShips'][number];

type OrbitGroup = {
  label: string;
  ships: OrbitShip[];
};

const SHIP_ACTION_BASE =
  'px-2 py-1 rounded border text-[10px] transition-colors disabled:opacity-40';

export function PanelOrbit({
  orbitShips,
  orbitBlockers,
  isBlockaded = false,
  onLandShip,
  onDisassembleShip,
}: PanelOrbitProps) {
  const navigate = useNavigate();
  const groups = useMemo<OrbitGroup[]>(() => {
    const grouped: Record<string, OrbitShip[]> = {};
    for (const ship of orbitShips) {
      const key = ship.orbitGroupLabel ?? 'Einzelschiff';
      grouped[key] ??= [];
      grouped[key].push(ship);
    }
    return Object.entries(grouped).map(([label, ships]) => ({ label, ships }));
  }, [orbitShips]);

  return (
    <div className="space-y-2">
      <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-1">
        <div className="text-[10px] font-bold text-swu-muted uppercase">
          Orbitlage
        </div>
        <div className="flex flex-wrap gap-4 text-[10px] text-swu-muted">
          <span>
            Schiffe: <span className="font-mono text-swu-primary">{orbitShips.length}</span>
          </span>
          <span>
            Blockade:{' '}
            <span className={isBlockaded ? 'text-red-400 font-semibold' : 'text-green-400 font-semibold'}>
              {isBlockaded ? 'aktiv' : 'keine'}
            </span>
          </span>
        </div>
        {orbitBlockers?.defense && (
          <div className="text-[10px] text-amber-300">{orbitBlockers.defense}</div>
        )}
        {orbitBlockers?.station && (
          <div className="text-[10px] text-amber-300">{orbitBlockers.station}</div>
        )}
        {orbitBlockers?.shuttleManagement && (
          <div className="text-[10px] text-amber-300">{orbitBlockers.shuttleManagement}</div>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs text-swu-muted">
          Keine Schiffe im Orbit.
        </div>
      ) : (
        groups.map(({ label: groupLabel, ships }) => (
          <div
            key={groupLabel}
            className="bg-swu-surface border border-swu-border rounded px-3 py-2 text-xs space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] font-bold text-swu-muted uppercase">
                {groupLabel}
              </div>
              <div className="text-[10px] text-swu-muted">
                {ships.length} Schiff{ships.length === 1 ? '' : 'e'}
              </div>
            </div>
            <div className="space-y-2">
              {ships.map((ship) => {
                const stationText = ship.station
                  ? `${ship.station.name}${ship.station.type ? ` · ${ship.station.type}` : ''}`
                  : ship.actionBlockers?.station;
                return (
                  <div
                    key={ship.id}
                    className="border border-swu-border/40 rounded px-2 py-2 space-y-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-swu-primary">{ship.name}</div>
                        <div className="text-[10px] text-swu-muted">
                          {ship.shipClassName ?? `Klasse #${ship.shipClassId}`}
                          {ship.shipCategory ? ` · ${ship.shipCategory}` : ''}
                          {ship.shipRole ? ` · ${ship.shipRole}` : ''}
                          {ship.status ? ` · ${ship.status}` : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/spacecraft?selected=${ship.id}`)}
                        className={`${SHIP_ACTION_BASE} border-swu-accent/50 text-swu-accent hover:border-swu-accent`}
                      >
                        Schiff öffnen
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] text-swu-muted">
                      <div>
                        Hülle{' '}
                        <span className="font-mono text-swu-primary">
                          {ship.hull}/{ship.hullMax}
                        </span>
                      </div>
                      <div>
                        Schilde{' '}
                        <span className="font-mono text-swu-primary">
                          {ship.shields}/{ship.shieldsMax}
                        </span>
                      </div>
                      <div>
                        Energie{' '}
                        <span className="font-mono text-swu-primary">
                          {ship.energy}/{ship.energyMax}
                        </span>
                      </div>
                      <div>
                        Crew{' '}
                        <span className="font-mono text-swu-primary">
                          {ship.crew}/{ship.crewRequired}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-[10px]">
                      <button
                        onClick={() => onLandShip(ship.id)}
                        disabled={!ship.canLand}
                        title={!ship.canLand ? 'Landung nicht verfügbar' : undefined}
                        className={`${SHIP_ACTION_BASE} border-swu-primary/50 text-swu-primary hover:border-swu-primary`}
                      >
                        Landen
                      </button>
                      <button
                        onClick={() => onDisassembleShip(ship.id)}
                        disabled={!ship.canDisassemble}
                        title={!ship.canDisassemble ? 'Demontage nicht verfügbar' : undefined}
                        className={`${SHIP_ACTION_BASE} border-red-400/40 text-red-300 hover:border-red-400`}
                      >
                        Demontieren
                      </button>
                      <button
                        disabled={!ship.canRepair}
                        title={!ship.canRepair ? 'Reparatur im Werft-Tab' : undefined}
                        className={`${SHIP_ACTION_BASE} border-swu-border text-swu-muted`}
                      >
                        Reparatur via Werft
                      </button>
                      <button
                        disabled={!ship.canRetrofit}
                        title={!ship.canRetrofit ? 'Retrofit im Werft-Tab' : undefined}
                        className={`${SHIP_ACTION_BASE} border-swu-border text-swu-muted`}
                      >
                        Retrofit via Werft
                      </button>
                      <button
                        disabled={!ship.canDefend}
                        title={ship.actionBlockers?.defend ?? 'Nicht verfügbar'}
                        className={`${SHIP_ACTION_BASE} border-swu-border text-swu-muted`}
                      >
                        Verteidigen
                      </button>
                      <button
                        disabled={!ship.canBlock}
                        title={ship.actionBlockers?.block ?? 'Nicht verfügbar'}
                        className={`${SHIP_ACTION_BASE} border-swu-border text-swu-muted`}
                      >
                        Blockade
                      </button>
                      <button
                        disabled={!ship.canManageShuttle}
                        title={ship.actionBlockers?.shuttleManagement ?? 'Nicht verfügbar'}
                        className={`${SHIP_ACTION_BASE} border-swu-border text-swu-muted`}
                      >
                        Shuttle-Management
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-swu-muted">
                      <span>
                        Verwaltung:{' '}
                        <span className={ship.canManage ? 'text-green-400' : 'text-red-400'}>
                          {ship.canManage ? 'lokal' : 'extern'}
                        </span>
                      </span>
                      <span>
                        Schaden:{' '}
                        <span className="font-mono text-swu-primary">
                          Hülle -{ship.damageSummary?.hullDamage ?? 0}, Module {ship.damageSummary?.damagedModules ?? 0}
                        </span>
                      </span>
                      <span>
                        Cargo:{' '}
                        <span className="font-mono text-swu-primary">
                          {ship.cargoUsed ?? 0}/{ship.cargoMax ?? 0}
                        </span>
                      </span>
                    </div>

                    <div className="text-[10px] text-swu-muted">
                      Station:{' '}
                      <span className={ship.station ? 'text-swu-primary' : 'text-amber-300'}>
                        {stationText ?? 'Keine Stationsdaten'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
