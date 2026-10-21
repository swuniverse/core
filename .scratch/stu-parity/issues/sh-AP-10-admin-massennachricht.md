# Admin-Massennachricht (Ingame und optional E-Mail)

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Admins schicken eine Systemnachricht an alle Spieler oder an alle Spieler einer Fraktion. Optional geht sie zusätzlich als E-Mail an Spieler mit `email_notification = '1'`.

Vorgabe gemäß Leitplanke 4: Der E-Mail-Weg steht hinter derselben Konfiguration wie die PM-Benachrichtigung aus soc-A4, `PLAYER_MAIL_NOTIFICATIONS_ENABLED` (Default `false`; wer sie zuerst braucht, legt sie an und dokumentiert sie in `.env.example`). Ist sie aus, ist die Option im Formular deaktiviert.

## STU-Quellen

- `src/Module/Admin/Action/SendMassMail.php` (Medium PM oder E-Mail, NPCs ausgenommen, Zähler)
- `src/Module/Admin/View/MassMail`, `src/html/admin/massMail.twig`

## SWU-Pfade

- `apps/backend/src/modules/messaging/messaging.service.ts#sendSystem`
- `apps/backend/src/modules/mail/mail.service.ts`
- `apps/backend/src/modules/settings/settings.service.ts` (`email_notification`)
- neuer Admin-Endpunkt (z. B. `apps/backend/src/modules/messaging/messaging.controller.ts` `POST /messages/admin/broadcast`)
- `apps/frontend/src/pages/admin.tsx` bzw. neue Seite `admin-mass-message.tsx`

## Akzeptanzkriterien

- [ ] `POST /messages/admin/broadcast` (nur Admin): Betreff 1–255, Text ≥ 5 Zeichen, Zielgruppe `ALL` oder Fraktion, Flag `alsoEmail`.
- [ ] Jeder Empfänger erhält genau eine Systemnachricht (`deliveryKey` `broadcast:<broadcastId>:<userId>`, wiederholter Aufruf mit gleicher ID erzeugt keine Duplikate); NPC-Konten (falls tmw-W1 umgesetzt) sind ausgenommen.
- [ ] Bei `alsoEmail` und aktivem Flag: Mail an alle Empfänger mit `email_notification = '1'`, versendet nach dem Speichern der Nachrichten, Fehler je Adresse nur geloggt.
- [ ] Antwort und UI nennen die Anzahl der Ingame-Empfänger und der verschickten Mails.
- [ ] Formular mit Vorschau über `BbCodeText`, Bestätigungsdialog „An n Spieler senden?“.
- [ ] Backend-Tests: Admin-Pflicht, Fraktionsfilter, Idempotenz, Mail nur bei Flag und Einstellung. Frontend-Test: Formular und Ergebnisanzeige.

## Comments
