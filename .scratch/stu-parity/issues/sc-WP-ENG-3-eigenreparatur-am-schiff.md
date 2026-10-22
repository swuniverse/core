# Eigenreparatur am Schiff mit Ersatzteilen

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Wie in STU öffnet der Spieler am Schiff „Reparaturoptionen“, wählt ein beschädigtes System und repariert es mit Ersatzteilen (Ware 10001) und/oder Systemkomponenten. Sofortreparatur kostet das Dreifache mit Erfolgschance; sonst geht das Schiff in den Zustand „Reparatur aktiv“ und repariert im Tick. Die heutige passive 1-%-Reparatur bleibt unverändert (Frage in sc-WP-ENG-3b).

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/Selfrepair/Selfrepair.php` (nicht unter Alarm Gelb/Rot, Crew ausreichend, nicht bereits in Reparatur, nicht `ASTRO_FINALIZING`, Teilewahl, `3 * benötigt` bei Sofortreparatur)
- `Module/Spacecraft/View/ShowRepairOptions`, `html/ship/repairoptions.twig`
- `Component/Spacecraft/Repair/*`, `Module/Tick/Spacecraft/ManagerComponent/RepairActions.php`
- `Module/Spacecraft/Lib/Movement/Component/Consequence/Flight/RepairConsequence.php` (Flug bricht ab)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`processTick`, `navigate`), `spacecraft.controller.ts`
- `apps/backend/src/modules/spacecraft/entities/spacecraft.entity.ts`, `spacecraft-module.entity.ts` (`integrity`)
- `apps/backend/src/modules/spacecraft/cartography-plan.service.ts` (Finalisierung sperrt)
- `apps/frontend/src/components/spacecraft/ShipQuickActions.tsx` (Asset `rep1.png`), neuer Dialog

## Akzeptanzkriterien

- [x] `GET :id/repair-options` listet beschädigte Systeme mit benötigten Ersatzteilen/Komponenten und Dauer.
- [x] `POST :id/self-repair` mit System und Teileart; prüft Alarmstufe Grün, Crew, keine laufende Reparatur, keine Kartographie-Finalisierung, nicht im Hyperraumflug, Lagerbestand.
- [x] Normale Reparatur verbraucht Teile und setzt einen Reparaturzustand; der Tick schließt sie ab und meldet sie.
- [x] Sofortreparatur verbraucht das Dreifache und gelingt mit der STU-Erfolgschance.
- [x] Ein Flug bricht die laufende Reparatur mit Meldung ab.
- [x] Backend-Tests für jede Vorbedingung, Tick-Abschluss und Flugabbruch; Frontend-Test für Dialog.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-10-22: Eigenreparatur mit persistenter, transaktionaler Reparaturaufgabe, STU-Teilekosten und Zielintegritätswürfen, Tick-Abschluss, Flugabbruch für Einzelschiffe und Flotten sowie Reparaturdialog umgesetzt. Tests decken Vorbedingungen, Lagertransaktionen, Tick und Flugabbruch ab; keine offenen Folgepunkte.
