# Hypermaterie-Reservekern als Hochkapazitätsreaktor

**Status:** needs-triage
**Priority:** P3
**Size:** M
**Blocked by:** col-A2, sc-WP-ENG-5

## Ziel

Ein Hypermaterie-Reservekern bildet den STU-Singularitätsreaktor als alternativen Hochkapazitätsreaktor ab. Er nutzt dieselbe Reaktor-Laufzeit wie bestehende SWU-Reaktoren, besitzt jedoch eine größere Ladungskapazität und eigene Ladekosten; bei Zerstörung fällt ein vorhandener Hyperantrieb aus.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Component/Spacecraft/System/Type/SingularityShipSystem.php`
- `Component/Spacecraft/System/Data/SingularityCoreSystemData.php`
- `Lib/ModuleRumpWrapper/ModuleRumpWrapperReactor.php`
- Reaktor-Lade- und Ticklogik unter `Module/Spacecraft/Lib/Reactor/`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/`
- `apps/backend/src/modules/tick/`
- `apps/frontend/src/pages/spacecraft/`
- `packages/shared/`
- `game-data/data/modules/special.yaml`

## Akzeptanzkriterien

- [ ] Hypermaterie-Reservekern ist eine alternative, dauerhaft aktive Reaktorart mit datengetriebener Leistung, Kapazität und Laderezeptur.
- [ ] Kapazität und Ladeeinheiten entsprechen funktional dem STU-Singularitätskern; konkrete Star-Wars-Waren werden vor Umsetzung in den Spieldaten festgelegt.
- [ ] Reaktorladung, EPS-Erzeugung, Transfer und Anzeige nutzen die gemeinsamen Reaktorpfade.
- [ ] Zerstörung des Reservekerns deaktiviert den Hyperantrieb; Reparatur startet ihn nicht automatisch ohne erfüllte Startbedingungen.
- [ ] Shared-DTOs und verdichtete Schiff-UI unterscheiden Leistung, Ladung und Kapazität.
- [ ] Service-, Tick- und Integrationstests decken Ladung, Erzeugung, Zerstörung und Reparatur ab.

## Comments
