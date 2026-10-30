# Dockingrechte (Spieler, Allianz, Fraktion, Schiff)

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-STAT-3a

## Ziel

Der Stationseigner vergibt wie in STU Erlauben- oder Verbieten-Rechte an Spieler, Allianzen, Fraktionen oder Schiffe; ein Verbot geht vor einer Erlaubnis. Umsetzung nach dem Integrationsvertrag „Zugangsprivilegien“ der Allianz-Spec inkl. Bereinigung beim Allianzkontext-Ende. Dazu „Dock-PM automatisch gelesen“ für den Eigner.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Station/Action/{AddDockPrivilege,DeleteDockPrivilege,ToggleDockPmAutoRead}`, `Module/Station/View/{ShowDockingPrivileges,ShowDockingControl}`
- `Component/Station/Dock/{DockPrivilegeUtility,DockTypeEnum,DockModeEnum}.php`
- `html/station/dockPrivileges.twig`

## SWU-Pfade

- `.scratch/alliance-stu-parity/allianz-infrastruktur-spec.md` (Integrationsvertrag Zugangsprivilegien, `AllianceContextCleanup`)
- `apps/backend/src/modules/alliance/alliance-context-cleanup.ts`, `relationship-resolver.service.ts`
- `apps/backend/src/modules/messaging/messaging.service.ts` (Dock-Benachrichtigung)
- Andock-Dienst aus sc-WP-STAT-3a

## Akzeptanzkriterien

- [ ] Entity für Dockrechte (Typ, Ziel-ID, Modus), Migration; Eigner verwaltet sie in der Stationsansicht.
- [ ] Andock-Prüfung: Eigner immer; sonst Verbot vor Erlaubnis über Spieler, Allianz, Fraktion, Schiff.
- [ ] Bei Austritt, Rauswurf und Auflösung einer Allianz werden Allianzrechte gemäß Vertrag bereinigt (Registrierung am `AllianceContextCleanup`).
- [ ] Fremdes Andocken erzeugt eine Nachricht an den Eigner; Schalter „automatisch gelesen“.
- [ ] Backend-Tests (Rangfolge, Bereinigung), Frontend-Test Rechteverwaltung.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
