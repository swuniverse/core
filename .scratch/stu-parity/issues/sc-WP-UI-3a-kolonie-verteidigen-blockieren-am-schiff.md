# Kolonie verteidigen und blockieren direkt vom Schiff

**Status:** needs-info
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Steht ein Schiff im Orbit einer Kolonie, kann der Spieler wie in STU direkt im Feldkontext des Schiffs „Kolonie verteidigen“ bzw. „Kolonie blockieren“ starten und beenden. Das Backend existiert bereits über die Kolonie-Orbit-Endpunkte.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `html/spacecraft/control/control_mid.twig` (`B_START_DEFENDING`, `B_STOP_DEFENDING`, `B_START_BLOCKING`, `B_STOP_BLOCKING`)
- `Module/Ship/Action/ColonyDefending`, `Module/Ship/Action/ColonyBlocking`

## SWU-Pfade

- `apps/frontend/src/components/spacecraft/FieldContextPanel.tsx`, `FieldContextPanel.spec.tsx`
- `apps/backend/src/modules/colony/colony.controller.ts` (`:id/orbit/ships/:shipId/defend`, `:id/orbit/ships/:shipId/blockade`)
- `apps/backend/src/modules/colony/colony-orbit.service.ts`
- `apps/backend/src/modules/spacecraft/ship-colony-context.service.ts` (Feld-/Kolonie-Kontext)

## Akzeptanzkriterien

- [ ] Eigene Kolonie im Orbit: Knopf „Kolonie verteidigen“ bzw. „Verteidigung beenden“ je nach Zustand.
- [ ] Fremde Kolonie: Knopf „Kolonie blockieren“ bzw. „Blockade beenden“, nur wenn die Haltung es laut vorhandener Backend-Regel erlaubt; sonst deaktiviert mit Grund im `title`.
- [ ] Der Feld-Kontext liefert den aktuellen Verteidigungs-/Blockadezustand des Schiffs; ein Backend-Test deckt das ab, falls dafür ein Feld ergänzt wird.
- [ ] Erfolg/Fehler erscheinen als Meldung; der Zustand aktualisiert sich ohne Seitenwechsel.
- [ ] `FieldContextPanel.spec.tsx` prüft beide Knöpfe und den Zustandswechsel.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-10-22: Blockiert durch eine fehlende Produkt-/Backendentscheidung: Die vorhandenen Kolonie-Orbit-Endpunkte setzen in `ColonyOrbitService.setOrbitAssignment` für Verteidigung und Blockade zwingend `assertOwnedColony(colony)` voraus. Damit kann ein Schiff nur die eigene Kolonie verteidigen oder blockieren; das Akzeptanzkriterium verlangt dagegen eine Blockade fremder Kolonien abhängig von der Haltung. Soll der bestehende Endpunkt für fremde Kolonien geöffnet werden (und wenn ja: nur bei Haltung `ENEMY` oder auch `NEUTRAL`), oder soll ein eigener schiffsseitiger Endpunkt eingeführt werden? Die begonnenen Produktcode-/Teständerungen wurden gemäß Abbruchregel verworfen.
