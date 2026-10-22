# HoloNet-Regeln an STU angleichen

**Status:** resolved
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

- [x] Neuer Beitrag: Titel 6–80 Zeichen, Text ≥ 50 Zeichen (getrimmt, Zeichen nach `[...string].length`), gültige Kategorie; sonst 400 mit deutscher Meldung. Text-Obergrenze (z. B. 20.000) gegen Missbrauch.
- [x] Bearbeiten: Titel 6–80, Text ≥ 10; Autor innerhalb von 10 Minuten, Admins jederzeit (auch fremde Beiträge).
- [x] Kommentar: 3–250 Zeichen.
- [x] Beiträge und Kommentare werden weich gelöscht (`deletedAt`); gelöschte erscheinen nicht in Listen, Suche, Zählern, `new-count`, Dashboard-Vorschau und Permalink (404). `commentCount` bleibt konsistent.
- [x] Neuer Kommentar benachrichtigt den Autor und alle anderen bisherigen Kommentatoren (je Spieler einmal, nicht den Kommentierenden selbst) per Systemnachricht.
- [x] Bewertung: die API liefert `positiveCount` und `totalCount`; die UI zeigt einen Bewertungsbalken positiv/gesamt (gelb, wie STU) statt der Summe; ohne Bewertungen kein Balken.
- [x] Compose: Checkbox „Lesezeichen auf diesen Beitrag setzen“ setzt nach dem Speichern den Checkpoint auf den neuen Beitrag.
- [x] Backend-Tests für alle Grenzen, Admin-Bearbeitung, weiche Löschung (Liste/Zähler), Mehrfachbenachrichtigung. Frontend-Tests für Bewertungsbalken und Lesezeichen-Option.

## Comments

- 2026-10-22: STU-Längenregeln, Admin-Bearbeitung, Soft-Delete mit gefilterten Listen/Zählern, Benachrichtigungen an alle Beteiligten, positive/gesamte Bewertungsanzeige und optionale Lesezeichen-Setzung umgesetzt. Affected lint/test/typecheck und vollständiger Build erfolgreich.
