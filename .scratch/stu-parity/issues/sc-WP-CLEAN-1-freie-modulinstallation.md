# Freie Modulinstallation am Schiff entfernen oder auf Admin beschränken

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

`POST :id/modules/install`, `POST :id/modules/:moduleId/level-up` und `DELETE :id/modules/:moduleId` umgehen Werft- und Umrüstregeln, haben kein STU-Pendant und werden vom Frontend nicht genutzt. Sie wirken wie eine Altlast und sind ein Exploit-Risiko für Spieler-APIs.

## STU-Quellen

- kein Pendant; STU ändert Module nur über Werft (`Module/Colony/Action/BuildShip`) und Umrüstung (`Component/Ship/Retrofit/*`).

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts` (`:id/modules/install`, `:id/modules/:moduleId/level-up`, `DELETE :id/modules/:moduleId`)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts`, `spacecraft.controller.spec.ts`

## Akzeptanzkriterien

- [ ] Endpunkte entfernt (inkl. toter Service-Methoden und zugehöriger DTOs).
- [ ] Tests: Spieler-Aufruf der alten Routen liefert 404; Werft- und Umrüstpfad bleiben grün.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Vorgabe: Variante (a). Die Endpunkte `POST :id/modules/install`, `POST :id/modules/:moduleId/level-up` und `DELETE :id/modules/:moduleId` werden ersatzlos entfernt, inklusive toter Service-Methoden. Kein Admin-Guard-Erhalt.

## Comments

- 2026-10-21 Product Owner: Option a – Module werden ausschließlich über Werft und Umrüstung geändert; die freien Modul-Endpunkte werden ersatzlos entfernt.
