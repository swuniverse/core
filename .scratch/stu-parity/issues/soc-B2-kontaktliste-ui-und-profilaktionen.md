# Kontaktliste: UI und Profilaktionen

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** soc-B1a, soc-A2

## Ziel

Die Kontaktliste wird im Nachrichtenbereich als eigener Abschnitt „Kontakte“ bedienbar (wie STU `pmSidebar.twig`), mit Mehrfachauswahl, Moduswechsel, Kommentar und der Liste „Einträge anderer Siedler über Dich“. Im Spielerprofil gibt es „Zu Kontakten hinzufügen“ bzw. den Modusumschalter. Im Compose gibt es ein Kontakt-Dropdown für den Empfänger.

## STU-Quellen

- `src/html/user/contactList.twig`, `contactModeSwitch.twig`, `contactButton.twig`, `contactListModeSelector.twig`, `contactMode.twig`
- `src/html/communication/pmSidebar.twig`
- `src/html/view/userprofile.twig:16-30`
- `src/Module/Message/View/ShowContactList`, `ShowContactMode`, `ShowContactModeSwitch`

## SWU-Pfade

- `apps/frontend/src/pages/messages.tsx` (neuer Abschnitt/Tab „Kontakte“)
- `apps/frontend/src/pages/player-profile.tsx`
- Endpunkte aus soc-B1a
- UI-Konventionen `inventory/shell-admin-runtime.md` Abschnitt 3 (Tabellen, Buttons, keine Emoji)

## Akzeptanzkriterien

- [x] Abschnitt „Kontakte“ unter Nachrichten: Tabelle mit Avatar, Name (Link zum Profil), Modus (farbig: Freund grün, Neutral grau, Feind rot), Kommentar (inline editierbar), Datum, PM-Link; Mehrfachauswahl „markierte löschen“ und „alle löschen“ mit Bestätigung.
- [x] Formular „Kontakt hinzufügen“ per Siedler-ID oder Namenssuche (vorhandener Endpunkt `GET /user/search`) mit Modus.
- [x] Tabelle „Einträge anderer Siedler über Dich“.
- [x] Spielerprofil (fremd): Button „Zu Kontakten hinzufügen“ bzw. Moduswechsel, wenn bereits Kontakt.
- [x] Compose: Dropdown „Kontakt wählen“ belegt den Empfänger vor.
- [x] Frontend-Tests: Liste rendert, Moduswechsel ruft den Endpunkt, Profilbutton, Compose-Dropdown.

## Comments

Kontaktverwaltung im Nachrichtenbereich, Profilaktionen und Compose-Auswahl wurden auf den vorhandenen Kontaktendpunkten umgesetzt. Der API-Client unterstützt nun DELETE-Requests mit Body; keine offenen Folgepunkte.
