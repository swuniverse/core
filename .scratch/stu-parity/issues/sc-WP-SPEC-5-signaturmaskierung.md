# Signaturmaskierung für Flugsignaturen

**Status:** needs-triage
**Priority:** P3
**Size:** M
**Blocked by:** sc-WP-NAV-2a, tmw-D6b

## Ziel

Eine Signaturmaskierung bildet die falsche STU-Warpsignatur im feldweisen SWU-Galaxieflug ab. Ein Schiff kann gegen EPS für fünf Minuten das Signaturprofil eines dem Spieler bekannten Spacecraft-Rumpfs emittieren; währenddessen neu erzeugte Flugsignaturen zeigen Beobachtern diesen Rumpf statt des tatsächlichen.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Ship/Action/FakeWarpSignature/FakeWarpSignature.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/`
- `apps/backend/src/modules/starmap/`
- `apps/frontend/src/pages/spacecraft/`
- `packages/shared/`
- `game-data/data/modules/special.yaml`

## Akzeptanzkriterien

- [ ] Ein geeignetes Schiff kann nur einen persönlich entdeckten, von seinem echten Rumpf verschiedenen Spacecraft-Rumpf wählen.
- [ ] Aktivierung kostet `25 × Antriebsstufe` EPS und hält fünf Minuten; fehlende EPS oder ein defekter Antrieb verhindern sie.
- [ ] Nur nach der Aktivierung erzeugte Flugsignaturen tragen den maskierten Rumpf; Eigentümer-, Zeit- und Richtungsdaten bleiben unverändert.
- [ ] Nach Ablauf oder Deaktivierung werden wieder echte Rumpfdaten verwendet; bestehende Signaturen bleiben historische Snapshots.
- [ ] Shared-DTOs und Schiff-UI zeigen Auswahl, Kosten und verbleibende Dauer.
- [ ] Service- und Integrationstests decken Wissen, Kosten, Ablauf und Signaturdarstellung ab.

## Comments
