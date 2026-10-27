# Ignorierliste mit PM-Sperre

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** soc-A1

## Ziel

Spieler können andere Siedler ignorieren, Einträge einzeln, markiert oder komplett löschen und sehen, wer sie ignoriert. Ein ignorierter Spieler kann keine persönliche Nachricht mehr an den Ignorierenden senden („Der Siedler ignoriert Dich“). Das entspricht exakt dem STU-Umfang; eine erweiterte Reichweite klärt soc-C1b.

## STU-Quellen

- `src/Module/Message/Action/IgnoreUser/IgnoreUser.php` (existiert, nicht selbst, nicht doppelt)
- `src/Module/Message/Action/DeleteIgnores`, `DeleteAllIgnores`
- `src/Module/Message/View/ShowIgnoreList`, `ShowIgnore`
- `src/html/communication/ignorelist.twig`, `ignoretext.twig`, `src/html/user/ignoreButton.twig`
- `src/Module/Message/Action/WritePm/WritePm.php` (`ignoreListRepository->exists`)
- `src/Orm/Entity/IgnoreList.php`

## SWU-Pfade

- neues Modul `apps/backend/src/modules/contacts/` (gemeinsam mit soc-B1a) oder `messaging`
- `apps/backend/src/modules/messaging/messaging.service.ts#send` (Haken aus soc-A1)
- `apps/frontend/src/pages/messages.tsx` (Abschnitt „Ignorierliste“), `apps/frontend/src/pages/player-profile.tsx` (Button „Ignorieren“)
- DTOs in `packages/shared`, Migration nach `docs/typeorm-migrations.md`

## Akzeptanzkriterien

- [x] Tabelle `ignore_list` (Besitzer, Ignorierter, Datum), eindeutig, `ON DELETE CASCADE` für beide Spieler.
- [x] Endpunkte: Liste; hinzufügen (ID); markierte löschen; alle löschen; „Siedler, die Dich ignorieren“.
- [x] Ablehnungen: unbekannter Spieler, eigener Account, bereits ignoriert.
- [x] `POST /messages` an einen Spieler, der den Absender ignoriert, liefert 403 „Der Siedler ignoriert Dich“. Systemnachrichten sind nicht betroffen.
- [x] UI: Abschnitt „Ignorierliste“ im Nachrichtenbereich mit Mehrfachauswahl und der Liste „Siedler, die Dich ignorieren“; im fremden Profil Button „Ignorieren“ bzw. „Nicht mehr ignorieren“.
- [x] Backend-Tests: CRUD, Ablehnungen, PM-Sperre (inkl. Gegenrichtung erlaubt). Frontend-Tests: Liste und Profilbutton.

## Comments

- Gerichtete Ignorierliste im Kontaktmodul mit Migration, CRUD-/Rückwärtsliste, PM-Haken und 403 umgesetzt; Nachrichten- und Profiloberflächen sowie Backend-/Frontend-Tests ergänzt. Keine offenen Folgepunkte.
