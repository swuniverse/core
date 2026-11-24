import { useEffect, useState } from 'react';
import type { SpacecraftListDto } from '@swuniverse/shared';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const STATION_ROLES: Record<string, string> = {
  CONSTRUCTION: 'Konstrukt',
  DEPOT_SMALL: 'Versorgungsdepot',
  DEPOT_LARGE: 'Logistikzentrum',
  SHIPYARD: 'Raumwerft',
  SENSOR: 'Sensorphalanx',
  OUTPOST: 'Außenposten',
  BASE: 'Raumstation',
};

const cell = 'border border-swu-border px-1.5 py-1';
const numberCell = `${cell} text-right font-mono whitespace-nowrap`;

/** STU stationList.twig: stations live on their own page, apart from the ship list. */
export function StationsPage() {
  const navigate = useNavigate();
  const [stations, setStations] = useState<SpacecraftListDto[] | null>(null);

  useEffect(() => {
    void api
      .get<SpacecraftListDto[]>('/spacecraft')
      .then((ships) => setStations(ships.filter((ship) => ship.kind === 'STATION')))
      .catch(() => setStations([]));
  }, []);

  if (!stations) return <div className="p-3 text-swu-muted md:p-6">Stationen werden geladen...</div>;

  return (
    <div className="space-y-3 p-3 md:p-6">
      <div className="border border-swu-border bg-black/30 px-3 py-1.5">
        <h1 className="text-xs font-bold text-swu-primary">/ Stationen</h1>
      </div>
      <section className="overflow-x-auto border border-swu-border bg-swu-surface/70">
        <header className="border-b border-swu-border bg-black/30 px-3 py-2 text-xs">
          <h2 className="font-bold text-swu-primary">Stationen</h2>
        </header>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-black/40 text-center font-bold text-swu-primary">
              {['Klasse', 'Name', 'Rolle', 'Position', 'Hülle', 'Schilde', 'EPS', 'Crew', 'Andockbelegung'].map((heading) => (
                <th key={heading} className={cell}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stations.length === 0 ? (
              <tr><td colSpan={9} className={`${cell} py-4 text-center text-swu-muted`}>Du besitzt derzeit keine Stationen</td></tr>
            ) : (
              stations.map((station) => {
                const location = station.location.scope === 'SYSTEM'
                  ? `${station.location.x}|${station.location.y} (${station.location.galaxyX ?? 0}|${station.location.galaxyY ?? 0})`
                  : `(${station.location.x}|${station.location.y})`;
                return (
                  <tr key={station.id} onClick={() => navigate(`/spacecraft/${station.id}`)} className="cursor-pointer hover:bg-white/5">
                    <td className={cell}>{station.shipClassName}</td>
                    <td className={`${cell} text-swu-primary`}>{station.name}</td>
                    <td className={cell}>{STATION_ROLES[station.stationRole ?? ''] ?? station.stationRole}</td>
                    <td className={numberCell}>{location}</td>
                    <td className={numberCell}>{station.hull}/{station.hullMax}</td>
                    <td className={numberCell}>{station.shields}/{station.shieldsMax}</td>
                    <td className={numberCell}>{station.energy}/{station.energyMax}</td>
                    <td className={numberCell}>{station.crew}/{station.crewRequired}/{station.crewMax}</td>
                    <td className={numberCell} aria-label={`Andockbelegung ${station.dockedShips} von ${station.dockCapacity}`}>{station.dockedShips}/{station.dockCapacity}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
