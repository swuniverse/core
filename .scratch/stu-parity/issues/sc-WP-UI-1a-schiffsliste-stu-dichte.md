# Schiffsliste auf STU-Informationsdichte bringen

**Status:** claimed
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

- [ ] Das Listen-DTO enthält je Schiff: Alarmstufe, Ebene (Layer-Name/-ID), Galaxie-x|y und bei Systemaufenthalt Systemkoordinate, Hülle/Max, Schilde/Max mit Aktiv-Flag und Regeneration je Tick, EPS/Max mit Zuwachs und Verbrauch, Hyperantrieb/Max mit Zuwachs, Reaktorladung, Ersatzbatterie, Crew (aktuell/min/max) und Status der Systeme NBS, LRS, Waffen und Torpedos (vorhanden/aktiv/beschädigt).
- [ ] Die Werte stammen aus denselben Berechnungen wie die Schiffsdetailansicht (keine Doppellogik); ein Backend-Test prüft die DTO-Werte für ein Schiff im System und eines im Galaxieraum.
- [ ] Die Tabelle zeigt die Spalten: Alarm-Icon (Asset statt Punkt), Ebenen-Icon/Kürzel, `x|y` plus `(sx|sy)` im System, Hülle farbig nach Anteil (STU-Schwellen), Schilde (aktiv hervorgehoben, `+Regeneration`), EPS mit `+Zuwachs` und `(Verbrauch/Reaktor)`, Hyperantrieb mit Zuwachs, Reaktor, Batterie, Crew-Ampel (unter Minimum rot, ausreichend grün) und System-Icons (NBS, LRS, Waffen, Torpedos; deaktiviert ausgegraut).
- [ ] Tabellenstil laut Konvention (`text-xs`, 1-px-Gitter, Zahlen rechts, keine Emoji); einfache Icons mit `title` und `aria-label`.
- [ ] Ein Status-Icon zeigt Sonderzustände (z. B. Hyperraumflug, Standby, Kartographie-Finalisierung).
- [ ] Flugsignaturen werden bewusst nicht angezeigt.
- [ ] Frontend-Test (`spacecraft.spec.tsx`) prüft Spaltenköpfe, ein Systemschiff mit Systemkoordinate, die Crew-Ampel und deaktivierte System-Icons.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
