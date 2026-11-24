# HoloNet-Liste aufgeklappt und mit Autor-/Admin-Aktionen wie STU

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Die HoloNet-Liste zeigt heute zugeklappte Zeilen; erst ein Klick klappt einen Beitrag auf. STU zeigt jeden Beitrag ausgeklappt mit Avatar, NPC-Kennzeichen und „Bearbeitet“-Datum und bietet eine aufsteigende Sortierung. Außerdem sind zwei Funktionen aus soc-D1 serverseitig vorhanden, aber für Spieler unerreichbar: Der Autor kann seinen Beitrag nicht löschen (`DELETE holonet/:id` hat keinen Aufrufer), und Admins sehen an fremden Beiträgen keinen Bearbeiten-Knopf.

## STU-Quellen

- `src/html/communication/kn.twig` (Beitragskarte)
- `src/Module/Game/Lib/View/Provider/CommunicationProvider.php` (Liste, Sortierung, Lesezeichen)
- `src/Module/Communication/Action/DeleteKnPost/DeleteKnPost.php` (Autor, 10 min)
- `src/Module/Communication/Action/EditKnPost/EditKnPost.php` (`EDIT_TIME = 600`, Admin jederzeit, `setEditDate`)
- `src/html/communication/editKn.twig` (Plot-Auswahl beim Bearbeiten)
- `src/Orm/Entity/KnPost.php` (`edit_date`)

## SWU-Pfade

- `apps/frontend/src/pages/holonet.tsx` (Liste Z. ~520–560, `togglePost` Z. ~268–280, Inline-Editor Z. ~376–400, Bearbeiten-Bedingung Z. ~618, Initialen-Avatar Z. ~790)
- `apps/backend/src/modules/holonet/holonet.service.ts` (Sortierung `createdAt DESC` Z. ~84, Bearbeiten Z. ~364–371, Löschen Z. ~393–401)
- `apps/backend/src/modules/holonet/holonet.controller.ts` (`@Delete(':id')` Z. ~140, `@Patch(':id')`)
- `apps/backend/src/modules/holonet/entities/holonet-post.entity.ts` (neue Spalte `editedAt`)
- `apps/backend/src/database/migrations/` (neue Migration)
- `apps/frontend/src/pages/holonet.spec.tsx`

## Akzeptanzkriterien

- [x] Die Liste zeigt jeden Beitrag ausgeklappt: Plot-Titel mit Link „Zum Plot“, Titel, Text, Datum (hervorgehoben, wenn neuer als das Lesezeichen), Beitrag-ID, Autor mit Avatar-Bild (nicht Initialen), Fraktionsicon, NPC-Kennzeichen, PM- und Profillink, Charaktere, Bewertung und Kommentarzahl. Der Permalink `/holonet/:id` bleibt erhalten.
- [x] Neue Spalte `editedAt` (nullable, Migration); jede erfolgreiche Bearbeitung setzt sie; die Karte zeigt „Bearbeitet: <Datum>“, wenn gesetzt.
- [x] Rail-Eintrag „Alle Beiträge (aufsteigend)“; die API nimmt einen Sortierparameter (`asc`/`desc`, Default `desc`), Pagination bleibt konsistent.
- [x] Der Autor sieht innerhalb von 10 Minuten „Bearbeiten“ und „Löschen“; danach verschwinden beide Knöpfe (Server lehnt weiterhin ab). Löschen ruft `DELETE holonet/:id` mit Bestätigung auf.
- [x] Admins sehen „Bearbeiten“ an fremden Beiträgen jederzeit (Server erlaubt es bereits) und weiterhin die Admin-Löschung.
- [x] Im Bearbeiten-Dialog ist der Plot wie STU `editKn.twig` änderbar (nur eigene aktive Plots bzw. kein Plot), mit derselben Serverprüfung wie beim Zuordnen.
- [x] Backend-Tests: `editedAt` wird gesetzt, Sortierung aufsteigend, Plotwechsel beim Bearbeiten, Autorlöschung innerhalb/außerhalb der Frist.
- [x] Frontend-Tests: ausgeklappte Karte mit Avatar/NPC/„Bearbeitet“, Löschen durch den Autor (Aufruf), Knöpfe nach Fristablauf ausgeblendet, Admin-Bearbeiten an fremdem Beitrag.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt A (Zeile „HoloNet: Autor löscht eigenen Beitrag; Admin bearbeitet fremden Beitrag“), C (Zeile „HoloNet-Liste“), D (soc-D1); [social.md](../audit-2026-11-17/social.md) Große Abweichung 2 und Kleine Abweichungen „HoloNet, Plot-Wechsel“ / „Bearbeiten-Button“.
- `soc-D1-holonet-regeln-an-stu-angleichen.md` ist `resolved`, aber die Akzeptanz „Autor innerhalb von 10 Minuten, Admins jederzeit (auch fremde Beiträge)“ ist für Spieler nicht erreichbar. Dieses Ticket schließt die Lücke.
- Pin und Kategorien: siehe soc-AUD-03 (PO M2, 2026-11-17).

