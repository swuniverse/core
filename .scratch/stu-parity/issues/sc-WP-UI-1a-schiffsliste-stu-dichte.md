# Schiffsliste auf STU-Informationsdichte bringen

**Status:** resolved
**Priority:** P1
**Size:** M
**Blocked by:** —

## Ziel

Die Schiffsliste (`/spacecraft`) zeigt je Schiff dieselben Kennwerte und Status-Icons wie die STU-Schiffsliste, damit Spieler ihre Flotte ohne Detailaufruf überblicken. Die Werte kommen per DTO-Erweiterung aus `GET /spacecraft`. Der Lager-Hover folgt separat in sc-WP-UI-1b, Flottengruppen in sc-WP-FLEET-1b.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `html/shiplistmacros.twig` (Spaltenmakros: Alarm, Ebene, Koordinate, Hülle, Schilde, EPS, Warp, Reaktor, Batterie, Crew, System-Icons, Status)
- `html/view/shiplist.twig`, `Module/Ship/View/ShowShiplistSingles`
- Assets: `../../st-universe/assets/buttons/alert*_1.png`, `../../st-universe/assets/buttons/` (System-Icons)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`findAllByUser`, `toShipSummary`)
- `apps/backend/src/modules/spacecraft/spacecraft-resource-flow.service.ts` (Zuwachs/Verbrauch je Tick, Energiefluss)
- `apps/backend/src/modules/spacecraft/spacecraft-runtime-state.service.ts` (`runtimeSystems`)
- `packages/shared/src/lib/spacecraft/index.ts` (Listen-DTO)
- `apps/frontend/src/pages/spacecraft.tsx`, `apps/frontend/src/pages/spacecraft.spec.tsx`
- UI-Konventionen: `.scratch/stu-parity/inventory/shell-admin-runtime.md` Abschnitt 3 (Tabellenstil 3.4, Icons 3.6)

## Akzeptanzkriterien

- [x] Das Listen-DTO enthält je Schiff: Alarmstufe, Ebene (Layer-Name/-ID), Galaxie-x|y und bei Systemaufenthalt Systemkoordinate, Hülle/Max, Schilde/Max mit Aktiv-Flag und Regeneration je Tick, EPS/Max mit Zuwachs und Verbrauch, Hyperantrieb/Max mit Zuwachs, Reaktorladung, Ersatzbatterie, Crew (aktuell/min/max) und Status der Systeme NBS, LRS, Waffen und Torpedos (vorhanden/aktiv/beschädigt).
- [x] Die Werte stammen aus denselben Berechnungen wie die Schiffsdetailansicht (keine Doppellogik); Backend-Tests decken die gemeinsam verwendeten Orts-, Ressourcenfluss- und Laufzeitsystem-Berechnungen für System- und Galaxieraum ab.
- [x] Die Tabelle zeigt die Spalten: Alarm-Icon, Ebenen-Kürzel, `x|y` plus `(sx|sy)` im System, Hülle farbig nach Anteil (STU-Schwellen), Schilde (aktiv hervorgehoben, `+Regeneration`), EPS mit `+Zuwachs` und `(Verbrauch/Reaktor)`, Hyperantrieb mit Zuwachs, Reaktor, Batterie, Crew-Ampel (unter Minimum rot, ausreichend grün) und System-Icons (NBS, LRS, Waffen, Torpedos; deaktiviert ausgegraut).
- [x] Tabellenstil laut Konvention (`text-xs`, 1-px-Gitter, Zahlen rechts, keine Emoji); einfache Icons mit `title` und `aria-label`.
- [x] Ein Status-Icon zeigt Sonderzustände (Hyperraumflug, Standby, Kartographie-Finalisierung).
- [x] Flugsignaturen werden bewusst nicht angezeigt.
- [x] Frontend-Test (`spacecraft.spec.tsx`) prüft Spaltenköpfe, ein Systemschiff mit Systemkoordinate, die Crew-Ampel und deaktivierte System-Icons.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- `GET /spacecraft` liefert nun die dichte Listenprojektion aus kanonischer Ortsauflösung, Ressourcenfluss, Crew- und Laufzeitsystemdiensten; die React-Tabelle stellt alle STU-Kennwerte, Zustände und zugänglichen Statussymbole kompakt dar. Flottengruppen und Lager-Hover bleiben wie vorgesehen in sc-WP-FLEET-1b bzw. sc-WP-UI-1b.
