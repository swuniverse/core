# Fehlende Prestigequellen wie STU

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Drei STU-Prestigequellen fehlen in SWU:

1. **Selbstzerstörung** kostet in STU den Rumpf-Prestigewert (`-abs(prestige)`). SWU bucht nichts. `sc-WP-COMBAT-3` hat STU falsch gelesen („Selbstzerstörung … gibt keinen Gewinn“); STU zieht Prestige ab.
2. **Datenbankeinträge außerhalb von Scans:** STU legt Datenbankeinträge mit Prestige auch an bei Kolonisierung (Kolonieklasse), erster Kolonie (Kolonieklasse), abgeschlossener Forschung (hinterlegte Einträge) und Flugfeldstart (System, Systemtyp, Rumpf). SWU kennt Einträge nur aus Scan und Kartographie. Handelsposten sind **nicht** Teil dieses Tickets (tmw-AUD-13).
3. **Prestigekorrektur durch NPC/Admin** (`PrestigeCheat`): Admin oder NPC bucht einem Spieler einen positiven oder negativen Betrag mit Beschreibung; bei NPC mit Pflichtgrund und History-Eintrag. SWU hat kein Gegenstück.

## STU-Quellen

- `src/Module/Spacecraft/Action/SelfDestruct/SelfDestruct.php` (Z. ~73, `createNegativePrestigeLog`, Text „… Prestige erhalten für die Selbstzerstörung von: <Rumpf>“)
- `src/Module/Prestige/Lib/CreatePrestigeLog.php` (`createLog`, `createLogForDatabaseEntry`)
- `src/Module/Ship/Action/Colonize/Colonize.php` (Z. ~152), `src/Module/Maindesk/Action/FirstColony/FirstColony.php` (Z. ~100)
- `src/Module/Research/ResearchState.php` (Z. ~112–116, `createDatabaseEntries`)
- `src/Module/Colony/Action/StartAirfieldShip/StartAirfieldShip.php` (Z. ~147–150)
- `src/Module/NPC/Action/PrestigeCheat.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft-destruction.service.ts` (`selfDestruct` Z. ~84–145)
- `apps/backend/src/modules/prestige/prestige.service.ts` (`change`), `prestige.constants.ts`
- `apps/backend/src/modules/starmap/celestial-class-discovery.service.ts`, `apps/backend/src/modules/starmap/system-type-discovery.service.ts`, `apps/backend/src/modules/spacecraft/ship-class-discovery.service.ts`, `apps/backend/src/modules/starmap/exploration.service.ts` (vorhandene Entdeckungspfade mit Prestige)
- `apps/backend/src/modules/database/database-discovery.port.ts`, `database-discovery.listener.ts`
- `apps/backend/src/modules/colonization/colonization.service.ts` (`colonize`), `apps/backend/src/modules/onboarding/onboarding.service.ts` (`claimHomeworld`)
- `apps/backend/src/modules/research/research.service.ts` (Forschungsabschluss), `apps/backend/src/modules/game-data/game-data.service.ts` (`shipReward`)
- `apps/backend/src/modules/colony/colony.service.ts` (`startHangarShip` Z. ~1039)
- `apps/backend/src/modules/auth/auth.controller.ts` (`admin/users`), `apps/frontend/src/pages/admin-users.tsx`

## Akzeptanzkriterien

