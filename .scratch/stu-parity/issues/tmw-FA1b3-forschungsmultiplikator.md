# Fraktionsmultiplikator für Forschungspunkte

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** tmw-FA1a

## Ziel

Der `researchMultiplier` einer Fraktion wirkt zentral bei der Erzeugung beziehungsweise Gutschrift von Forschungspunkten.

## SWU-Pfade

- `apps/backend/src/modules/faction/`
- Forschungspunkterzeugung und Forschungstick unter `apps/backend/src/modules/research/` und `apps/backend/src/modules/tick/`
- `docs/faction-modifiers.md`

## Akzeptanzkriterien

- [ ] Die autoritative Erzeugung von Forschungspunkten liest `researchMultiplier` aus der aktuellen Spielerfraktion.
- [ ] Der Multiplikator wird genau einmal auf die Basisproduktion angewandt; Queueverbrauch, gespeicherter Fortschritt und Forschungsabschluss werden nicht nochmals multipliziert.
- [ ] Die Rundungsregel ist zentral und deterministisch: Nach Multiplikation wird auf ganze Forschungspunkte abgerundet, ohne Bruchteile zwischen Ticks zu speichern.
- [ ] Ein Faktor `1` bewahrt das bestehende Verhalten; validierte Faktoren unter beziehungsweise über `1` senken oder erhöhen die Erzeugung entsprechend.
- [ ] Bereits gespeicherte Forschungspunkte und Fortschritte werden nicht rückwirkend verändert.
- [ ] Backend-Tests decken beide Fraktionen, Faktor `1`, Rundung und Schutz vor doppelter Anwendung ab.
- [ ] `docs/faction-modifiers.md` nennt den tatsächlichen Verbraucher und die Rundungsregel.

## Entscheidung

Option 2a: Der konfigurierte Fraktionsmultiplikator wirkt zur Laufzeit an der autoritativen Forschungspunkterzeugung.
