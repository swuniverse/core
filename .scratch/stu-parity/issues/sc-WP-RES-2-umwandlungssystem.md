# Ressourcen-Umwandlungssystem (Pendant zum STU-Aggregationssystem)

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** sc-WP-RES-1

## Ziel

STU wandelt mit dem Aggregationssystem gesammelte Rohstoffe im Tick in Folgewaren um (auch als Stationsaktion `TransformResources`), sofern der Spieler die Zielware produzieren kann. Umsetzung des SW-Pendants (Name nach Leitplanke 2, in `map.md` dokumentiert) nach Entscheidung in sc-WP-RES-1.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Component/Spacecraft/System/Type/AggregationSystemShipSystem.php`, `Module/Tick/Spacecraft/Handler/AggregationSystemHandler.php`
- `Module/Station/Action/TransformResources` (Zielware nur, wenn produzierbar: `canProduceCommodity`)
- `Module/Spacecraft/View/ShowSystemSettings/*`, `html/ship/aggregationsystem.twig`

## SWU-Pfade

- Sammelsystem aus sc-WP-RES-1, `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`processTick`)
- `apps/backend/src/modules/game-data/game-data.service.ts` (Produzierbarkeit über Gebäude)
- `game-data/data/modules/` (Submodul)

## Akzeptanzkriterien

- [ ] Modul, Laufzeitsystem und Einstellungsfenster (Quell-/Zielware) mit STU-Umwandlungstabelle.
- [ ] Umwandlung im Tick nur für Waren, die der Spieler laut Gebäuden produzieren kann; sonst Meldung.
- [ ] Gleiche Aktion an Stationen (sofern sc-WP-STAT-2 erledigt).
- [ ] Backend-Tests, Frontend-Test.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
