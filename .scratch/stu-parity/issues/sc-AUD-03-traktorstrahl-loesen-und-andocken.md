# Traktorstrahl: lösen, Ziel beim Ziehenden, gehaltenes Schiff andocken

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Ein aktivierter Traktorstrahl lässt sich in SWU nicht wieder lösen: `DELETE :id/tractor` hat keinen Frontend-Aufrufer. Der Ziehende sieht sein Ziel nirgends, weil das Detail-DTO nur `tractor.heldBy` für das Opfer trägt. Stationen können gehaltene Schiffe nicht andocken. STU zeigt eine Traktor-Box mit gehaltenem Schiff, „deaktivieren“, „Fluchtversuch“ und an Stationen „Gehaltenes Schiff andocken“.

## STU-Quellen

- `src/html/spacecraft/control/control_right.twig` (Traktor-Box, `B_DEACTIVATE_TRACTOR`, `B_ESCAPE_TRAKTOR`, `B_DOCK_TRACTORED`)
- `src/Module/Spacecraft/Action/DeactivateTractorBeam/`
- `src/Module/Station/Action/DockTractoredShip/DockTractoredShip.php` (Crew der Station, 1 EPS, freier Dockplatz, Ziel nicht in Flotte mit mehr als einem Schiff, Ziel auf Alarm Grün; danach Traktor aus, PM an Eigner)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts` (`DELETE :id/tractor`, Z. ~1376)
- `apps/backend/src/modules/spacecraft/spacecraft-tractor.service.ts`
- `apps/backend/src/modules/spacecraft/spacecraft-docking.service.ts` (neue Aktion „gehaltenes Schiff andocken“)
- `packages/shared/src/lib/spacecraft/index.ts` (`tractor` im Detail-DTO, Z. ~556)
- `apps/frontend/src/pages/spacecraft-detail.tsx` (Traktor-Box, bisher nur Opferseite Z. ~162–188)

## Akzeptanzkriterien

- [ ] Detail-DTO liefert beim Ziehenden das gehaltene Ziel (`tractor.holding: { id, name }`).
- [ ] Die Traktor-Box zeigt beim Ziehenden das gehaltene Schiff und „deaktivieren“ (ruft `DELETE :id/tractor`); beim Opfer bleibt „Entkommen“.
- [ ] Neuer Endpunkt „gehaltenes Schiff andocken“ für Stationen mit STU-Prüfungen (Stationscrew, 1 EPS, freier Dockplatz, Ziel nicht in Mehrschiff-Flotte, Ziel auf Grün); danach ist das Ziel angedockt, der Traktor aus und der Eigner erhält eine PM.
- [ ] Knopf „Gehaltenes Schiff andocken“ in der Traktor-Box einer Station, Fehlermeldungen je Grund.
- [ ] Backend-Tests für Lösen und Andocken inkl. Ablehnungsgründe; Frontend-Tests für Box beim Ziehenden, Lösen und Andocken.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt A („Traktorstrahl lösen, gehaltenes Schiff andocken“) und D; [spacecraft.md](../audit-2026-11-17/spacecraft.md) große Abweichung 3, Seitenabgleich „Traktorstrahl-Box“.
- Resolved-Ticket mit nicht erfüllter Akzeptanz: [sc-WP-TRACT-1a](sc-WP-TRACT-1a-traktorstrahl-kern-eigene-schiffe.md) (Kriterium „Deaktivieren jederzeit“ im UI nicht erreichbar).

## Comments
