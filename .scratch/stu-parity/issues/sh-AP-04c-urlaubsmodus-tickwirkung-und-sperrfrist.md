# Urlaubsmodus: Tickwirkung und Sperrfrist

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** sh-AP-04a

## Ziel

In STU pausiert der Kolonie-Tick wirksamer Urlauber vollständig (keine Produktion, kein Verbrauch, kein Bau), und auf Schiffsseite entfallen Crewlimit-Folgen und passive Reparaturaktionen; die Schiffe ticken sonst weiter. SWU hat heute keine Tickwirkung. Außerdem gilt die 7-Tage-Sperre in STU ab der letzten Aktivierung, in SWU ab dem Ende des letzten Urlaubs.

## STU-Quellen

- `src/Module/Tick/Colony/ColonyTickManager.php` (Z. 60 f.: Kolonie nur ohne wirksamen Urlaub)
- `src/Module/Tick/Spacecraft/ManagerComponent/CrewLimitations.php` (Z. 46 f.)
- `src/Module/Tick/Spacecraft/ManagerComponent/RepairActions.php` (Z. 153)
- `src/Module/PlayerSetting/Action/ActivateVacation/ActivateVacation.php` (Sperre 7 Tage ab `vacationRequestDate`)

## SWU-Pfade

- `apps/backend/src/modules/tick/tick.service.ts#handleTick` (Kolonie-Schleife, Schiffs-Tick)
- `apps/backend/src/modules/colony/colony-tick-processor.service.ts#processTick`
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts#processTick`
- `apps/backend/src/modules/settings/settings.service.ts#activateVacation` (`VACATION_COOLDOWN_MS`)

## Akzeptanzkriterien

- [x] Kolonien wirksamer Urlauber werden im Haupttick vollständig übersprungen (inkl. Bauabschluss-Prüfung im Haupttick; der minütliche Bauabschluss läuft weiter); Schiffe ticken weiter ohne Crewlimit-Folgen und ohne passive Reparaturaktionen; Forschung pausiert, weil keine Punkte erzeugt werden.
- [x] Die 7-Tage-Sperre zählt ab dem Zeitpunkt der letzten Aktivierung (Feld z. B. `vacationRequestedAt`, per Migration aus vorhandenen Daten befüllt); `VACATION_COOLDOWN_MS` wird darauf umgestellt; die Fehlermeldung nennt die Resttage.
- [x] Backend-Tests: Urlauberkolonie bleibt im Tick unverändert, Nicht-Urlauber werden verarbeitet, Urlaub < 48 h zählt als aktiv; Sperrfrist-Grenzwerte ab Aktivierung (kurzer Login setzt die Frist nicht zurück).

## Entscheidung

Vorgabe:
1. Tickwirkung (a), wie STU: Kolonie-Tick wirksamer Urlauber pausiert komplett; Schiffe ticken ohne Crewlimit-Folgen und ohne passive Reparatur weiter.
2. Sperrfrist (a), wie STU: 7 Tage ab der letzten Aktivierung (`vacationRequestDate`-Pendant), nicht ab Urlaubsende.

## Comments

- 2026-10-21 Product Owner: Option 1a, 2a – Urlaub wirkt wie in STU: Der Kolonie-Tick pausiert komplett, Schiffe ticken ohne Crewlimit-Folgen und ohne passive Reparatur weiter (1a); die 7-Tage-Sperre zählt ab der letzten Aktivierung (2a).
- 2026-10-23: Haupttick überspringt Urlauberkolonien und Schiffsreparaturen, behält den übrigen Schiffstick bei; `vacationRequestedAt` steuert nach Migration die Sperrfrist. Keine offenen Folgepunkte.
