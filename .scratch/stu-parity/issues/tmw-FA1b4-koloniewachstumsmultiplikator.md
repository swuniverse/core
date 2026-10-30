# Fraktionsmultiplikator für Koloniewachstum

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** tmw-FA1a

## Ziel

Der `colonyGrowthMultiplier` einer Fraktion wirkt im Kolonietick auf positives Bevölkerungswachstum.

## SWU-Pfade

- `apps/backend/src/modules/faction/`
- Kolonietick und Bevölkerungswachstum unter `apps/backend/src/modules/colony/` und `apps/backend/src/modules/tick/`
- `docs/faction-modifiers.md`

## Akzeptanzkriterien

- [x] Der autoritative Kolonietick liest `colonyGrowthMultiplier` aus der aktuellen Eigentümerfraktion der Kolonie.
- [x] Der Multiplikator wird genau einmal auf das berechnete positive Basiswachstum angewandt, bevor Bevölkerungs- und Kapazitätsgrenzen greifen.
- [x] Negative Änderungen durch Überbelegung, Auswanderung oder andere Folgen werden nicht als Bonuswachstum multipliziert.
- [x] Die Rundungsregel ist zentral und deterministisch: Nach Multiplikation wird auf ganze Bevölkerung abgerundet; die bestehenden Unter- und Obergrenzen bleiben wirksam.
- [x] Faktor `1` bewahrt das bestehende Verhalten; ein Eigentümerwechsel verwendet beim nächsten Tick die Fraktion des neuen Eigentümers.
- [x] Backend-Tests decken beide Fraktionen, Faktor `1`, Rundung, Kapazitätsgrenze, negative Änderungen und Eigentümerwechsel ab.
- [x] `docs/faction-modifiers.md` nennt den tatsächlichen Verbraucher und die Rundungsregel.

## Entscheidung

Option 2a: Der konfigurierte Fraktionsmultiplikator wirkt zur Laufzeit im Koloniewachstum. Handel bleibt ausgeschlossen und wird gemäß `tmw-T13` separat behandelt.

## Comments

`ColonyTickProcessorService.growPopulation` liest pro Tick die aktuelle Eigentümerfraktion, multipliziert ausschließlich positives Basiswachstum einmalig und rundet vor den bestehenden Kapazitätsgrenzen ab. Tests decken beide Fraktionen, Faktor 1, Rundung, Grenzen, negative Migration und Eigentümerwechsel ab; die Verbraucherdokumentation wurde aktualisiert. Die fokussierte Kolonietick-Suite und alle Builds sind grün. Der globale Affected-Gate bleibt ausschließlich wegen bereits vorhandener, fachfremder Fixture-Fehler in `wreck-decay.service.spec.ts`, `tutorial.service.spec.ts` und `spacecraft-core-controls.spec.ts` rot.
