# Flottenkontrolle in der Schiffsansicht wie STU

**Status:** claimed
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

STU `src/html/spacecraft/control/control_mid.twig` Z. 99–140: Der Flottenführer sieht in der Mitte die Tabelle „Flottenkontrolle“ (Aktivieren | Deaktivieren | Alarmstufe), rechts die Mitglieder (`fleetInfo`, umgesetzt in sc-AUD-23).

## Akzeptanzkriterien

- [x] Block „Flottenkontrolle“ unter der Schiffskontrolle, nur für den Flottenführer (`isFleetLeader`).
- [x] Aktivieren/Deaktivieren je Flotte für Nahbereichssensoren, Schilde, Strahlenwaffen, Torpedobänke, Tarnung, Hyperantrieb über `PATCH fleets/:id/systems/:key`; „Hyperantrieb aktivieren“ nur bei `isWarpPossible` (Hyperantrieb vorhanden, außerhalb eines Systems).
- [x] Alarmstufe Grün/Gelb/Rot für die Flotte über `PATCH fleets/:id/alert-state`.
- [x] Fehlschläge je Schiff als „Schiff: Grund“.
- [x] Icons `kss2`, `shldac1/2`, `act_phaser2`, `act_torp2`, `warp1/2` aus STU (Submodul `assets`).

## Comments

### 2026-11-24 — umgesetzt, Prüfung ausstehend

- Kein Backend-Umbau (Endpunkte aus sc-AUD-05a).
- Tests: neu `FleetControlPanel.spec.tsx` (6). Vitest `components/spacecraft` + `spacecraft-detail` 267/267; `nx typecheck frontend` ✓.
- Ausstehend: gesammelter Verifikationslauf.
- Modell: Claude Opus 5.5 direkt.
