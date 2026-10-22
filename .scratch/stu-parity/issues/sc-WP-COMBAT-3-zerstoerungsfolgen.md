# Zerstörungsfolgen: Prestige, intakte Module, History

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Wie in STU erhält der Zerstörer Prestige nach dem Rumpfwert, die Hälfte der intakten Module bleibt im Wrack bergbar, und die Zerstörung erzeugt einen History-Eintrag. Deckt die Prestigequelle „Zerstörung“ aus soc-G3 und den Schiffsteil von soc-H2 ab. Crew-Evakuierung liegt in sc-WP-CREW-3a.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Lib/Destruction/Handler/PrestigeGain.php` (Rumpf-Prestige; leere Rettungskapseln ×5 negativ; Systemnachricht bei negativem Wert)
- `Module/Spacecraft/Lib/Destruction/Handler/LeaveIntactModules.php` (`ceil(intakte/2)` Module ins Trümmerfeld; nicht bei Shuttles)
- `Module/Spacecraft/Lib/Destruction/Handler/HistoryEntryCreation.php`
- `Orm/Entity/SpacecraftRump.php` (`prestige`)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft-destruction.service.ts` (`finalizeInManager`, `destroyFromCombat`, `selfDestruct`)
- `apps/backend/src/modules/prestige/prestige.service.ts`, `prestige.constants.ts`
- `apps/backend/src/modules/events/game-event.service.ts` (`recordSpacecraft`)
- `apps/backend/src/modules/spacecraft/entities/spacecraft-wreck.entity.ts`, `ship-class-def.entity.ts`
- `game-data/data/ship-building/stu-rump-stats.yaml` bzw. `ship-classes.yaml` (Prestigewert je Klasse, Submodul)
- `apps/frontend/src/components/spacecraft/NearbySensorPanel.tsx` (Wrackbergung)

## Akzeptanzkriterien

- [x] Jede Schiffsklasse hat einen Prestigewert, abgeleitet aus den STU-Rumpfdaten (Quelle dokumentiert).
- [x] Zerstörung im Kampf schreibt dem Zerstörer diesen Wert gut (Prestige-Log mit Beschreibung); Selbstzerstörung ohne Zerstörer gibt keinen Gewinn.
- [x] Das Wrack speichert `ceil(n/2)` zufällig gewählte intakte Module (Integrität > 0); diese sind wie Fracht bergbar und landen im Lager des Bergenden.
- [x] Ein globales Ereignis bzw. History-Eintrag nennt Zerstörer, Opfer und Klasse (bestehendes `recordSpacecraft` erweitern).
- [x] Backend-Tests für Prestige, Modulbergung und Ereignis; Frontend-Test für Module im Wrack.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-10-22: STU-Prestigewerte aus `dist/db/stu.dump` (`stu_rumps.prestige`) für alle 42 SWU-Schiffsklassen übernommen; Kampfprestige, zufällige Modulbergung und History-Eintrag umgesetzt und validiert.
