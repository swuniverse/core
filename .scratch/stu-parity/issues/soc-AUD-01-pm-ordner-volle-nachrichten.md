# PM-Ordner mit vollen Nachrichten wie STU

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** soc-AUD-07b

## Ziel

Der PM-Ordner zeigt heute eine Betreffliste mit 20 Zeilen je Seite und einem Detailpanel. Den Text sieht man erst nach einem Klick. STU zeigt je Seite mehrere Nachrichten vollständig mit allen Aktionen je Nachricht (`pmCategory.twig`, 6 je Seite). Systemordner wie Schiffe, Kolonien und Handel lassen sich so ohne Klick überfliegen. Der Ordner soll wie in STU aufgebaut sein. Weil der Betreff mit soc-AUD-07b entfällt, gibt es keine Betreffzeile mehr.

## STU-Quellen

- `src/html/view/pmCategory.twig` (Karte je Nachricht)
- `src/html/communication/pmNavigation.twig` (Seitenzahlen), `src/html/communication/pmMoveSelector.twig`, `src/html/communication/pmSidebar.twig`
- `src/Module/Game/Lib/View/Provider/Message/ClassicStyleProvider.php` (`PMLIMITER = 6`, Gelesen-Markierung beim Anzeigen)
- `src/html/macros.twig` (`userInfo`, `userAvatar`, `pmWindow`)
- `src/Module/Message/Action/SwitchContactMode/SwitchContactMode.php`, `src/Module/Message/View/ShowContactModeSwitch/ShowContactModeSwitch.php`

## SWU-Pfade

- `apps/frontend/src/pages/messages.tsx` (`MessagesPage`, Ordnerliste ca. Z. 1100–1240, `MessageActionRail`)
- `apps/frontend/src/components/messaging/UserMessageFolders.tsx` (Verschieben)
- `apps/backend/src/modules/messaging/messaging.service.ts` (Ordnerabfrage, Gelesen-Markierung Z. ~159–170), `messaging.controller.ts`
- `apps/backend/src/modules/contacts/contact.service.ts` (Kontaktmodus für den Umschalter)
- `apps/frontend/src/pages/messages.spec.tsx`, `apps/backend/src/modules/messaging/messaging.service.spec.ts`

## Akzeptanzkriterien

- [ ] Ein Ordner zeigt je Seite 6 Nachrichten vollständig (wie STU `PMLIMITER`), jeweils mit BBCode-Text, Absender (Name mit Profillink und Siedler-ID), Avatar mit Profillink, NPC-Kennzeichen, absolutem Datum (hervorgehoben, wenn neu), Lesebestätigung (Postausgang) und „ansehen“-Link bei gesetztem Ziel.
- [ ] Aktionen je Nachricht: Antworten (öffnet Compose mit Antwortverlauf), Löschen, Checkbox für Mehrfachaktionen, Kontaktmodus-Umschalter für den Absender (Freund/Neutral/Feind bzw. Kontakt anlegen, nicht bei System-/NPC-Absender), Verschieben in einen eigenen Ordner per Auswahl je Nachricht (nur persönliche Nachrichten, wie soc-A7).
- [ ] Seitennavigation mit Seitenzahlen statt nur Zurück/Weiter.
- [ ] Angezeigte Nachrichten werden beim Anzeigen der Seite als gelesen markiert (STU), nicht erst beim Anklicken; Zähler und Navigationsbadge aktualisieren sich.
- [ ] Das Detailpanel entfällt im Ordner. Messenger-Ansicht (`inbox_messenger_style`) bleibt unverändert.
- [ ] Die API liefert je Nachricht die nötigen Absenderdaten (Avatar, `isNpc`, Kontaktmodus des Lesers zum Absender) ohne N+1-Abfragen.
- [ ] Backend-Tests: Seitengröße 6, Absenderdaten, Gelesen-Markierung beim Laden, Verschieben einer Einzelnachricht.
- [ ] Frontend-Tests: volle Karte mit Text/Avatar/NPC-Kennzeichen, Kontaktumschalter, Verschieben je Nachricht, Seitenzahlen.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt C (Zeile „PM-Ordner“) und M4 („Postfachliste zeigt dann Anfang des Texts bzw. Absender statt Betreff“); [social.md](../audit-2026-11-17/social.md) Große Abweichung 1 und Seitenabgleich `pmCategory.twig`.
- PO-Entscheidung M4 vom 2026-11-17 (Betreff entfällt) macht die Betreffliste gegenstandslos; daher Blocker soc-AUD-07b.
- Kein bisheriges Ticket; die Inventur führte den Ordner als „vorhanden“.

## Comments
