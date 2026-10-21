# Hyperantriebs-Booster (Pendant zum STU-Warpantrieb-Boost)

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

STU lädt mit dem Spezialsystem „Warpantrieb-Booster“ sofort ein Drittel der maximalen Warpantriebsladung nach und deaktiviert das System danach. SWU erhält ein Star-Wars-Pendant für den Hyperantrieb (Name wählt der Agent nach Leitplanke 2 und dokumentiert ihn unter „Entscheidungen“ in `map.md`).

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/WarpdriveBoost/WarpdriveBoost.php` (`+round(max/3)`, gedeckelt auf Max, danach Deaktivierung mit Cooldown)
- `Component/Spacecraft/System/Type/WarpdriveBoosterShipSystem.php`, `html/spacecraft/system/WARPDRIVE_BOOSTER.twig`

## SWU-Pfade

- `packages/shared/src/lib/spacecraft/index.ts` (`SPACECRAFT_RUNTIME_SYSTEM_KEYS`)
- `apps/backend/src/modules/spacecraft/spacecraft-runtime-state.service.ts` (`getRuntimeSystemsForModule`)
- `apps/backend/src/modules/spacecraft/spacecraft-engineering.service.ts`, `spacecraft.controller.ts`
- `game-data/data/modules/special.yaml`, `game-data/data/fabrication/stu-fabrication.yaml` (Submodul, eigener Commit)
- `apps/frontend/src/components/spacecraft/ShipControlCenter.tsx`, `ReactorPanel.tsx`

## Akzeptanzkriterien

- [ ] SW-Name und Moduldefinition (Kategorie SPECIAL, Forschung, Kosten) in `game-data`; Entscheidung in `map.md` festgehalten.
- [ ] Neuer Laufzeitsystem-Schlüssel, nur bei verbautem Modul vorhanden.
- [ ] Aktion „Booster zünden“ erhöht den Hyperantrieb um `round(max/3)` (max. bis Maximum), setzt das System inaktiv mit Cooldown und meldet die Menge.
- [ ] Abgelehnt bei Cooldown, zerstörtem System oder fehlender Crew.
- [ ] Backend-Tests für Regel und Ablehnung; Frontend-Test für den Knopf.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
