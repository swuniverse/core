# Verlinkte Meldungen („ansehen“)

**Status:** resolved
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

- [x] Nachrichten tragen optional `targetKind` + `targetId`; die API liefert sie aus; die Route wird im Frontend aus einer zentralen Zuordnung gebaut (keine URLs in der DB).
- [x] Koloniemeldungen (auch bestehende über `originColonyId`) zeigen „ansehen“ → `/colonies/:id` bzw. die vorhandene Koloniedetail-Route.
- [x] HoloNet-Kommentarbenachrichtigungen zeigen „ansehen“ → `/holonet/:postId`.
- [x] Ziele werden beim Anzeigen nicht auf Zugriffsrechte geprüft; die Zielseite prüft selbst (kein Datenleck durch die Nachricht).
- [x] Backend-Tests: Ziel wird gespeichert und ausgeliefert; Migration läuft hoch und runter.
- [x] Frontend-Test: Link wird je Zieltyp korrekt gerendert, ohne Ziel kein Link.

## Comments

Implemented typed message targets in shared/backend persistence, including migration backfill for existing colony events, colony and HoloNet-comment producers, and centralized frontend route rendering. Added public-seam backend/frontend tests plus migration up/down coverage. The repository-wide Nx affected typecheck remains blocked by pre-existing frontend TS6305 declaration-output failures; focused tests and all builds pass.
