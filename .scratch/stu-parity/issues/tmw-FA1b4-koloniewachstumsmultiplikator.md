# Fraktionsmultiplikator für Koloniewachstum

**Status:** claimed
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

- [ ] Der autoritative Kolonietick liest `colonyGrowthMultiplier` aus der aktuellen Eigentümerfraktion der Kolonie.
- [ ] Der Multiplikator wird genau einmal auf das berechnete positive Basiswachstum angewandt, bevor Bevölkerungs- und Kapazitätsgrenzen greifen.
- [ ] Negative Änderungen durch Überbelegung, Auswanderung oder andere Folgen werden nicht als Bonuswachstum multipliziert.
- [ ] Die Rundungsregel ist zentral und deterministisch: Nach Multiplikation wird auf ganze Bevölkerung abgerundet; die bestehenden Unter- und Obergrenzen bleiben wirksam.
- [ ] Faktor `1` bewahrt das bestehende Verhalten; ein Eigentümerwechsel verwendet beim nächsten Tick die Fraktion des neuen Eigentümers.
- [ ] Backend-Tests decken beide Fraktionen, Faktor `1`, Rundung, Kapazitätsgrenze, negative Änderungen und Eigentümerwechsel ab.
- [ ] `docs/faction-modifiers.md` nennt den tatsächlichen Verbraucher und die Rundungsregel.

## Entscheidung

Option 2a: Der konfigurierte Fraktionsmultiplikator wirkt zur Laufzeit im Koloniewachstum. Handel bleibt ausgeschlossen und wird gemäß `tmw-T13` separat behandelt.
