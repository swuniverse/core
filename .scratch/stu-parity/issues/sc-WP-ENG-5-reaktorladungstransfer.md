# Reaktorladungstransfer zwischen Schiffen

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** sc-WP-ENG-2c

## Ziel

Pendant zum STU-„Warpkern-Ladungstransfer“: Ein Schiff mit entsprechendem Spezialmodul überträgt Reaktorladung an ausgewählte Schiffe am Feld. Name des Moduls wählt der Agent (Leitplanke 2) und hält ihn in `map.md` fest.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/TransferWarpcoreCharge/TransferWarpcoreCharge.php` (System nötig; Warpantrieb und Schilde aus; Ladung > 0; Ziele ungetarnt, gleiche Position; PM an fremde Eigner)
- `Module/Spacecraft/View/ShowWarpcoreChargeTransfer`, `html/spacecraft/warpcoreChargeTransfer.twig`
- `Component/Spacecraft/System/Type/WarpCoreTransferShipSystem.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft-engineering.service.ts`, `reactor-fuel-profile.ts`
- `packages/shared/src/lib/spacecraft/index.ts`, `spacecraft-runtime-state.service.ts`
- `game-data/data/modules/special.yaml` (Submodul)
- `apps/frontend/src/components/spacecraft/ReactorPanel.tsx`

## Akzeptanzkriterien

- [ ] Modul, Laufzeitsystem und SW-Name existieren; Entscheidung in `map.md`.
- [ ] Transfer an mehrere Ziele mit STU-Vorbedingungen; Prüfung über sc-WP-ENG-2c.
- [ ] Fremde Eigner erhalten eine Systemnachricht.
- [ ] Backend-Tests, Frontend-Test.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
