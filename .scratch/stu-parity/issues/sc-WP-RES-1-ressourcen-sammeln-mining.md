# Ressourcen am Feld sammeln (Mining mit Sammelsystem)

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

STU sammelt Ressourcen an geeigneten Kartenfeldern (Nebel, Asteroiden) über den Bussard-Kollektor: Das Schiff wählt eine Ressource am Feld, sammelt im Tick (Zustand `GATHER_RESOURCES`) und bricht beim Flug ab. Ob SWU Mining will und welche Felder/Waren abbaubar sind, ist offen.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Ship/Action/Mining/GatherResources.php` (Bussard-Kollektor nötig, nicht im Warp, Ortswahl, Aktivierung)
- `Component/Ship/Mining/CancelMining.php`
- `Component/Spacecraft/System/Type/BussardCollectorShipSystem.php`, `Module/Tick/Spacecraft/Handler/BussardCollectorHandler.php`, `html/ship/bussardcollector.twig`

## SWU-Pfade

- `apps/backend/src/modules/starmap/entities/galaxy-field-type.entity.ts`, `galaxy-field.entity.ts` (Feldressourcen fehlen)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`processTick`, Flug), `packages/shared/src/lib/spacecraft/index.ts`
- `game-data/data/modules/` (Sammelsystem-Modul, Submodul)

## Akzeptanzkriterien

- [ ] Feldtypen tragen abbaubare Waren und Raten (Nebel → Tibanna-Gas bzw. weitere Gase, Asteroidenfelder → Erze; Daten in `game-data` bzw. Admin-Editor).
- [ ] Sammelsystem-Modul mit SW-Name (Leitplanke 2, in `map.md` dokumentiert) und Laufzeitsystem; Systemeinstellungsfenster zur Ressourcenwahl.
- [ ] Sammeln im Tick bis Lager voll; Flug bricht ab (Meldung).
- [ ] Backend-Tests, Frontend-Test.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Vorgabe: Variante (a), wie STU mit Star-Wars-Waren: Nebel liefern Gase (insbesondere Tibanna-Gas), Asteroidenfelder Erze; Sammeln per Spezialsystem (Pendant zum Bussard-Kollektor, Name nach Leitplanke 2). sc-WP-RES-2 bleibt damit im Scope.

## Comments

- 2026-10-21 Product Owner: Option a – SWU erhält Ressourcensammeln wie STU: Nebel liefern Gase (Tibanna-Gas), Asteroidenfelder Erze, gesammelt per Spezialsystem.
