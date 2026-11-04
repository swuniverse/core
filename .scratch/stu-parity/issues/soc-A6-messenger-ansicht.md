# Messenger-Ansicht für „Persönlich“

**Status:** resolved
**Priority:** P3
**Size:** M
**Blocked by:** soc-A1

## Ziel

Mit der neuen Einstellung `inbox_messenger_style` wird der Ordner Persönlich nach Gesprächspartnern gruppiert angezeigt: 20 Gespräche je Seite, mit letzter Nachricht, Datum und Ungelesen-Status. Ein Klick öffnet den Verlauf mit dem Partner samt Antwortfeld.

## STU-Quellen

- `src/Module/Game/Lib/View/Provider/Message/MessengerStyleProvider.php` (`CONVERSATION_LIMIT = 20`)
- `src/Module/Game/Lib/View/Provider/Message/Conversation.php`
- `src/html/communication/conversations.twig`
- `src/Module/PlayerSetting/Lib/UserSettingEnum.php` (`INBOX_MESSENGER_STYLE`)

## SWU-Pfade

- `apps/backend/src/modules/messaging/messaging.service.ts` (neue Abfrage `getConversations`), `messaging.controller.ts` (`GET /messages/conversations?page=`)
- Verlauf aus soc-A1 (`GET /messages/correspondence/:partnerId`)
- `apps/backend/src/modules/settings/settings.service.ts` (`inbox_messenger_style`, Default `'0'`)
- `apps/frontend/src/pages/messages.tsx`, `apps/frontend/src/pages/settings.tsx`

## Akzeptanzkriterien

- [x] Neue Einstellung `inbox_messenger_style` (`'0'`/`'1'`, Default `'0'`) ist im Einstellungs-UI schaltbar und wird serverseitig validiert.
- [x] `GET /messages/conversations` liefert je Partner: Partner-ID/Name/Avatar, letzte Nachricht (gekürzt), Datum, Anzahl ungelesener; sortiert nach letzter Aktivität; 20 je Seite mit Gesamtzahl. Nur persönliche, nicht gelöschte Nachrichten (empfangen und gesendet).
- [x] Ist die Einstellung aktiv, zeigt der Ordner Persönlich die Gesprächsliste; ein Gespräch öffnet den Verlauf mit direkter Antwortmöglichkeit.
- [x] Ordnerzähler im Header bleiben unverändert korrekt.
- [x] Backend-Tests: Paginierung und Sichtbarkeitsfilter der Conversations-Abfrage.
- [x] Frontend-Tests: Umschalten der Ansicht, Öffnen eines Gesprächs.

## Comments

Implemented the optional personal-inbox messenger style with validated persisted settings, a paginated protected conversation query, and conversation-to-reply UI. Focused backend and frontend tests, typechecks, lint, and diff whitespace checks pass.
