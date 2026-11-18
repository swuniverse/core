# Fehlende Prestigequellen wie STU

**Status:** ready-for-agent
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

- [ ] Selbstzerstörung bucht dem Besitzer `-abs(Prestigewert der Klasse)` mit Prestige-Log „<n> Prestige erhalten für die Selbstzerstörung von: <Klasse>“, in derselben Transaktion; Klassen mit Wert 0 buchen nichts. Gilt für Schiffe und Stationen mit Prestigewert.
- [ ] Kolonisierung und Startkolonie (Onboarding) entdecken die Kolonieklasse über denselben Pfad wie der Sektorscan (`celestial-class-discovery`) inkl. Prestige und Award-Prüfung; bereits entdeckte Klassen buchen nichts erneut.
- [ ] Forschungsabschluss entdeckt die durch die Forschung freigeschaltete Schiffsklasse (`shipReward`) als Rumpf-Datenbankeintrag mit Prestige (STU `createDatabaseEntries`). Falls weitere Forschungs→Datenbank-Zuordnungen in `game-data` fehlen, wird nur `shipReward` umgesetzt und die Lücke im Kommentar dokumentiert.
- [ ] Flugfeld-/Hangarstart entdeckt System, Systemtyp und Schiffsklasse wie STU `StartAirfieldShip`.
- [ ] Admin-Prestigekorrektur: Endpunkt und Admin-UI (Spielerliste) mit Spieler, Betrag ≠ 0, Pflichtbeschreibung; Prestige-Log mit der Beschreibung; der Spieler erhält eine Systemnachricht. Nur Admins (NPC-Konten haben in SWU keine eigene Oberfläche).
- [ ] `sc-WP-COMBAT-3`-Akzeptanz „Selbstzerstörung ohne Zerstörer gibt keinen Gewinn“ bleibt gültig (kein Gewinn), ergänzt um den Abzug.
- [ ] Backend-Tests je Quelle (inkl. Idempotenz der Entdeckung und Transaktion bei Selbstzerstörung); Frontend-Test für das Admin-Formular.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt H („Prestige: Der Abzug bei Selbstzerstörung fehlt; sc-WP-COMBAT-3 liest STU dort falsch …“); [social.md](../audit-2026-11-17/social.md) Kleine Abweichungen „Prestige, fehlende Quellen“, Unsicherheit 6.
- `sc-WP-COMBAT-3-zerstoerungsfolgen.md` (resolved) beruht in diesem Punkt auf einer falschen STU-Lesart.
- `map.md`-Duplikattabelle verschiebt „fehlende Prestigequellen“ als soc-G3 ins jeweilige Fachissue; für diese Quellen gibt es keines. Handelsposten-Entdeckung: tmw-AUD-13 (PO N4, 2026-11-17).

## Comments