- [x] Selbstzerstörung bucht dem Besitzer `-abs(Prestigewert der Klasse)` mit Prestige-Log „<n> Prestige erhalten für die Selbstzerstörung von: <Klasse>“, in derselben Transaktion; Klassen mit Wert 0 buchen nichts. Gilt für Schiffe und Stationen mit Prestigewert.
- [x] Kolonisierung und Startkolonie (Onboarding) entdecken die Kolonieklasse über denselben Pfad wie der Sektorscan (`celestial-class-discovery`) inkl. Prestige und Award-Prüfung; bereits entdeckte Klassen buchen nichts erneut.
- [x] Forschungsabschluss entdeckt die durch die Forschung freigeschaltete Schiffsklasse (`shipReward`) als Rumpf-Datenbankeintrag mit Prestige (STU `createDatabaseEntries`). Falls weitere Forschungs→Datenbank-Zuordnungen in `game-data` fehlen, wird nur `shipReward` umgesetzt und die Lücke im Kommentar dokumentiert.
- [x] Flugfeld-/Hangarstart entdeckt System, Systemtyp und Schiffsklasse wie STU `StartAirfieldShip`.
- [x] Admin-Prestigekorrektur: Endpunkt und Admin-UI (Spielerliste) mit Spieler, Betrag ≠ 0, Pflichtbeschreibung; Prestige-Log mit der Beschreibung; der Spieler erhält eine Systemnachricht. Nur Admins (NPC-Konten haben in SWU keine eigene Oberfläche).
- [x] `sc-WP-COMBAT-3`-Akzeptanz „Selbstzerstörung ohne Zerstörer gibt keinen Gewinn“ bleibt gültig (kein Gewinn), ergänzt um den Abzug.
- [x] Backend-Tests je Quelle (inkl. Idempotenz der Entdeckung und Transaktion bei Selbstzerstörung); Frontend-Test für das Admin-Formular.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt H („Prestige: Der Abzug bei Selbstzerstörung fehlt; sc-WP-COMBAT-3 liest STU dort falsch …“); [social.md](../audit-2026-11-17/social.md) Kleine Abweichungen „Prestige, fehlende Quellen“, Unsicherheit 6.
- `sc-WP-COMBAT-3-zerstoerungsfolgen.md` (resolved) beruht in diesem Punkt auf einer falschen STU-Lesart.
- `map.md`-Duplikattabelle verschiebt „fehlende Prestigequellen“ als soc-G3 ins jeweilige Fachissue; für diese Quellen gibt es keines. Handelsposten-Entdeckung: tmw-AUD-13 (PO N4, 2026-11-17).

## Comments

### 2026-11-24 – umgesetzt, Prüfung ausstehend

Commit: `feat(prestige): STU prestige sources for self-destruct, database entries and admin correction (stu-parity soc-AUD-08)`. Modell: Opus 5.5 (Claude Code) statt Sol, direkt umgesetzt (Transaktion/Admin-Rechte); keine Delegation.

- Selbstzerstörung: `SpacecraftDestructionService.selfDestruct` lädt die Klasse, bucht `-abs(prestige)` mit „<n> Prestige erhalten für die Selbstzerstörung von: <Klasse>“ im selben `manager`; Wert 0 bucht nichts; kein Gewinn für Dritte.
- Kolonisierung war schon angebunden (`source: 'COLONIZATION'`); Startkolonie: `OnboardingService.claimHomeworld` → `CelestialClassDiscoveryService.discover` mit `source: 'FIRST_COLONY'`, `spacecraftId: null`.
- Forschung: `ResearchRewardShipService.grantShipReward` entdeckt nach dem Spawn-Versuch (auch ohne Kolonie) den `shipReward`-Rumpf (`source: 'RESEARCH'`). Lücke: game-data kennt keine weiteren Forschung→Datenbank-Zuordnungen; nur `shipReward` umgesetzt (`shortcut:`-Kommentar).
- Hangarstart: `ColonyService.startHangarShip` → `ExplorationService.discoverCatalogSystem` (nur Katalogsysteme, `system_explorations` + 10 Prestige + `SYSTEMS`-Meldung/Award), Systemtyp und Rumpf mit `source: 'AIRFIELD_START'`.
- Admin: `POST /admin/prestige/correction` (`AdminPrestigeModule`, JWT + `AdminGuard`), Betrag ganzzahlig ≠ 0 (±1 000 000), Pflichtbeschreibung 1–500 Zeichen, NPC → 400; Prestige-Log mit Beschreibung, Systemnachricht nach Commit. UI: Schaltfläche „Prestige“ in der Spielerliste (nicht für NPC).
- Migration `20261124200000-discoveries-without-spacecraft`: `celestial_class_discoveries.spacecraftId`, `ship_class_discoveries.source/targetSpacecraftId` nullable.

Gelaufen: Jest-Specs `spacecraft-destruction` (19), `research-reward-ship` + `onboarding` (17), `colony-tick` (250), `exploration` (3), `ship-class-discovery`/`celestial-class-discovery` (5), `admin-prestige.controller` (4); Vitest `admin-users` (7); `nx typecheck` backend+frontend; ESLint 0 Fehler.

Ausstehend (Sammelprüfung): Migration gegen PostgreSQL (up/down) und Integrationstests der Entdeckungspfade (Idempotenz unter echtem Unique-Index), volle Backend-/Frontend-Suites.