## Comments

### 2026-11-24 – umgesetzt, Prüfung ausstehend

Commit: `feat(holonet): STU expanded card, author delete, admin edit, plot change, ascending list (stu-parity soc-AUD-02)`

- Backend: `holonet_posts.editedAt` (Migration `20261124160000-add-holonet-post-edited-at.ts`), wird bei jeder Bearbeitung gesetzt. `GET holonet?sort=asc|desc` (Default `desc`, Tiebreak `id`). `PATCH holonet/:id` nimmt `plotId` (`null` = kein Plot) mit derselben Prüfung wie beim Zuordnen (`requireActivePlotMember` des Bearbeitenden), setzt ROLEPLAY und storniert offene Plot-Anträge. Plot-Beiträge dürfen beim Bearbeiten wie beim Anlegen ohne Titel bleiben.
- Sicherheitsfix nebenbei: `author` in Liste, Einzelbeitrag und Kommentaren lieferte die komplette `User`-Entity (inkl. `passwordHash`, `email`, Token-Hashes). Jetzt nur noch `id, username, avatar, faction, isNpc`.
- Frontend `holonet.tsx`: Karten immer ausgeklappt (Plot + „Zum Plot“, Titel, Text, Datum rot ab Lesezeichen, ID, `PlayerAvatar`, Fraktionsicon, NPC, PM/Profil, Charaktere, Bewertung, „Bearbeitet: …“). Kommentare und Bewertungsknöpfe lädt „Kommentare (n)“ nach (statt 40 Requests pro Seite); der Permalink öffnet sie direkt. Autor: Bearbeiten/Löschen nur innerhalb von 10 Minuten (Löschen mit `window.confirm`), Admin: Bearbeiten jederzeit plus Admin-Löschung. Rail „Alle Beiträge (aufsteigend)“. Plot-Auswahl im Bearbeiten-Dialog.
- Bereits gelaufen: `jest src/modules/holonet` (51 Tests grün), `nx typecheck backend`, `vitest src/pages/holonet.spec.tsx` (33 Tests grün), `tsc` app/spec im Frontend, eslint auf den geänderten Dateien.
- Offen für den Verifikationslauf: `holonet-characters.int-spec.ts` gegen die DB (mit neuer Spalte), volle `lint typecheck test` und Migration gegen Postgres.
- Modell: Opus 5.5 im Hauptlauf, kein Sol/Luna-Agent in dieser Session verfügbar (Abweichung vom Routing).

- 2026-11-24 – **resolved.** Gesammelter Verifikationslauf (Claude Opus 5.5; Sol/Luna in dieser Session nicht verfügbar) auf `f1e0c2f2`: `nx run-many -t build typecheck lint` (backend, frontend, shared) grün; Unit Backend 2764/2764, Frontend 1028/1028; PostgreSQL-Integration 1045/1089 im Gesamtlauf – die 44 Fehler (6 Suiten) waren Test-Fixtures mit alten `sendSystem`-Argumentpositionen bzw. der historische Kolonie-Ereignis-Migrationstest nach dem Betreff-Wegfall (soc-AUD-07b), behoben in `f1e0c2f2`, betroffene Suiten danach 112/112 grün. Diff-Review: Regression behoben – `publicAuthor` lieferte für Kommentare gelöschter Konten einen leeren Namen statt „Gelöschter Siedler“ (Ursache des in soc-AUD-07b als vorbestehend vermerkten `account-deletion.int-spec`-Fehlers); jetzt grün. Migration `editedAt` im Gesamtlauf mitgelaufen, holonet-Unit 66/66 (mit Onboarding).
