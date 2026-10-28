# Transferstörsender gegen Waren- und Crewtransfer

**Status:** needs-triage
**Priority:** P3
**Size:** S
**Blocked by:** sc-WP-ENG-2c

## Ziel

Ein Transferstörsender bildet den STU-Beam-Blocker ab. Das passive, dauerhaft aktive Spacecraft-System verhindert Waren- und Crewtransfer zum beziehungsweise vom ausgerüsteten Spacecraft, ohne Docking, Kampf oder normale Kommunikation zu sperren.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Component/Spacecraft/System/Type/BeamBlockerShipSystem.php`
- Transferprüfungen für `SpacecraftSystemTypeEnum::BEAM_BLOCKER` im STU-Transfermodul

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/`
- `apps/frontend/src/pages/spacecraft/`
- `packages/shared/`
- `game-data/data/modules/special.yaml`

## Akzeptanzkriterien

- [ ] Transferstörsender ist nach Einbau immer aktiv und hat keinen manuellen Schalter oder EPS-Verbrauch.
- [ ] Alle Waren-, Reaktorladungs- und Crewtransferpfade prüfen Quelle und Ziel zentral und lehnen bei intaktem Störsender atomar ab.
- [ ] Zerstörung des Systems hebt die Sperre auf; Reparatur aktiviert sie wieder.
- [ ] Die Ablehnung nennt den Transferstörsender als Grund und die Spacecraft-UI zeigt den passiven Zustand.
- [ ] Service- und Integrationstests decken sämtliche Transferarten, beide Richtungen und den Schadenszustand ab.

## Comments
