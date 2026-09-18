export type ShipRefreshTarget =
  | 'ship'
  | 'local-map'
  | 'cargo'
  | 'torpedoes'
  | 'modules'
  | 'energy-flow'
  | 'scans'
  | 'communications';

export type ShipActionAvailability =
  'existing' | 'planned' | 'route' | 'informational';

export interface ShipActionDefinition {
  label: string;
  availability: ShipActionAvailability;
  destination: string;
  pending: string;
  success: string;
  failure: string;
  refresh: ShipRefreshTarget[];
}

export const SHIP_ACTIONS = {
  refresh: action(
    'Aktualisieren',
    'existing',
    'GET /spacecraft/:id + /local-map',
    'Aktualisiere…',
    'Schiff aktualisiert',
    'Aktualisierung fehlgeschlagen',
    ['ship', 'local-map'],
  ),
  rename: action(
    'Schiffsname ändern',
    'existing',
    'PUT /spacecraft/:id',
    'Speichere…',
    'Schiffsname geändert',
    'Umbenennen fehlgeschlagen',
    ['ship'],
  ),
  details: action(
    'Schiffsinformationen',
    'planned',
    'GET /spacecraft/:id/details',
    'Lade Details…',
    'Details geladen',
    'Details konnten nicht geladen werden',
    [],
  ),
  communication: action(
    'Kommunikation',
    'planned',
    '/spacecraft/:id/communications/*',
    'Sende…',
    'Nachricht gesendet',
    'Kommunikation fehlgeschlagen',
    ['communications'],
  ),
  lssMode: action(
    'LSS-Filter',
    'planned',
    'GET|PATCH /spacecraft/:id/lss-mode',
    'Wechsle Ansicht…',
    'LSS-Ansicht geändert',
    'LSS-Ansicht konnte nicht geändert werden',
    ['ship', 'local-map'],
  ),
  starmap: action(
    'Sternkarte öffnen',
    'route',
    '/starmap',
    'Öffne…',
    'Sternkarte geöffnet',
    'Sternkarte konnte nicht geöffnet werden',
    [],
  ),
  standby: action(
    'Energieverbrauch minimieren',
    'planned',
    'PATCH /spacecraft/:id/operating-mode',
    'Wechsle Betriebsmodus…',
    'Betriebsmodus geändert',
    'Betriebsmodus konnte nicht geändert werden',
    ['ship', 'energy-flow'],
  ),
  alertState: action(
    'Alarmstufe',
    'planned',
    'PATCH /spacecraft/:id/alert-state',
    'Setze Alarmstufe…',
    'Alarmstufe geändert',
    'Alarmstufe konnte nicht geändert werden',
    ['ship', 'energy-flow'],
  ),
  selfDestruct: action(
    'Selbstzerstörung',
    'planned',
    'POST /spacecraft/:id/self-destruct',
    'Selbstzerstörung…',
    'Schiff zerstört',
    'Selbstzerstörung fehlgeschlagen',
    ['ship', 'local-map'],
  ),
  energyFlow: action(
    'Energiefluss',
    'planned',
    'GET /spacecraft/:id/energy-flow',
    'Lade Energiefluss…',
    'Energiefluss geladen',
    'Energiefluss konnte nicht geladen werden',
    [],
  ),
  modules: action(
    'Verbaute Module',
    'existing',
    'GET /spacecraft/:id/modules',
    'Lade Module…',
    'Module geladen',
    'Module konnten nicht geladen werden',
    ['modules'],
  ),
  toggleSystem: action(
    'System umschalten',
    'existing',
    'PATCH /spacecraft/:id/systems/:systemKey',
    'Schalte System…',
    'Systemstatus geändert',
    'System konnte nicht geschaltet werden',
    ['ship', 'energy-flow', 'local-map'],
  ),
  navigate: action(
    'Fliegen',
    'existing',
    'POST /spacecraft/:id/fly|navigate',
    'Flug wird gestartet…',
    'Position aktualisiert',
    'Navigation fehlgeschlagen',
    ['ship', 'local-map'],
  ),
  enterSystem: action(
    'System betreten',
    'existing',
    'POST /spacecraft/:id/enter-system',
    'Betrete System…',
    'System betreten',
    'System konnte nicht betreten werden',
    ['ship', 'local-map'],
  ),
  leaveSystem: action(
    'System verlassen',
    'existing',
    'POST /spacecraft/:id/leave-system',
    'Verlasse System…',
    'System verlassen',
    'System konnte nicht verlassen werden',
    ['ship', 'local-map'],
  ),
  attack: action(
    'Angreifen',
    'existing',
    'POST /combat/attack',
    'Kampf läuft…',
    'Kampf beendet',
    'Angriff fehlgeschlagen',
    ['ship', 'local-map'],
  ),
  sectorScan: action(
    'Sektor scannen',
    'planned',
    'POST /spacecraft/:id/sector-scan',
    'Scanne Sektor…',
    'Sektor gescannt',
    'Sektorscan fehlgeschlagen',
    ['ship', 'scans', 'local-map'],
  ),
  fieldScan: action(
    'Systemfeld scannen',
    'planned',
    'POST /spacecraft/:id/system-field-scan',
    'Scanne Feld…',
    'Feld gescannt',
    'Feldscan fehlgeschlagen',
    ['ship', 'scans', 'local-map'],
  ),
  reactorSplit: action(
    'Reaktorverteilung',
    'existing',
    'PATCH /spacecraft/:id/reactor-distribution',
    'Speichere Verteilung…',
    'Reaktorverteilung geändert',
    'Reaktorverteilung fehlgeschlagen',
    ['ship', 'energy-flow'],
  ),
  recharge: action(
    'Aufladen',
    'existing',
    'POST /spacecraft/:id/recharge',
    'Lade auf…',
    'Schiff aufgeladen',
    'Aufladen fehlgeschlagen',
    ['ship', 'energy-flow'],
  ),
  batteryDischarge: action(
    'Ersatzbatterie entladen',
    'planned',
    'POST /spacecraft/:id/battery/discharge',
    'Entlade Batterie…',
    'Batterie entladen',
    'Batterie konnte nicht entladen werden',
    ['ship', 'energy-flow'],
  ),
  reactorLoad: action(
    'Reaktor aufladen',
    'planned',
    'POST /spacecraft/:id/reactor/load',
    'Lade Reaktor…',
    'Reaktor geladen',
    'Reaktor konnte nicht geladen werden',
    ['ship', 'energy-flow'],
  ),
  cargo: action(
    'Waren transferieren',
    'existing',
    'GET|POST /spacecraft/:id/cargo/*',
    'Transferiere Waren…',
    'Waren transferiert',
    'Warentransfer fehlgeschlagen',
    ['ship', 'cargo'],
  ),
  crewTransfer: action(
    'Crew transferieren',
    'existing',
    'POST /colonies/:id/ships/:shipId/crew/assign|unassign',
    'Transferiere Crew…',
    'Crew transferiert',
    'Crewtransfer fehlgeschlagen',
    ['ship'],
  ),
  torpedoes: action(
    'Torpedos transferieren',
    'existing',
    'GET|POST /spacecraft/:id/torpedoes/*',
    'Transferiere Torpedos…',
    'Torpedos transferiert',
    'Torpedotransfer fehlgeschlagen',
    ['ship', 'torpedoes'],
  ),
  colony: action(
    'Kolonie öffnen',
    'route',
    '/colonies/:id',
    'Öffne Kolonie…',
    'Kolonie geöffnet',
    'Kolonie konnte nicht geöffnet werden',
    [],
  ),
  colonyMessage: action(
    'Koloniebotschaft anzeigen',
    'planned',
    'GET /spacecraft/:id/communications/colony-message',
    'Lade Botschaft…',
    'Botschaft geladen',
    'Botschaft konnte nicht geladen werden',
    ['communications'],
  ),
} as const satisfies Record<string, ShipActionDefinition>;

function action(
  label: string,
  availability: ShipActionAvailability,
  destination: string,
  pending: string,
  success: string,
  failure: string,
  refresh: ShipRefreshTarget[],
): ShipActionDefinition {
  return {
    label,
    availability,
    destination,
    pending,
    success,
    failure,
    refresh,
  };
}
