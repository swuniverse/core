# Auswanderung bei Überbelegung und Bevölkerungslimit

**Status:** resolved
**Priority:** P1
**Size:** S
**Blocked by:** —

## Ziel

SWU kennt nur Bevölkerungswachstum: Sinkt der Wohnraum (z. B. durch abgeschaltete Wohngebäude) oder senkt der Spieler das Bevölkerungslimit, bleibt die Bevölkerung trotzdem bestehen. In STU wandern dann Arbeitslose aus. Das Issue portiert `ProceedMigration` in den Kolonie-Tick.

## STU-Quellen

- `src/Module/Tick/Colony/Component/ProceedMigration.php`:
  - Bevölkerung > Wohnraum (`maxBev`) und Arbeitslose > 0 → `random_int(1, workless)` Arbeitslose wandern aus, Meldung „%d Einwohner sind ausgewandert“, danach **kein** Wachstum in diesem Tick.
  - Sonst, wenn Bevölkerungslimit > 0, Bevölkerung > Limit und Arbeitslose > 0 → Arbeitslose auf `max(0, limit - workers)` kürzen, Meldung „Es sind %d Arbeitslose ausgewandert“ bzw. „Es sind alle Arbeitslosen ausgewandert“; danach Wachstum wie gewohnt.
- `src/Module/Colony/Action/SetPopulationLimit/`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-tick-processor.service.ts` (`calculatePopulationGrowth`, `growPopulation`)
- `apps/backend/src/modules/colony/entities/colony-changeable.entity.ts` (`workless`, `populationLimit`, `maxPopulation`)
- `apps/backend/src/modules/colony/colony-settings.service.ts` (`setPopulationLimit`)
- `apps/backend/src/modules/messaging/colony-event.types.ts`, `colony-event.service.ts` (neuer Ereignistyp, z. B. `EMIGRATION`)

## Akzeptanzkriterien

- [x] Ist die Bevölkerung größer als der Wohnraum und gibt es Arbeitslose, wandert im Tick eine zufällige Zahl zwischen 1 und der Zahl der Arbeitslosen aus; in diesem Tick gibt es kein Wachstum.
- [x] Ist ein Bevölkerungslimit gesetzt und überschritten, werden die Arbeitslosen auf `max(0, Limit − Arbeiter)` gekürzt; danach läuft das Wachstum wie bisher.
- [x] Arbeiter (beschäftigte Bevölkerung) wandern nie aus.
- [x] Jede Auswanderung erzeugt eine Kolonie-Nachricht mit den STU-Texten (Ordner „Kolonien“).
- [x] `setPopulationLimit` akzeptiert weiterhin Werte unterhalb der aktuellen Bevölkerung; die Einstellungs-UI weist darauf hin, dass Arbeitslose im nächsten Tick auswandern.
- [x] Backend-Tests (Zufall per Injektion/Mock deterministisch): Überbelegung, Limit mit freien Plätzen, Limit ohne freie Plätze, keine Arbeitslosen, kein Wachstum im Überbelegungstick.

## Comments

Implemented STU-style unemployed emigration in the colony tick, including deterministic backend coverage, colony-folder messages, and a population-limit warning in the colony settings panel. No follow-up gaps identified.
