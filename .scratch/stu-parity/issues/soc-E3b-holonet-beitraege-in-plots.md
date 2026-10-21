# RPG-Plots: HoloNet-Beiträge im Plot

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** soc-E3a

## Ziel

Ein HoloNet-Beitrag kann beim Schreiben einem aktiven Plot zugeordnet werden, in dem der Autor Mitglied ist; der Titel ist dann optional. Neue Plotbeiträge benachrichtigen die übrigen Mitglieder. Die Plotdetailseite zeigt die Beiträge.

Vorgabe zur Kategorie: Plotbeiträge sind immer `ROLEPLAY`. Der Server setzt die Kategorie bei Plotzuordnung auf `ROLEPLAY` (eine abweichende Angabe wird überschrieben); das bricht keine bestehende Regel, da Kategorien eine SWU-Erweiterung sind. In `map.md` unter „Entscheidungen“ festhalten.

## STU-Quellen

- `src/Module/Communication/Action/AddKnPost/AddKnPost.php` (`plotId`, Titelpflicht nur ohne Plot)
- `src/Module/Communication/Action/EditKnPost/EditKnPost.php` (`$plotId === 0 && mb_strlen($title) < 6`)
- `src/Module/Communication/Lib/NewKnPostNotificator.php` („Der Spieler X hat einen neuen Beitrag zum Plot "Y" hinzugefügt.“)
- `src/html/communication/plotdetails.twig`, `src/html/communication/plot/plotSelect.twig`

## SWU-Pfade

- `apps/backend/src/modules/holonet/entities/holonet-post.entity.ts` (`plotId` nullable), Migration
- `apps/backend/src/modules/holonet/holonet.service.ts` (`create`, `update`, `findAll` mit Filter `plotId`)
- `apps/backend/src/modules/rpg/*`
- `apps/frontend/src/pages/holonet.tsx` (Compose: Plotauswahl; Beitrag: Plot-Link)

## Akzeptanzkriterien

- [ ] Create akzeptiert `plotId`; nur aktive Plots, in denen der Autor Mitglied ist (sonst 403/400).
- [ ] Mit Plot: Titel optional (0 oder 6–80 Zeichen), Kategorie wird `ROLEPLAY`; ohne Plot gelten die Regeln aus soc-D1 unverändert.
- [ ] Alle anderen Plotmitglieder erhalten eine Systemnachricht mit dem STU-Text (mit Ziel aus soc-A5, falls vorhanden).
- [ ] Beiträge zeigen „Plot: <Titel>“ mit Link; die Plotdetailseite listet die Plotbeiträge chronologisch (paginiert).
- [ ] Die Entscheidung „Plotbeiträge sind immer ROLEPLAY“ steht unter „Entscheidungen“ in `map.md`.
- [ ] Backend-Tests: Mitgliedschaftsprüfung, optionaler Titel, Kategorie, Benachrichtigung ohne Autor. Frontend-Tests: Plotauswahl im Compose, Plotanzeige.

## Comments
