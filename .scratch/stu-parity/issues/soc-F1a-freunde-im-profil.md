# Profil: Freunde-Box

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** soc-B1a

## Ziel

Das Spielerprofil zeigt wie STU eine Box „Freunde“ mit den Avataren der Spieler, die mit dem Profilinhaber befreundet sind. STU leitet das aus Allianzmitgliedschaft und Kontakten im Modus Freund ab, die den Profilinhaber eingetragen haben (`getFriendsByUserAndAlliance`). SWU übernimmt diese Semantik mit seinen Begriffen: Mitglieder derselben Allianz und Spieler, die den Profilinhaber als Kontakt im Modus Freund führen (soc-B1a).

## STU-Quellen

- `src/Orm/Repository/UserRepository.php#getFriendsByUserAndAlliance`
- `src/Module/Game/Lib/View/Provider/UserProfileProvider.php` (`FRIENDS`)
- `src/html/view/userprofile.twig` (Box „Freunde“)

## SWU-Pfade

- `apps/backend/src/modules/database/database.service.ts` (`GET database/settlers/:id`) oder eigener Endpunkt `GET database/settlers/:id/friends`
- Kontakte aus soc-B1a, Allianzmitgliedschaft aus `apps/backend/src/modules/alliance/*`
- `apps/frontend/src/pages/player-profile.tsx`, `apps/frontend/src/components/PlayerAvatar.tsx`

## Akzeptanzkriterien

- [ ] Endpunkt liefert die Freunde eines Spielers: Mitglieder derselben Allianz (ohne ihn selbst) und Spieler, die ihn als Kontakt im Modus Freund führen; dedupliziert, sortiert nach ID, gedeckelt (z. B. 50).
- [ ] Das Profil zeigt die Box „Freunde“ mit Avatar (Link zum Profil, `title` = Name); „Keine“ wenn leer.
- [ ] Keine Preisgabe privater Daten: es werden nur ID, Name, Avatar ausgeliefert.
- [ ] Backend-Tests: Allianz, Kontakt, Duplikat, eigener Account ausgeschlossen. Frontend-Test: Box rendert.

## Comments
