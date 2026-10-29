# Verlinkte Meldungen („ansehen“)

**Status:** claimed
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Nachrichten bekommen ein generisches, serverseitig erzeugtes Ziel (Kolonie, Schiff, HoloNet-Beitrag, Allianzthema), damit die UI wie STU einen Link „ansehen“ zeigt. Für Koloniemeldungen existiert das Ziel bereits über `originColonyId`, wird aber nicht angezeigt. Weitere Erzeuger setzen das Ziel in ihren jeweiligen Fachissues.

## STU-Quellen

- `src/Module/Message/Lib/PrivateMessageSender.php#getHref`, `EntityWithHrefInterface`
- `src/Orm/Entity/PrivateMessage.php` (`href`)
- `src/html/view/pmCategory.twig:34-40`

## SWU-Pfade

- `apps/backend/src/modules/messaging/entities/message.entity.ts` (z. B. `targetKind`, `targetId`), Migration nach `docs/typeorm-migrations.md`
- `apps/backend/src/modules/messaging/messaging.service.ts#sendSystem` (optionaler Zielparameter)
- `apps/backend/src/modules/messaging/colony-event.service.ts` (Kolonieziel setzen bzw. aus `originColonyId` ableiten)
- `apps/backend/src/modules/holonet/holonet.service.ts#addComment` (Ziel HoloNet-Beitrag)
- `apps/frontend/src/pages/messages.tsx`
- Typen in `packages/shared` (`MessageTargetKind`: `COLONY`, `SPACECRAFT`, `HOLONET_POST`, `ALLIANCE_TOPIC`)

## Akzeptanzkriterien

- [ ] Nachrichten tragen optional `targetKind` + `targetId`; die API liefert sie aus; die Route wird im Frontend aus einer zentralen Zuordnung gebaut (keine URLs in der DB).
- [ ] Koloniemeldungen (auch bestehende über `originColonyId`) zeigen „ansehen“ → `/colonies/:id` bzw. die vorhandene Koloniedetail-Route.
- [ ] HoloNet-Kommentarbenachrichtigungen zeigen „ansehen“ → `/holonet/:postId`.
- [ ] Ziele werden beim Anzeigen nicht auf Zugriffsrechte geprüft; die Zielseite prüft selbst (kein Datenleck durch die Nachricht).
- [ ] Backend-Tests: Ziel wird gespeichert und ausgeliefert; Migration läuft hoch und runter.
- [ ] Frontend-Test: Link wird je Zieltyp korrekt gerendert, ohne Ziel kein Link.

## Comments
