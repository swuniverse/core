# Allianz-Rollen-Editor in der Allianzverwaltung

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** soc-AUD-09a

## Ziel

Spieler mit `MANAGE_JOBS` verwalten die Rollen ihrer Allianz in einem Editor wie STU („Rollen“ in `ally.js`, Aktion `SaveJobs`): Rollen anlegen, umbenennen, sortieren, Rechte als gruppierte Checkboxen setzen, löschen und Mitgliedern zuweisen. Die Oberfläche hält sich an die Schutzregel aus soc-AUD-09a und zeigt nur, was der Nutzer vergeben darf.

## STU-Quellen

- `src/Public/static/js/ally.js` (Rollen-Editor)
- `src/html/alliance/alliancemanagement.twig` (Mitgliederverwaltung, Befördern/Degradieren)
- `src/Module/Alliance/Action/SaveJobs/SaveJobs.php`, `PromotePlayer/PromotePlayer.php`, `DemotePlayer/DemotePlayer.php`
- `src/Component/Alliance/Enum/AllianceJobPermissionEnum.php` (Beschriftungen, Gruppen)
- `src/html/view/alliance.twig`, `src/Module/Game/Lib/View/Provider/AllianceProvider.php` (Leitungsanzeige nach Rollen)

## SWU-Pfade

- `apps/frontend/src/pages/alliances.tsx` (`AllianceEditPage` Z. ~2243 mit Mitgliederverwaltung, `AllianceDetailPage` Z. ~1716 Leitung)
- `apps/frontend/src/pages/alliance-member-overview.tsx`
- `apps/frontend/src/pages/alliance-forum.tsx` (Amtsanzeige am Beitrag)
- `packages/shared/src/lib/alliance/index.ts` (Rollen-DTOs aus soc-AUD-09a)
- `apps/frontend/src/pages/alliances.spec.tsx`, `alliance-member-overview.spec.tsx`

## Akzeptanzkriterien

- [ ] Abschnitt „Rollen“ in der Allianzverwaltung, sichtbar mit `MANAGE_JOBS`: Liste der Rollen mit Titel, Sortierung (verschieben), Rechten (Gruppen Präsident / Verwaltung / Diplomatie mit Ober- und Unterrechten, STU-Beschriftungen) und Mitgliederzahl.
- [ ] Anlegen, Umbenennen, Sortieren, Rechte ändern, Löschen; die Präsidentenrolle ist nicht editierbar/löschbar; Rechte, die der Nutzer nicht hat, sind deaktiviert mit Hinweis; ein gesetztes Oberrecht zeigt seine Unterrechte als enthalten.
- [ ] Mitgliederverwaltung: Mitgliedern Rollen zuweisen/entziehen (mehrere je Mitglied); eigene Rollen nicht änderbar; Präsidentschaft nur über „Übergeben“ durch den Präsidenten.
- [ ] Allianzdetail zeigt die Leitung gruppiert wie STU (Präsident, Vize-Rollen, Diplomaten-Rollen, weitere Leitungsrollen mit `ALLIANCE_LEADERSHIP`) mit Rollentiteln; Forum und Mitgliederübersicht zeigen Rollentitel.
- [ ] Fehler aus der Serverprüfung (Schutzregel) werden verständlich angezeigt.
- [ ] Frontend-Tests: Editor sichtbar nur mit `MANAGE_JOBS`, nicht vergebbare Rechte deaktiviert, Präsidentenrolle gesperrt, Zuweisung mehrerer Rollen, Leitungsanzeige.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt M1 und „Entscheidungen PO zu M“ („Ein Rollen-Editor in der Allianzverwaltung“); [social.md](../audit-2026-11-17/social.md) Seitenabgleich „Verwaltung“ und „Allianz gründen/bearbeiten“.
- PO-Entscheidung M1 vom 2026-11-17.

## Comments
