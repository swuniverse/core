# Dockingrechte (Spieler, Allianz, Fraktion, Schiff)

**Status:** resolved
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

- [x] Entity für Dockrechte (Typ, Ziel-ID, Modus), Migration; Eigner verwaltet sie in der Stationsansicht.
- [x] Andock-Prüfung: Eigner immer; sonst Verbot vor Erlaubnis über Spieler, Allianz, Fraktion, Schiff.
- [x] Bei Austritt, Rauswurf und Auflösung einer Allianz werden Allianzrechte gemäß Vertrag bereinigt (Registrierung am `AllianceContextCleanup`).
- [x] Fremdes Andocken erzeugt eine Nachricht an den Eigner; Schalter „automatisch gelesen“.
- [x] Backend-Tests (Rangfolge, Bereinigung), Frontend-Test Rechteverwaltung.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

Umgesetzt: Entity `docking_privileges` (Typ USER/ALLIANCE/FACTION/SHIP, Ziel-ID, Modus ALLOW/DENY) plus `spacecraft.dockPmAutoRead`, Migration `20261030170000`. Reine Policy `docking-access.ts` (Eigner immer, Verbot vor Erlaubnis, sonst verweigert); `DockingPrivilegeService` (Verwaltung nur Eigner, Zielvalidierung, Auswertung, Eignernachricht im Ordner Station mit Auto-gelesen-Schalter) ist in `SpacecraftDockingService` und die NBS-Dock-Aktion eingebunden. Allianzregeln werden bei jeder Prüfung aus der aktuellen Mitgliedschaft abgeleitet (Austritt/Rauswurf braucht keine Bereinigung); Auflösung und Reset löschen Allianzregeln über `AllianceContextCleanup`. Frontend: `DockingPrivilegesPanel` in der Stationsansicht.
Offen: Regelziele werden per ID eingegeben (keine Namenssuche); Wurmloch-/Handelspostenzugang kann das Modell später wiederverwenden.
