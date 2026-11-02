# Orbitauftrag im Feldkontext und in der Schiff-UI

**Status:** ready-for-agent
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

- [ ] Der Field Context liefert den effektiven flottenweiten aktuellen Orbitauftrag sowie für Verteidigen, Blockieren und Beenden serverseitig berechnete Verfügbarkeit und stabile deutsche Ablehnungsgründe.
- [ ] Die Projektion verwendet dieselbe zentrale Policy wie die Mutationen aus `sc-WP-UI-3a1`; das Frontend berechnet keine fachliche Berechtigung nach.
- [ ] `FieldContextPanel` zeigt zustandsabhängig „Kolonie verteidigen“, „Kolonie blockieren“, „Verteidigung beenden“ oder „Blockade beenden“.
- [ ] Nicht verfügbare Aktionen sind deaktiviert und zeigen den serverseitigen Grund.
- [ ] Erfolg und Fehler aktualisieren Feldkontext und Darstellung ohne Seitenwechsel oder veralteten lokalen Zustand.
- [ ] Shared DTOs bilden Auftrag, Verfügbarkeit und Gründe typisiert ab.
- [ ] Backend-Tests decken Projektion für erlaubte und abgelehnte Zustände sowie den flottenweiten Auftrag ab; Frontend-Tests decken Verfügbarkeit, Ablehnungsgrund und Zustandswechsel ab.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Dieses Issue besitzt ausschließlich autoritative Read-Model-Projektion und Schiff-UI. Mutation und zentrale Fachpolicy werden zuerst in `sc-WP-UI-3a1` umgesetzt.
