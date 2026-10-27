# Kolonie verteidigen und blockieren direkt vom Schiff

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Steht der eigene Flottenführer im Orbit einer belegten Kolonie, kann der Spieler wie in STU direkt im Feldkontext „Kolonie verteidigen“ oder „Kolonie blockieren“ starten und beenden. Beide Aufträge sind unabhängig von Eigentum und Beziehung der Kolonie zulässig; die Mutation ist schiffsbezogen, der Auftrag gilt für die Flotte.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `html/spacecraft/control/control_mid.twig` (`B_START_DEFENDING`, `B_STOP_DEFENDING`, `B_START_BLOCKING`, `B_STOP_BLOCKING`)
- `Module/Ship/Action/ColonyDefending`, `Module/Ship/Action/ColonyBlocking`

## SWU-Pfade

- `apps/frontend/src/components/spacecraft/FieldContextPanel.tsx`, `FieldContextPanel.spec.tsx`
- `apps/backend/src/modules/colony/colony.controller.ts` (bestehende Colony-Routen nur als Kompatibilitätsalias)
- `apps/backend/src/modules/colony/colony-orbit.service.ts` (zentrale Policy für alle Routen)
- `apps/backend/src/modules/spacecraft/ship-colony-context.service.ts` (Feld-/Kolonie-Kontext)
- `packages/shared/src/lib/spacecraft/` (schiffsbezogener Orbit-Order-Vertrag)

## Akzeptanzkriterien

- [ ] Kanonische schiffsbezogene API startet `DEFEND` oder `BLOCKADE` für eine belegte Kolonie im aktuellen Orbit und beendet den aktuellen Auftrag. Bestehende Colony-Routen dürfen nur als Kompatibilitätsalias auf dieselbe zentrale Policy delegieren.
- [ ] Verteidigung und Blockade sind für eigene, freundliche, neutrale und feindliche belegte Kolonien gleichermaßen zulässig; Eigentum und Relationship-Resolver sind keine Zulässigkeitsbedingung. Freie/unbesessene Kolonien bleiben ausgeschlossen.
- [ ] Actor besitzt das initiierende Schiff; das Schiff ist unzerstörter Flottenführer, befindet sich im Zielorbit und erfüllt den erforderlichen Idle-/Aktionszustand. Auftrag und Clear gelten für die gesamte Flotte.
- [ ] Effektiver Urlaub des Kolonieeigners verhindert den Start. Bestehende Verteidigung verhindert Blockade und bestehende Blockade verhindert Verteidigung; eine Flotte mit anderem Orbitauftrag kann keinen weiteren starten.
- [ ] Blockade wird zusätzlich abgelehnt, wenn Energiephalanx, Partikelphalanx oder Antipartikel-System der Kolonie aktiv ist. Verteidigung besitzt diese Orbitalverteidigungssperre nicht.
- [ ] Field Context liefert den effektiven flottenweiten aktuellen Auftrag sowie für Verteidigen, Blockieren und Beenden serverseitig berechnete Verfügbarkeit und deutsche Ablehnungsgründe.
- [ ] `FieldContextPanel` zeigt zustandsabhängig „Kolonie verteidigen“, „Kolonie blockieren“, „Verteidigung beenden“ oder „Blockade beenden“, deaktivierte Aktionen mit Grund und aktualisiert Erfolg/Fehler ohne Seitenwechsel.
- [ ] Backend-Tests decken eigene/Friend/Neutral/Enemy-Kolonie, freie Kolonie, Urlaub, gegensätzlichen Auftrag, Orbitalverteidigung und flottenweiten Zustand ab; Frontend-Tests decken Verfügbarkeit, Ablehnungsgrund und Zustandswechsel ab.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

SWU übernimmt das bestätigte STU-Verhalten exakt: Haltung und Eigentum filtern weder Verteidigung noch Blockade. Die kanonische Mutation ist schiffsbezogen und die resultierende Order flottenbezogen. Urlaub, gegensätzliche Order und bei Blockade aktive Orbitalverteidigung bleiben die fachlichen Sperren; der Feldkontext liefert Zustand und Gründe serverseitig.

## Comments

- 2026-10-22: Blockiert durch eine fehlende Produkt-/Backendentscheidung: Die vorhandenen Kolonie-Orbit-Endpunkte setzen in `ColonyOrbitService.setOrbitAssignment` für Verteidigung und Blockade zwingend `assertOwnedColony(colony)` voraus. Damit kann ein Schiff nur die eigene Kolonie verteidigen oder blockieren; das Akzeptanzkriterium verlangt dagegen eine Blockade fremder Kolonien abhängig von der Haltung. Soll der bestehende Endpunkt für fremde Kolonien geöffnet werden (und wenn ja: nur bei Haltung `ENEMY` oder auch `NEUTRAL`), oder soll ein eigener schiffsseitiger Endpunkt eingeführt werden? Die begonnenen Produktcode-/Teständerungen wurden gemäß Abbruchregel verworfen.
- 2026-10-27 Product Owner: Exakte STU-Regel: Jede belegte Kolonie kann unabhängig von Eigentum und Haltung verteidigt oder blockiert werden. Die API ist kanonisch schiffsbezogen, die Order flottenbezogen; Urlaub, Gegenorder und Blockade-Orbitalverteidigung werden geprüft.
