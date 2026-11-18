# Allianz-Rollen wie STU: Datenmodell, Rechteprüfung, Migration, ADR

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

SWU hat drei feste Ämter (Präsident, Vize, Diplomat; höchstens eins je Mitglied). STU hat frei konfigurierbare Jobs mit Titel und Sortierung, mehrere je Mitglied, und 14 Einzelrechte. Nach PO-Entscheidung M1 werden die Ämter durch Rollen wie STU ersetzt. Dabei gilt eine Schutzregel gegen Rechteausweitung (der STU-Bug wird nicht übernommen), es bleibt genau ein Präsident, und Pflichtfraktion sowie Fraktionsfeindschaft aus ADR-0001 bleiben bestehen.

Dieser Teil liefert Datenmodell, Rechteprüfung in allen Backend-Pfaden, die Migration der bestehenden Ämter und die ADR-Anpassung, dazu eine API zum Verwalten der Rollen. Die Editor-Oberfläche folgt in soc-AUD-09b.

## STU-Quellen

- `src/Component/Alliance/Enum/AllianceJobPermissionEnum.php` (14 Rechte, Oberrechte, `getParentPermission`, `isEditable`)
- `src/Orm/Entity/AllianceJob.php`, `src/Orm/Entity/AllianceJobPermission.php`, `src/Orm/Entity/AllianceMemberJob.php`
- `src/Module/Alliance/Lib/AllianceJobManager.php` (`hasUserPermission`: FOUNDER → alles, Recht direkt oder über Oberrecht)
- `src/Module/Alliance/Action/SaveJobs/SaveJobs.php` (FOUNDER-Job nicht editierbar)
- `src/Module/Alliance/Action/PromotePlayer/PromotePlayer.php`, `DemotePlayer/DemotePlayer.php`, `KickPlayer/KickPlayer.php` (je `MANAGE_JOBS`, FOUNDER nur durch FOUNDER)
- Rechteprüfungen: `AcceptApplication` (`MANAGE_APPLICATIONS`), `EditDetails`/`ChangeAvatar`/`AddBoard` (`EDIT_ALLIANCE`), `CreateRelation` (`CREATE_AGREEMENTS`), `EditRelationText` (`EDIT_DIPLOMATIC_DOCUMENTS`), `DeleteAlliance` (FOUNDER oder SUCCESSOR), `View/Management/Management.php`, `View/ShowMemberRumpInfo/ShowMemberRumpInfo.php`, `Starmap/View/ShowUserStarmapRealtime/ShowUserStarmapRealtime.php` (`VIEW_SHIPS`)
- `src/Module/Game/Lib/View/Provider/AllianceProvider.php` (Leitungsanzeige nach FOUNDER/SUCCESSOR/DIPLOMATIC/ALLIANCE_LEADERSHIP)

## SWU-Pfade

- `packages/shared/src/lib/alliance/index.ts` (`AllianceRole`, `AllianceTitlesDto`, Mitglieds-DTOs mit `role`/`roleTitle`)
- `apps/backend/src/modules/alliance/alliance-permissions.ts` (`mayActOnMember`, `mayActOnAlliance`) und `alliance-permissions.spec.ts`
- `apps/backend/src/modules/alliance/entities/alliance-membership.entity.ts` (`role`, Unique-Index Präsident), `entities/alliance.entity.ts` (`presidentTitle`, `viceTitle`, `diplomatTitle`)
- `apps/backend/src/modules/alliance/alliance.service.ts`, `alliance.controller.ts`, `alliance.store.ts`, `typeorm-alliance.store.ts`, `testing/in-memory-alliance.store.ts`
- `apps/backend/src/modules/alliance/forum.service.ts`, `member-overview.service.ts`, `alliance-depot.service.ts`, `alliance-banner.service.ts`, `presidential-succession.ts`, `alliance-context-cleanup.ts`, `relationship-resolver.service.ts` (`viewerRole`)
- `apps/backend/src/modules/spacecraft/starmap-visibility.service.ts` (`viewShipManagementDetails`)
- `apps/backend/src/database/migrations/` (neue Migration)
- `docs/adr/0001-allianzen-abweichungen-von-stu.md`

## Akzeptanzkriterien

