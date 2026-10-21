# Kontaktliste: Backend und Freund-Wirkung im Resolver

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Spieler führen eine persönliche Kontaktliste mit Modus Freund, Neutral oder Feind, Kommentar und Datum. Ein Kontakt im Modus Freund wirkt über eine echte Implementierung von `PersonalContactStatusPort.isFriend` in der zentralen Haltungsauflösung, wie `CONTEXT.md` (Freund) es bereits vorsieht. Der Modus Feind ist in diesem Issue **nur eine Markierung ohne Spielwirkung**; seine Wirkung klärt soc-B1b.

## STU-Quellen

- `src/Module/Message/Action/AddContact/AddContact.php` (Prüfungen: existiert, nicht selbst, nicht doppelt; PM an den Eingetragenen „Der Siedler betrachtet Dich von nun an als Freund/Feind/neutral“)
- `src/Module/Message/Action/SwitchContactMode`, `EditContactComment`, `DeleteContacts`, `DeleteAllContacts`
- `src/Module/Message/Lib/ContactListModeEnum.php` (FRIEND=1, ENEMY=2, NEUTRAL=3)
- `src/Orm/Entity/Contact.php`, `src/Orm/Repository/ContactRepository.php#getByRecipient`
- `src/Component/Player/Relation/FriendDeterminator.php` (Kontakt als letzte Freund-Regel)
- `src/Component/Player/Deletion/Handler/ContactDeletionHandler.php`

## SWU-Pfade

- neues Modul `apps/backend/src/modules/contacts/` (Entity, Service, Controller, Modul) oder Teil von `messaging`
- `apps/backend/src/modules/alliance/relationship-resolver.service.ts` (`PersonalContactStatusPort`, `NoPersonalContactStatusPort`)
- `apps/backend/src/modules/alliance/alliance.module.ts` (Provider `PERSONAL_CONTACT_STATUS`)
- `apps/backend/src/modules/messaging/messaging.service.ts` (Benachrichtigung an den Eingetragenen)
- DTOs/Enum `ContactMode` in `packages/shared`
- Migration nach `docs/typeorm-migrations.md`

## Akzeptanzkriterien

- [ ] Tabelle `contacts` (Besitzer, Kontakt, Modus, Kommentar ≤ 255 Zeichen, Datum), eindeutig je Besitzer/Kontakt, `ON DELETE CASCADE` für beide Spieler.
- [ ] Endpunkte: Liste eigener Kontakte; Anlegen (Spieler-ID, Modus); Moduswechsel; Kommentar ändern; markierte löschen; alle löschen; Liste „Einträge anderer Siedler über Dich“ (wer hat mich mit welchem Modus eingetragen).
- [ ] Ablehnungen mit deutschen Meldungen: unbekannter Spieler, eigener Account, bereits eingetragen, ungültiger Modus.
- [ ] Anlegen und Moduswechsel senden dem Eingetragenen eine Systemnachricht mit dem STU-Text.
- [ ] Ein `ContactStatusAdapter` implementiert `PersonalContactStatusPort.isFriend(a, b)` (Kontakt von a über b im Modus Freund) und ersetzt den No-Op-Provider. Vorrang gemäß `CONTEXT.md`: Feind der anderen Fraktion und Allianzkrieg gehen vor; der Resolver bleibt gebündelt (keine N+1-Abfragen).
- [ ] Modus Feind und Neutral haben keine Wirkung auf die Haltung (Test belegt das).
- [ ] Backend-Tests: CRUD, Ablehnungsfälle, Benachrichtigung, Resolver liefert Freund über Kontakt, nicht über Fraktionsgrenzen, nicht gegen Allianzkrieg.

## Comments
