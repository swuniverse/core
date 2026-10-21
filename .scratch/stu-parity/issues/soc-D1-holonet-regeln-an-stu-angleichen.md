# HoloNet-Regeln an STU angleichen

**Status:** ready-for-agent
**Priority:** P1
**Size:** M
**Blocked by:** —

## Ziel

Das HoloNet erhält die serverseitigen Längenprüfungen und Löschregeln aus STU. `create` validiert heute nichts, Beiträge und Kommentare werden hart gelöscht und nur der Autor wird bei Kommentaren benachrichtigt. Die SWU-Kategorien (NEWS, ROLEPLAY, TRADE, RECRUITMENT) und der Admin-Pin bleiben als bewusste Erweiterung erhalten.

## STU-Quellen

- `src/Module/Communication/Action/AddKnPost/AddKnPost.php` (Titel 6–80, Text ≥ 50, Option `mark`)
- `src/Module/Communication/Action/EditKnPost/EditKnPost.php` (Text ≥ 10, `EDIT_TIME=600`, Admin jederzeit)
- `src/Module/Communication/Action/DeleteKnPost`, `DeleteKnComment` (weich, `setDeleted`)
- `src/Module/Communication/Action/PostKnComment/PostKnComment.php` (3–250 Zeichen, Benachrichtigung an Autor und alle bisherigen Kommentatoren)
- `src/Component/Communication/Kn/KnItem.php#getRatingBar`, `src/html/communication/knRating.twig`

## SWU-Pfade

- `apps/backend/src/modules/holonet/holonet.service.ts` (`create`, `update`, `delete`, `addComment`, `deleteComment`, `findAll`, `getNewCount`)
- `apps/backend/src/modules/holonet/holonet.controller.ts`
- `apps/backend/src/modules/holonet/entities/holonet-post.entity.ts`, `holonet-comment.entity.ts` (`deletedAt`), Migration
- `apps/frontend/src/pages/holonet.tsx` (`HolonetComposePage`, Bewertungsanzeige)
- DTOs in `packages/shared`

## Akzeptanzkriterien

- [ ] Neuer Beitrag: Titel 6–80 Zeichen, Text ≥ 50 Zeichen (getrimmt, Zeichen nach `[...string].length`), gültige Kategorie; sonst 400 mit deutscher Meldung. Text-Obergrenze (z. B. 20.000) gegen Missbrauch.
- [ ] Bearbeiten: Titel 6–80, Text ≥ 10; Autor innerhalb von 10 Minuten, Admins jederzeit (auch fremde Beiträge).
- [ ] Kommentar: 3–250 Zeichen.
- [ ] Beiträge und Kommentare werden weich gelöscht (`deletedAt`); gelöschte erscheinen nicht in Listen, Suche, Zählern, `new-count`, Dashboard-Vorschau und Permalink (404). `commentCount` bleibt konsistent.
- [ ] Neuer Kommentar benachrichtigt den Autor und alle anderen bisherigen Kommentatoren (je Spieler einmal, nicht den Kommentierenden selbst) per Systemnachricht.
- [ ] Bewertung: die API liefert `positiveCount` und `totalCount`; die UI zeigt einen Bewertungsbalken positiv/gesamt (gelb, wie STU) statt der Summe; ohne Bewertungen kein Balken.
- [ ] Compose: Checkbox „Lesezeichen auf diesen Beitrag setzen“ setzt nach dem Speichern den Checkpoint auf den neuen Beitrag.
- [ ] Backend-Tests für alle Grenzen, Admin-Bearbeitung, weiche Löschung (Liste/Zähler), Mehrfachbenachrichtigung. Frontend-Tests für Bewertungsbalken und Lesezeichen-Option.

## Comments
