# Siedlerliste wie STU userList.twig

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** soc-AUD-07a

## Ziel

`GET database/settlers` liefert alle Nicht-NPC-Spieler auf einmal, nach Name sortiert, und die Seite `Settlers` hat weder Suche noch Sortierung, Seiten, Allianz, Avatar oder PM-Link. Die Siedlerliste wird wie STU:

- **Serverseitige Seitenaufteilung** mit 25 Einträgen je Seite (STU `LIST_LIMIT`) und Seitennavigation wie `userListNavigation.twig`.
- **Sortierung** nach Id, Fraktion und Allianz, je auf- und absteigend (STU `SORT_FIELD_MAP`).
- **Suche** nach Name (ohne BBCode, Groß-/Kleinschreibung egal) oder exakter Siedler-Id; bei Suche ohne Seitenlimit wie STU.
- **Zeile**: Avatar, Id, Name (Profil-Link), Fraktion, Allianz (Link auf die Allianzseite), PM-Link. Der PM-Link öffnet das Schnell-PM-Popup aus soc-AUD-07a (Schnell-PM-Popup, aufgeteilt in soc-AUD-07a/b/c).
- Die SWU-Zusatzspalten (Prestige, Kolonien, Schiffe, Forschung) entfallen, weil STU sie nicht zeigt.

## STU-Quellen

- `src/html/database/userList.twig`, `src/html/database/userListNavigation.twig`
- `src/Module/Database/View/UserList/UserList.php` (Sortierfelder, `LIST_LIMIT = 25`, Suche nach Name/Id), `UserListRequest.php`

## SWU-Pfade

- `apps/backend/src/modules/database/database.controller.ts` (`GET settlers` Z. 67–72)
- `apps/backend/src/modules/database/database.service.ts` (`getSettlers` Z. 292, `toSettlerEntry` Z. 465)
- `packages/shared/src/lib/database/index.ts` (neuer Seiten-DTO)
- `apps/frontend/src/pages/database.tsx` (`Settlers` Z. 1149)
- `apps/frontend/src/components/PlayerAvatar.tsx`, `PlayerName.tsx`, `PmLink.tsx` bzw. das Schnell-PM-Popup aus soc-AUD-07a
- Tests: `apps/backend/src/modules/database/database.service.spec.ts`, `apps/frontend/src/pages/database.spec.tsx`

## Akzeptanzkriterien

- [ ] `GET database/settlers?page=&sort=id|faction|alliance&order=asc|desc&search=` liefert `{ entries, page, pageCount, total }`; ungültige Parameter fallen auf Standard (Id aufsteigend, Seite 1) zurück.
- [ ] Suche findet Teilstrings im Namen (BBCode entfernt, case-insensitive) und exakte Ids; bei Suche keine Seitenbegrenzung.
- [ ] Zeilen zeigen Avatar, Id, Name mit Profil-Link, Fraktion, Allianz mit Link und PM-Link (Schnell-PM-Popup). Eigene Zeile ohne PM-Link.
- [ ] Sortierung und Seite stehen in der URL (Zurück-Navigation funktioniert).
- [ ] Die bisherigen Zusatzspalten sind entfernt; nicht mehr genutzte Backend-Felder werden entfernt, sofern keine andere Seite sie nutzt (vorher prüfen).
- [ ] Backend-Tests: Seitenaufteilung, Sortierung je Feld, Suche nach Name und Id, NPCs ausgeschlossen. Frontend-Tests: Suche, Sortierwechsel, Seitenwechsel, PM-Link öffnet Popup.

## Herkunft

- Audit: [README.md](../audit-2026-11-17/README.md) Abschnitt C „Siedlerliste“, H „Schnell-PM fehlt in Siedlerliste …“, M4 (Schnell-PM-Einstiege nutzen das Popup); [trade-map-world.md](../audit-2026-11-17/trade-map-world.md) „Große Abweichungen 5“.
- PO-Entscheidung M4 (2026-11-17): Alle Schnell-PM-Einstiege aus H nutzen das Popup.
- Abgrenzung zu soc-AUD-07c: Dort ist der PM-Einstieg in der Siedlerliste ebenfalls genannt; dieses Ticket baut die Tabelle neu und setzt den Link mit. Wird soc-AUD-07c zuerst umgesetzt, bleibt der Link beim Umbau erhalten; wird dieses Ticket zuerst umgesetzt, ist der Siedlerlisten-Punkt in soc-AUD-07c damit erledigt.
- Kein bisheriges Ticket; die Inventur nannte die Siedlerliste fälschlich „vollständig“.

## Comments
