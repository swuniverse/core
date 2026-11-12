# Flugfolgen für alle Flottenschiffe

**Status:** needs-triage
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Die Flugfolgen-Pipeline aus `tmw-K1a` läuft beim Galaxie- und Systemflug sowie beim Systemein- und -austritt nur für das führende Schiff. Flottenmitglieder erleiden daher keine Feldeffekte und keine Anomaliefolgen (z. B. Ionensturm-Einflugschaden aus `tmw-K10b2`). STU wendet die Flugfolgen je Schiff der Flotte an. Der Wurmlochpfad verarbeitet bereits jedes Schiff.

## STU-Quellen

- `src/Module/Spacecraft/Lib/Movement/ShipMover.php` (Konsequenzen je bewegtem Schiff)
- `src/Module/Spacecraft/Lib/Movement/Component/Consequence/`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`navigate`, `flyGalaxy`, `enterSystem`, `leaveSystem`, Ankunft in `processMovement`)
- `apps/backend/src/modules/spacecraft/flight-consequence-pipeline.ts`

## Akzeptanzkriterien

- [ ] Jede Feldtransition ruft die Pipeline für jedes bewegte Schiff der Flotte einmal auf; das führende Schiff wird nicht doppelt verarbeitet.
- [ ] Ein durch eine Folge zerstörtes Flottenmitglied wird weder weiterbewegt noch erneut gespeichert; die übrige Flotte fliegt konsistent weiter bzw. stoppt nach den Regeln aus `sc-WP-COMBAT-1a`.
- [ ] Backend-Tests: Feldeffekt und Ionensturm-Einflug treffen jedes Flottenmitglied genau einmal je Feld.

## Comments

- 2026-11-12: Bei der Umsetzung von `tmw-K10b2` gefunden. Bitte die STU-Semantik in `ShipMover` bei der Triage gegenprüfen und die Abgrenzung zu `sc-WP-COMBAT-1a` festlegen.
