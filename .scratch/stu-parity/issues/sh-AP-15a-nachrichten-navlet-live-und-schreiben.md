# Nachrichten-Navlet: Hervorhebung, Live-Zähler, „Neue Nachricht schreiben“

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Die Ordner-Icons im Header zeigen wie STU bei ungelesenen Nachrichten das hervorgehobene Asset und eine betonte Zahl. Neue Nachrichten aktualisieren die Zähler sofort per Socket-Event statt erst beim nächsten Fokus. Die Userbox bekommt den STU-Knopf „Neue Nachricht schreiben“.

## STU-Quellen

- `src/html/game/component/pmComponent.twig` (`pmnavlet_<n>_1` bei Ungelesenen, `pm_new`-Zahl, Hover-Tausch sonst)
- `src/Module/Game/Component/MessageFolderComponent.php`
- `src/html/game/component/userComponent.twig` (`WRITE_PM`, Asset `buttons/msg1.png`)

## SWU-Pfade

- `apps/frontend/src/components/layout/header.tsx` (`MailboxFolderLink`, Assets `pmnavlet_<n>_0`)
- `apps/frontend/src/hooks/use-socket.ts`
- `apps/backend/src/modules/messaging/messaging.service.ts#send`, `#sendSystem`
- `apps/backend/src/modules/websocket/game.gateway.ts#emitToUser`
- `packages/shared/src/lib/common/index.ts` (`WsEventType`)
- `apps/frontend/src/pages/messages.tsx` (Route `/messages?tab=compose`)
- Assets: `assets/buttons/pmnavlet_<1-5>_<0|1>.png`, `assets/buttons/msg1.png`

## Akzeptanzkriterien

- [ ] Ordner mit ungelesenen Nachrichten zeigen `pmnavlet_<n>_1` und die Zahl in `text-swu-accent font-bold`; ohne Ungelesene `_0` mit Hover-Tausch auf `_1` und Zahl `0` in `text-swu-muted`.
- [ ] Neues `WsEventType.MESSAGE_RECEIVED` (Payload: Ordner); wird nach dem Speichern jeder Nachricht an den Empfänger gesendet (persönlich und System), auch bei Massen- und Tickmeldungen höchstens einmal je Empfänger und Vorgang.
- [ ] Der Header lädt bei diesem Event die Ordnerzähler neu (entprellt, z. B. 500 ms).
- [ ] Userbox enthält einen Icon-Link „Neue Nachricht schreiben“ (`buttons/msg1.png`, `title` und `aria-label`) auf `/messages?tab=compose`.
- [ ] Backend-Test: Event wird nach `send` und `sendSystem` an den Empfänger emittiert. Frontend-Tests: Asset-Wechsel bei Ungelesenen, Neuladen beim Event, Schreiben-Link.

## Comments
