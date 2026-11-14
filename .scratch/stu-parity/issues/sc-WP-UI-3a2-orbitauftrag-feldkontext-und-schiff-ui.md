# Orbitauftrag im Feldkontext und in der Schiff-UI

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-UI-3a1

## Ziel

Der Schiff-Feldkontext zeigt den flottenweiten Verteidigungs- oder Blockadeauftrag und bietet serverseitig autorisierte Aktionen zum Starten und Beenden direkt im `FieldContextPanel` an.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `html/spacecraft/control/control_mid.twig`
- `Module/Ship/Action/ColonyDefending`
- `Module/Ship/Action/ColonyBlocking`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/ship-colony-context.service.ts`
- `packages/shared/src/lib/spacecraft/`
- `apps/frontend/src/components/spacecraft/FieldContextPanel.tsx`
- `apps/frontend/src/components/spacecraft/FieldContextPanel.spec.tsx`
- API/Policy aus `sc-WP-UI-3a1`

## Akzeptanzkriterien

- [x] Der Field Context liefert den effektiven flottenweiten aktuellen Orbitauftrag sowie für Verteidigen, Blockieren und Beenden serverseitig berechnete Verfügbarkeit und stabile deutsche Ablehnungsgründe.
- [x] Die Projektion verwendet dieselbe zentrale Policy wie die Mutationen aus `sc-WP-UI-3a1`; das Frontend berechnet keine fachliche Berechtigung nach.
- [x] `FieldContextPanel` zeigt zustandsabhängig „Kolonie verteidigen“, „Kolonie blockieren“, „Verteidigung beenden“ oder „Blockade beenden“.
- [x] Nicht verfügbare Aktionen sind deaktiviert und zeigen den serverseitigen Grund.
- [x] Erfolg und Fehler aktualisieren Feldkontext und Darstellung ohne Seitenwechsel oder veralteten lokalen Zustand.
- [x] Shared DTOs bilden Auftrag, Verfügbarkeit und Gründe typisiert ab.
- [x] Backend-Tests decken Projektion für erlaubte und abgelehnte Zustände sowie den flottenweiten Auftrag ab; Frontend-Tests decken Verfügbarkeit, Ablehnungsgrund und Zustandswechsel ab.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Dieses Issue besitzt ausschließlich autoritative Read-Model-Projektion und Schiff-UI. Mutation und zentrale Fachpolicy werden zuerst in `sc-WP-UI-3a1` umgesetzt.

## Comments

- 2026-11-15: Umgesetzt (bf07459c).
  - `SpacecraftFieldContextDto.orbitOrder` (`SpacecraftOrbitOrderViewDto`): aktueller flottenweiter Auftrag (`colonyId`, `fleetId`, `mode`, `colonyName`) sowie `defend`, `blockade`, `stop` als `{ available, reason }`. Gesetzt im Kolonieorbit oder solange die Flotte einen Auftrag hat, sonst `null`.
  - `ColonyOrbitService.getOrbitOrderView` nutzt denselben Startkontext wie die Mutation (ausgelagert nach `orbitOrderStartContext`) und dieselben Funktionen `evaluateOrbitOrderStart`/`evaluateOrbitOrderStop`. Anbindung über den neuen Port `ORBIT_ORDER_VIEW` aus `SpacecraftModule`, den das Kolonie-Modul beim Start füllt (kein Import von Kolonie-Services im Spacecraft-Kern).
  - `FieldContextPanel`: Box „Orbitauftrag“ mit Statuszeile, „Kolonie verteidigen“/„Kolonie blockieren“ bzw. „Verteidigung beenden“/„Blockade beenden“; deaktivierte Aktionen zeigen den Servergrund (Tooltip und Text). Erfolg und Fehler melden das Ergebnis und laden den Feldkontext neu.
  - Tests: `colony-orbit-order-http.int-spec.ts` (Projektion ohne/mit Auftrag aus Leader- und Mitgliedersicht, Ablehnung durch Blockade einer anderen Flotte, kein Auftrag außerhalb des Orbits); `FieldContextPanel.spec.tsx` (Verfügbarkeit und Grund, Beenden, Serverablehnung mit Neuladen).
  - Gates: Lint 0 Fehler (1430/110), Typecheck und Build grün, Backend-Unit 2123/2123, Integration 727/727, Frontend 762/763: der eine Fehler ist `research.spec.tsx` › „opens and closes the detail modal from tree view…“ (Kantenbreite 2.75 statt 1.5) und trat nur unter Last auf; einzeln 5/5 grün, Datei in diesem Issue unverändert. Anderer Testfall als sh-AP-22, Beobachtung für ein mögliches Flake-Issue.