- [ ] Neue Tabellen für Rollen (Allianz, Titel, Sortierung, Rechte als Menge der 14 STU-Rechte) und Rollenzuordnungen (Mitglied ↔ Rolle, mehrere je Mitglied). Rechte: `FOUNDER`; `SUCCESSOR` mit `ALLIANCE_LEADERSHIP`, `EDIT_ALLIANCE`, `MANAGE_APPLICATIONS`, `MANAGE_JOBS`, `VIEW_COLONIES`, `VIEW_MEMBER_DATA`, `VIEW_SHIPS`, `VIEW_ALLIANCE_STORAGE`, `VIEW_ALLIANCE_HISTORY`; `DIPLOMATIC` mit `CREATE_AGREEMENTS`, `EDIT_DIPLOMATIC_DOCUMENTS`.
- [ ] Zentrale Prüfung `hasPermission(member, permission)` wie STU `AllianceJobManager::hasUserPermission`: FOUNDER erfüllt alles, ein Oberrecht erfüllt seine Unterrechte. `mayActOnAlliance`/`mayActOnMember` werden dadurch ersetzt.
- [ ] Alle Rechteprüfungen laufen über Rollenrechte: Bewerbungen (`MANAGE_APPLICATIONS`), Details/Banner/Forum-Bretter (`EDIT_ALLIANCE`), Forumsmoderation (`EDIT_ALLIANCE`, Zuordnung im Code dokumentiert), Diplomatie vorschlagen/annehmen/Krieg (`CREATE_AGREEMENTS`), Vertragswerk (`EDIT_DIPLOMATIC_DOCUMENTS`), Mitgliederübersicht/Kolonien/Schiffe/Depots/interne Chronik (`VIEW_MEMBER_DATA`, `VIEW_COLONIES`, `VIEW_SHIPS`, `VIEW_ALLIANCE_STORAGE`, `VIEW_ALLIANCE_HISTORY`), Sternenkarte Allianzschiffe (`VIEW_SHIPS`), Rollen/Mitglieder verwalten und Rauswurf (`MANAGE_JOBS`), Leitungsanzeige (`ALLIANCE_LEADERSHIP`). Abweichende Zuordnungen sind begründet.
- [ ] **Schutzregel (kein STU-Bug):** Niemand vergibt oder entzieht `FOUNDER` über den Rollenmechanismus; wer Rollen anlegt, ändert oder zuweist, darf nur Rechte vergeben, die er selbst hat; niemand darf Rollen eines Mitglieds mit Rechten ändern, die er selbst nicht hat; niemand ändert seine eigenen Rollen. Serverseitig erzwungen, nicht nur in der UI.
- [ ] Genau ein Präsident: Die FOUNDER-Rolle ist eine feste, nicht löschbare Rolle mit genau einem Inhaber (DB-Constraint). Auflösen und Übergeben nur durch den Präsidenten; der Präsident muss vor dem Austritt übergeben; automatische Nachfolge (`presidential-succession.ts`) bleibt, nun über Rollen.
- [ ] Rollen-API: Rollen auflisten, anlegen, umbenennen, sortieren, Rechte setzen, löschen; Mitgliedern Rollen zuweisen/entziehen; Chronik-Einträge wie bisher bei Amtswechseln.
- [ ] Migration: Je Allianz drei Standardrollen mit bisherigen Titeln – Präsident (FOUNDER), Vize (SUCCESSOR mit allen Unterrechten), Diplomat (DIPLOMATIC mit Unterrechten); bestehende Ämter werden zugeordnet; `role`-Spalte und Titelspalten entfallen danach; Down-Migration möglich. Neue Allianzen erhalten dieselben drei Standardrollen.
- [ ] DTOs liefern je Mitglied die Rollen (Titel, Sortierung) statt `role`/`roleTitle`; Frontend kompiliert und zeigt Rollentitel an allen bisherigen Stellen (minimale Anpassung, Editor folgt in soc-AUD-09b).
- [ ] Pflichtfraktion und feste Fraktionsfeindschaft (Diplomatie nur innerhalb der Fraktion) bleiben unverändert.
- [ ] ADR-0001 angepasst: Punkt 1 „Ämter statt Jobs“ entfällt und wird durch „Rollen wie STU“ ersetzt; die Begründung zur Rechteausweitung wird als Schutzregel festgehalten; „Considered Options“ und Datum aktualisiert.
- [ ] Backend-Tests: Rechtevererbung, Schutzregel (Ausweitung, FOUNDER, eigene Rollen), genau ein Präsident, Migration (Integrationstest gegen PostgreSQL), alle umgestellten Pfade (bestehende Allianz-Int-Specs angepasst und grün).

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt M1 (STU vs. SWU) und „Entscheidungen PO zu M“ (M1), N2 (Zeile „Allianz-Ämter“); [social.md](../audit-2026-11-17/social.md) Seitenabgleich „Allianz gründen/bearbeiten“ und „Bewusste/entschiedene Abweichungen“ (Ämter statt Jobs – jetzt aufgehoben).
- PO-Entscheidung M1 vom 2026-11-17: Rollen wie STU, Rest von ADR-0001 behalten.
- Ersetzt ADR-0001 Punkt 1.

## Comments
