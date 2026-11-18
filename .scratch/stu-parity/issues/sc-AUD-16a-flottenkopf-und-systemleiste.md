# Kleine Schiffs-UI-Lücken: Flottenkopf in der Schiffsliste, Systemleiste im Schiffskopf

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** sc-AUD-05a

## Ziel

Im Flottenkopf der Schiffsliste fehlen gegenüber STU:
- die Crewsumme „x/100 Crew“,
- „Schiff hinzufügen“ (verfügbare eigene Schiffe am Feld des Leaders),
- der Hinweis „verteidigt/blockiert Kolonie“ samt Koloniename.

Die Systemleiste im Schiffskopf zeigt nur die Integrität, nicht ob ein System aktiv ist, und keinen Cooldown im Tooltip.

## STU-Quellen

- `src/html/shiplistFleetform.twig`, `src/html/view/shiplist.twig`
- `src/Module/Ship/View/ShowAvailableShips/ShowAvailableShips.php`
- `src/Module/Game/Lib/View/Provider/ShipListProvider.php` (`MAX_CREW_PER_FLEET`)
- `src/html/spacecraft/spacecraft.twig` (Z. ~190–200, Systemleiste)

## SWU-Pfade

- `apps/frontend/src/pages/spacecraft.tsx` (Flottenkopf, Umbenennen per `window.prompt` Z. ~96–101)
- `apps/frontend/src/components/spacecraft/ShipHeaderTable.tsx` (`HeaderSystemIcons`, Z. ~657–690)
- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts` (`fleets/all`, `fleets/:fleetId/join`)
- `packages/shared/src/lib/spacecraft/index.ts` (Flotten-DTO: Crewsumme, Orbitauftrag)

## Akzeptanzkriterien

- [ ] Flottenkopf zeigt „Crew x/100“ (Wert aus sc-AUD-05a), farbig bei Überschreitung.
- [ ] „Schiff hinzufügen“ listet eigene, nicht in einer Flotte befindliche Schiffe am Feld des Leaders und fügt sie über den bestehenden Join-Endpunkt hinzu (mit Crewlimit-Fehler).
- [ ] Verteidigt bzw. blockiert die Flotte eine Kolonie (sc-WP-UI-3a), zeigt der Kopf Icon und Koloniename.
- [ ] Umbenennen erfolgt per Inline-Feld statt `window.prompt`.
- [ ] Systemleiste im Schiffskopf: aktive Systeme sind optisch von inaktiven unterscheidbar; Tooltip zeigt Name, Integrität, aktiv/inaktiv und verbleibenden Cooldown.
- [ ] Frontend-Tests für Flottenkopf und Systemleiste.

## Herkunft

- Audit 2026-11-17: [spacecraft.md](../audit-2026-11-17/spacecraft.md) Seitenabgleich „Schiffsliste“ und „Schiffskopf“, kleine Abweichungen (Crewzähler, „Schiff hinzufügen“, verteidigt/blockiert, Systemleiste); [README.md](../audit-2026-11-17/README.md) Abschnitt C („Schiffsliste / NBS“).
- Gesplittet aus sc-AUD-16 (Teil b: Feldkontext und Stationsausbau). PO-Linie „wie STU“ vom 2026-11-17.

## Comments
