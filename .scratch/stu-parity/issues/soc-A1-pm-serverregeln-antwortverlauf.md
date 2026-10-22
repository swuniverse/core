# PM-Serverregeln und Antwortverlauf

**Status:** resolved
**Priority:** P1
**Size:** S
**Blocked by:** —

## Ziel

Das Senden persönlicher Nachrichten wird serverseitig abgesichert. Heute nimmt `POST /messages` ungeprüft `recipientId`, `subject` und `body` entgegen. Zusätzlich zeigt die Compose-Ansicht beim Antworten den bisherigen Verlauf mit dem Gesprächspartner wie STU (`CORRESPONDENCE`, 10 Nachrichten).

## STU-Quellen

- `src/Module/Message/Action/WritePm/WritePm.php` (Empfänger existiert, nicht an sich selbst, Text mindestens 5 Zeichen, Ignorier-Sperre)
- `src/Module/Message/View/ShowWritePm/ShowWritePm.php` (`CORRESPONDENCE_LIMIT_CLASSIC = 10`, `getOrderedCorrepondence`)
- `src/html/message/writePm.twig`

## SWU-Pfade

- `apps/backend/src/modules/messaging/messaging.controller.ts#send`, `messaging.service.ts#send`
- neuer Endpunkt, z. B. `GET /messages/correspondence/:partnerId?limit=10`
- `apps/frontend/src/pages/messages.tsx` (`replyTo`, Compose)
- DTOs in `packages/shared/src/lib/common/index.ts` (oder neues `messaging`-Modul in `packages/shared`)

## Akzeptanzkriterien

- [x] `POST /messages` validiert per DTO: `recipientId` positive Ganzzahl, `subject` 0–255 Zeichen (getrimmt), `body` 5–10.000 Zeichen (getrimmt). Verstöße liefern 400 mit deutscher Meldung.
- [x] Unbekannter Empfänger liefert 404 „Dieser Siedler existiert nicht“, kein FK-Fehler/500.
- [x] Nachricht an sich selbst liefert 400 „Du kannst Dir keine Nachricht schicken“.
- [x] Der Service bietet einen Haken für die Ignorier-Sperre (wird mit soc-C1a gefüllt), ohne dass hier schon eine Ignorierliste entsteht.
- [x] `GET /messages/correspondence/:partnerId` liefert die letzten 10 nicht gelöschten Nachrichten zwischen dem Aufrufer und dem Partner (Persönlich und Postausgang, keine Systemnachrichten), neueste zuerst; nur eigene Nachrichten sind sichtbar.
- [x] Beim Antworten zeigt die Compose-Ansicht den Verlauf unter dem Eingabefeld (Absender, Datum via `formatDateTime`, Text mit `BbCodeText`), UI nach `inventory/shell-admin-runtime.md` Abschnitt 3.
- [x] Das Frontend zeigt Serverfehler beim Senden als Toast und behält den Entwurf.
- [x] Backend-Tests (Service/Controller-Spec): alle Ablehnungsfälle, erfolgreicher Versand, Verlauf zeigt keine fremden oder gelöschten Nachrichten.
- [x] Frontend-Test (`messages.spec.tsx`): Antworten lädt und zeigt den Verlauf; Fehlermeldung bei 400.

## Comments

Implemented validated personal-message sending, recipient/self/ignore checks, and the protected ten-message correspondence endpoint in the messaging module. Reply composition now renders the BBCode correspondence and preserves the draft while showing send failures; backend and frontend coverage was added. The ignore hook remains intentionally unbound until soc-C1a.
