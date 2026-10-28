# Interdiktornetz für Schiffe

**Status:** needs-triage
**Priority:** P3
**Size:** M
**Blocked by:** sc-WP-ENG-2a, sc-WP-COMBAT-3

## Ziel

Ein kanonnahes Interdiktornetz bildet das STU-Energienetz ab: geeignete Schiffe können an einem Ort gemeinsam ein zeitverzögertes Fangfeld um sichtbare Ziele aufbauen, es abbrechen oder nach Fertigstellung auflösen beziehungsweise implodieren lassen. Gefangene Schiffe sind bis zur Freigabe bewegungsunfähig; die Implosion verursacht Kampfschaden und meldet die Folgen den Eigentümern.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Ship/Action/TholianWeb/CreateTholianWeb.php`
- `Module/Ship/Action/TholianWeb/SupportTholianWeb.php`
- `Module/Ship/Action/TholianWeb/UnsupportTholianWeb.php`
- `Module/Ship/Action/TholianWeb/CancelTholianWeb.php`
- `Module/Ship/Action/TholianWeb/RemoveTholianWeb.php`
- `Module/Ship/Action/TholianWeb/ImplodeTholianWeb.php`
- `Component/Spacecraft/System/Type/WebEmitterShipSystem.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/`
- `apps/backend/src/modules/combat/`
- `apps/frontend/src/pages/spacecraft/`
- `packages/shared/`
- `game-data/data/modules/special.yaml`

## Akzeptanzkriterien

- [ ] Persistentes Interdiktornetz und Interdiktorprojekt mit Erbauer, Unterstützern, Fertigstellungszeit und gefangenen Spacecrafts.
- [ ] Aufbau erfasst nur sichtbare, kopräsente, nicht urlaubsgeschützte Ziele und verhindert ein zweites Netz am Ort.
- [ ] Mehrere geeignete Schiffe können den Aufbau unterstützen; Abbruch, Systemausfall oder Zerstörung berechnen die Fertigstellungszeit neu beziehungsweise lösen den Aufbau sicher auf.
- [ ] Gefangene Spacecrafts können nicht navigieren, bis das Netz aufgelöst oder implodiert ist.
- [ ] Fertige Netze können vom Eigentümer schadlos aufgelöst oder mit Kampfschaden implodiert werden; alle betroffenen Eigentümer erhalten Meldungen.
- [ ] Interdiktornetz-Modul, Shared-DTOs, API und verdichtete Schiff-UI sind vorhanden.
- [ ] Service- und Integrationstests decken Aufbau, Unterstützung, Sperre, Auflösung, Implosion und Berechtigungen ab.

## Comments
