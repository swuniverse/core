# PM-Ordner mit vollen Nachrichten wie STU

**Status:** claimed
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

- [x] Ein Ordner zeigt je Seite 6 Nachrichten vollständig (wie STU `PMLIMITER`), jeweils mit BBCode-Text, Absender (Name mit Profillink und Siedler-ID), Avatar mit Profillink, NPC-Kennzeichen, absolutem Datum (hervorgehoben, wenn neu), Lesebestätigung (Postausgang) und „ansehen“-Link bei gesetztem Ziel.
- [x] Aktionen je Nachricht: Antworten (öffnet Compose mit Antwortverlauf), Löschen, Checkbox für Mehrfachaktionen, Kontaktmodus-Umschalter für den Absender (Freund/Neutral/Feind bzw. Kontakt anlegen, nicht bei System-/NPC-Absender), Verschieben in einen eigenen Ordner per Auswahl je Nachricht (nur persönliche Nachrichten, wie soc-A7).
- [x] Seitennavigation mit Seitenzahlen statt nur Zurück/Weiter.
- [x] Angezeigte Nachrichten werden beim Anzeigen der Seite als gelesen markiert (STU), nicht erst beim Anklicken; Zähler und Navigationsbadge aktualisieren sich.
- [x] Das Detailpanel entfällt im Ordner. Messenger-Ansicht (`inbox_messenger_style`) bleibt unverändert.
- [x] Die API liefert je Nachricht die nötigen Absenderdaten (Avatar, `isNpc`, Kontaktmodus des Lesers zum Absender) ohne N+1-Abfragen.
- [x] Backend-Tests: Seitengröße 6, Absenderdaten, Gelesen-Markierung beim Laden, Verschieben einer Einzelnachricht.
- [x] Frontend-Tests: volle Karte mit Text/Avatar/NPC-Kennzeichen, Kontaktumschalter, Verschieben je Nachricht, Seitenzahlen.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt C (Zeile „PM-Ordner“) und M4 („Postfachliste zeigt dann Anfang des Texts bzw. Absender statt Betreff“); [social.md](../audit-2026-11-17/social.md) Große Abweichung 1 und Seitenabgleich `pmCategory.twig`.
- PO-Entscheidung M4 vom 2026-11-17 (Betreff entfällt) macht die Betreffliste gegenstandslos; daher Blocker soc-AUD-07b.
- Kein bisheriges Ticket; die Inventur führte den Ordner als „vorhanden“.

## Comments

### 2026-11-24 · umgesetzt, Prüfung ausstehend

Commit: `feat(messaging): STU folder cards with full messages (stu-parity soc-AUD-01)`.

- Backend: Ordnerseiten (System-, Postausgang, eigene Ordner) mit 6 Nachrichten (`FOLDER_PAGE_SIZE`, STU `PMLIMITER`). Angezeigte empfangene Nachrichten werden beim Laden gelesen markiert; die Antwort trägt noch das alte `isRead` (Hervorhebung „neu“). Je Nachricht `sender` (id, username, avatar, faction, isNpc) und `senderContact` ({id, mode} des Lesers) über eine gebündelte Kontaktabfrage (`folder-page.ts`).
- Sicherheitsbefund behoben: `sender`/`recipient` wurden bisher als volle `User`-Entität ausgeliefert (inkl. `email`, `passwordHash`) in Ordner, Postausgang, Einzelnachricht und Korrespondenz. Jetzt nur öffentliche Felder (`publicUser`).
- Frontend: `MessageCard` (BBCode-Text, Avatar/Name mit Profillink, Siedler-ID, NPC-Kennzeichen, absolutes Datum, neu hervorgehoben, Lesebestätigung, „ansehen“, Antworten mit Verlauf, Löschen, Checkbox, Kontaktmodus-Umschalter, Verschieben je Nachricht) und `PageNumbers`. Detailpanel entfernt; Messenger-Ansicht unverändert. Kopfzeilenbadge aktualisiert sich über `swu:messages-read`.
- Checks: `nx typecheck backend`/`frontend` grün; Backend-Unit `messaging`+`contacts` 45/45; Integration `messaging-folders`+`user-message-folders` 17/17; Frontend `messages.spec` 28/28, `header`+`messaging` 19/19.
- Ausstehend: gesammelter Verifikationslauf (volle Suites/Build, Diff-Review gegen Kriterien).
- Modell: Luna/Sol in dieser Sitzung nicht verfügbar; direkt mit Claude Opus 5.5 umgesetzt.
