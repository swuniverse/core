# Dynamische Fraktionsmultiplikatoren für Schiffswerte

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** tmw-FA1a

## Ziel

Rumpf-, Schild- und Frachtmultiplikatoren der aktuellen Eigentümerfraktion wirken in allen autoritativen Schiffswertberechnungen, ohne effektive Werte am Schiff einzufrieren.

## SWU-Pfade

- `apps/backend/src/modules/faction/`
- `apps/backend/src/modules/spacecraft/spacecraft-stats.service.ts`
- Schiffswert-DTOs und Verbraucher unter `apps/backend/src/modules/spacecraft/` und `packages/shared/`
- `docs/faction-modifiers.md`

## Akzeptanzkriterien

- [ ] `hullMultiplier`, `shieldMultiplier` und `cargoMultiplier` werden zentral aus der aktuellen Eigentümerfraktion gelesen und in der autoritativen Statistikprojektion angewandt.
- [ ] Persistierte Rumpf-, Modul- und Bauplan-Basiswerte bleiben unverändert; es werden keine fraktionsabhängigen Effektivwerte beim Spawn gespeichert.
- [ ] Alle API- und Regelpfade verwenden dieselbe effektive Statistik, insbesondere Maximalhülle, maximale Schildkapazität und Frachtraumkapazität.
- [ ] Aktuelle Werte werden bei einer sinkenden Maximalgrenze deterministisch auf das neue Maximum begrenzt; es entstehen keine negativen oder übervollen Kapazitäten.
- [ ] Ein Eigentümerwechsel verwendet ohne Datenmigration die Fraktion des neuen Eigentümers.
- [ ] Ungültige oder fehlende Multiplikatoren fallen nicht still auf unsichere Werte zurück, sondern verwenden den bestehenden validierten Fraktionsvertrag.
- [ ] Backend-Tests decken beide Fraktionen, alle drei Multiplikatoren, Besitzerwechsel und Grenzwertbegrenzung ab.
- [ ] `docs/faction-modifiers.md` dokumentiert die wirksamen Verbraucher.

## Entscheidung

Option 1: Die aktuelle Eigentümerfraktion wird bei jeder autoritativen Statistikberechnung dynamisch angewandt. Basiseigenschaften bleiben persistiert und unverändert.
