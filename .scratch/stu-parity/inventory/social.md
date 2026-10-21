# STU→SWU-Paritätsinventur: Kommunikation und Soziales

Stand: 2026-10-21. Nur gelesen, kein Produktcode geändert.
Referenz STU: `/Users/TMUNDIN/git/github.com/st-universe/core/src` (kurz `STU/`), Templates unter `STU/html/`, Assets unter `st-universe/assets`.
Ziel SWU: `apps/backend/src/modules` (kurz `BE/`), `apps/frontend/src/pages` (kurz `FE/`), `apps/frontend/src/components` (kurz `FC/`), `packages/shared` (kurz `SH/`).

Grundlagen: `CONTEXT.md`, `docs/adr/0001-allianzen-abweichungen-von-stu.md`, `.scratch/alliance-stu-parity/map.md` (alle sechs Etappen umgesetzt), `.scratch/alliance/stu-alliance-research.md`, `.scratch/events-and-message-folders/spec.md` (Tickets 01–07 `resolved`), `stu-swu-ui-parity-audit.md` (für diesen Bereich ohne eigene Befunde).

Bewertungen: **vorhanden**, **teilweise**, **fehlt**, **abweichend** (bewusst oder faktisch, siehe Notiz), **geplant** (offenes Ticket), **n/a** (in SWU sinnlos). „(?)“ heißt: nicht abschließend verifiziert.

STU-Module im Bereich: `Module/Communication` (KN, RPG-Plots, Quests), `Module/Message` (PMs, Ordner, Kontakte, Ignorierliste, Siedler-Abkommen), `Module/Notes`, `Module/PlayerProfile`, `Module/PlayerSetting`, `Module/Award`, `Module/Prestige`, `Module/History`, `Component/Communication`, `Component/Player`, `Component/History`, `Lib/Mail`, `Lib/StuBbCode*`. Die Views liegen zum Teil in `STU/Module/Game/Lib/View/Provider/` (`CommunicationProvider`, `Message/*`, `UserProfileProvider`, `PlayerSettingsProvider`, `HistoryProvider`).

---

## 1. Übersicht

**Gut abgedeckt:**

- **Nachrichten:** sieben feste Ordner mit Zählern `ungelesen/gesamt`, Header-Iconleiste, Lesen, Antworten, Einzel- und Mehrfachlöschen, Ordner als gelesen markieren, Ordner leeren, Postausgang, Koloniemeldungen mit Schweregrad (`BE/messaging/*`, `FE/messages.tsx`, `FC/layout/header.tsx`).
- **HoloNet (KN):** Beiträge, 10-Minuten-Bearbeitungsfenster, Kommentare (250 Zeichen, Autor wird benachrichtigt), ±1-Bewertung mit 5 Prestige, Lesezeichen und „neue Beiträge“, Suche nach Text, Spieler-ID und Beitrag-ID, Permalink, Dashboard-Vorschau (`BE/holonet/*`, `FE/holonet.tsx`).
- **Globale History:** `/events` mit Typfilter, Zählern, Suche, Limit und Ortslinks (`BE/events/*`, `FE/events.tsx`).
- **Prestige:** Service, Historie, Datenbankansicht „Prestigehistorie“, Profilwert (`BE/prestige/*`, `BE/database`).
- **Profil und Einstellungen:** Avatar, Anzeigename, Beschreibung mit BBCode und Übersetzungsblock, Fraktion, Allianz, „Siedler seit“, öffentliche Siedlerdiplomatie, Kolonie-Scans. Passwort, E-Mail, Urlaubsmodus mit 7-Tage-Sperre, Löschantrag.
- **Allianz und Siedler-Abkommen:** vollständig über die sechs Etappen. STUs `UserRelation`-Aktionen aus dem Message-Modul stecken in SWU in der Siedlerdiplomatie.

**Größte Lücken:**

1. **Kontaktliste und Ignorierliste fehlen vollständig.** Für Kontakte gibt es nur den No-Op-Port `PersonalContactStatusPort`.
2. **RPG-Schicht fehlt:** Plots, Charaktere, Charakter-Markierung in KN-Beiträgen, RPG-Verhalten.
3. **Awards fehlen vollständig.**
4. **PM-Komfort fehlt:** Schnell-PM von Profil und HoloNet, Korrespondenzverlauf beim Antworten, eigene Ordner, Verschieben, Messenger-Ansicht, Lesebestätigung, E-Mail-Benachrichtigung.
5. **Einstellungen ohne Wirkung:** Vier Einstellungen werden gespeichert, aber nirgends gelesen. Viele STU-Einstellungen fehlen ganz.
6. **History-Erzeuger:** Nur `SHIP`-Ereignisse werden erzeugt. Diplomatie-, Stations-, Kolonie- und sonstige Einträge fehlen.
7. **Mail:** Es gibt nur die Willkommensmail. Passwort-Reset, Löschbestätigung und PM-Benachrichtigung fehlen.

---

## 2. Feature-Tabelle

### 2.1 Private Nachrichten (Module/Message, Provider/Message)

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Systemordner Persönlich, Schiffe, Kolonien, Handel, System, Postausgang, Stationen mit Zählern | `Message/Lib/PrivateMessageFolderTypeEnum.php`, `Provider/Message/MessageProvider.php`, `html/communication/pmCategoryList.twig` | vorhanden | `BE/messaging/message-folder.ts`, `messaging.service.ts#getFolderSummary`, `FE/messages.tsx`, `FC/layout/header.tsx` | Umgesetzt über die Spec `events-and-message-folders` |
| Eigene Ordner anlegen, umbenennen, löschen, sortieren | `Action/AddPmCategory`, `EditPmCategory`, `DeletePmCategory`, `SortPmCategories`, `View/ShowNewPmCategory`, `ShowEditPmCategory`, `html/communication/newCategory.twig`, `editCategory.twig`, `pmCategorySortingJs.twig` | fehlt | — | `MessageFolder` ist laut Spec eine geschlossene Menge. Eigene Ordner bräuchten ein eigenes Modell. |
| PM in einen (eigenen) Ordner verschieben | `Action/MovePm`, `html/communication/pmMoveSelector.twig` | fehlt | — | Hängt an den eigenen Ordnern |
| PM schreiben (Empfänger, Text) | `Action/WritePm`, `View/ShowWritePm`, `html/message/writePm.twig` | teilweise | `BE/messaging/messaging.controller.ts#send`, `FE/messages.tsx` (Compose) | SWU sucht den Empfänger per Name und hat einen Betreff (STU: Siedler-ID oder Kontakt-Dropdown, kein Betreff). Es fehlen die Serverprüfungen aus STU: Empfänger existiert, nicht an sich selbst, Text mindestens 5 Zeichen, „Der Siedler ignoriert Dich“. Das Backend validiert weder Längen (Betreff ist `varchar(255)`) noch die Existenz des Empfängers (?). |
| Antworten mit Korrespondenzverlauf | `View/ShowWritePm` (`CORRESPONDENCE`, `getOrderedCorrepondence`) | teilweise | `FE/messages.tsx#replyTo` | SWU füllt nur den Empfänger vor. Der bisherige Verlauf mit dem Partner fehlt. |
| Schnell-PM aus Profil, KN, Schiff und Kolonie (Popup) | `View/ShowWriteQuickPm`, `ShowWriteQuickPmResponse`, `html/communication/writeQuickPm.twig`, Macro `pmWindow` | teilweise | Deep-Link `/messages?tab=compose&to=&name=` nur in `FE/alliance-member-overview.tsx` | Im Profil gibt es keinen PM-Button. Der ✉-Button im HoloNet öffnet nur `/messages` ohne Empfänger (`FE/holonet.tsx:522`). Der Profil-Button dort ist deaktiviert („Siedlerprofil vorbereitet“). |
| Crew-Erfahrung für Quick-PM | `Message/Lib/QuickPmCrewExperience.php` | n/a | — | SWU hat keine Crew-XP-Infrastruktur (vgl. `CONTEXT.md`, Messpunkt) |
| Messenger-Ansicht (Persönlich nach Gesprächspartnern gruppiert) | `Provider/Message/MessengerStyleProvider.php`, `Conversation.php`, `html/communication/conversations.twig`, Einstellung `INBOX_MESSENGER_STYLE` | fehlt | — | |
| Löschen einzeln, markierte, Ordner leeren | `Action/DeletePms`, `DeleteAllPms` | vorhanden | `messaging.controller.ts` (`DELETE :id`, `bulk-delete`, `folders/:f/empty`) | |
| Ordner als gelesen markieren | `Action/MarkPmsRead` | vorhanden | `folders/:f/mark-read` | |
| Lesebestätigung im Postausgang | Einstellung `SHOW_PM_READ_RECEIPT`, `html/view/pmCategory.twig` („Nachricht gelesen“) | fehlt | Einstellung `show_pm_read_receipt` in `BE/settings/settings.service.ts` | Die Einstellung wird gespeichert, aber nirgends gelesen. Der Postausgang zeigt den Gelesen-Status des Empfängers nicht. |
| Verlinkte Systemmeldung („ansehen“, `href`) | `PrivateMessage::href`, `PrivateMessageSender::getHref`, `pmCategory.twig:34` | teilweise | `Message.originColonyId` | Die Spec sieht Navigation zur Kolonie vor, die UI zeigt aber keinen Link. Ein allgemeines Ziel (Schiff, KN-Beitrag, Plot) fehlt. |
| E-Mail-Benachrichtigung bei neuer persönlicher PM | `Message/Lib/EmailNotificationSender.php`, `PrivateMessageSender::createPrivateMessage`, Einstellung `EMAIL_NOTIFICATION` | fehlt | `BE/mail/mail.service.ts` (SMTP vorhanden), Einstellung `email_notification` | Die Einstellung wird gespeichert, aber nicht gelesen |
| Willkommens-PM der Fraktion | `Message/Lib/SendWelcomeMessage.php` | fehlt | — | SWU verschickt stattdessen eine Willkommens-E-Mail (`mail.service.ts#sendWelcomeMail`) |
| Verteilte Systemmeldungen und Broadcast | `DistributedMessageSender.php`, `PrivateMessageSender::sendBroadcast` | vorhanden | `messaging.service.ts#sendSystem` (idempotent mit `deliveryKey`), `BE/spacecraft/spacecraft-communication.service.ts#broadcast` | Schiffs-Broadcast gehört zum Schiffsbereich |

### 2.2 Kontakte, Ignorierliste, Siedler-Abkommen (Module/Message, Component/Player/Relation)

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Kontaktliste: Hinzufügen per Siedler-ID, Modus Freund/Feind/Neutral, Kommentar, Löschen, alle löschen | `Action/AddContact`, `SwitchContactMode`, `EditContactComment`, `DeleteContacts`, `DeleteAllContacts`, `View/ShowContactList`, `ShowContactMode`, `ShowContactModeSwitch`, `Lib/ContactListModeEnum.php`, `html/user/contactList.twig`, `contactModeSwitch.twig`, `contactButton.twig` | fehlt | Port `PersonalContactStatusPort` / `NoPersonalContactStatusPort` in `BE/alliance/relationship-resolver.service.ts:72-83` | In `map.md` als benannter Integrationspunkt geführt |
| „Einträge anderer Siedler über Dich“ | `contactList.twig`, `ContactRepository::getByRecipient` | fehlt | — | |
| Kontakt als Freund wirkt im Freund-Feind-Resolver | `Component/Player/Relation/FriendDeterminator.php` (`PlayerRelationTypeEnum::USER`) | fehlt (Port vorbereitet) | `relationship-resolver.service.ts` | `CONTEXT.md` (Freund) sieht die Wirkung bereits vor |
| Kontakt als Feind wirkt (EnemyDeterminator, Kartenfarbe) | `EnemyDeterminator.php`, `Starmap/View/ShowUserStarmapRealtime.php:580ff` | fehlt | — | Widerspricht teilweise `CONTEXT.md`, wonach Feinde nur Spieler der anderen Fraktion sind. Siehe NEEDS-DECISION. |
| Kontaktrechte „Als Freund behandeln“ und „Live-Position teilen“ (einseitig) | `Action/UpdateContactPermissions`, `Contact::relationPermissions`, `Component/Alliance/Enum/RelationPermissionEnum.php` | fehlt | Freigaben existieren nur für Beziehungen (`mayShareLivePosition`) | |
| Kontaktumschalter und Ignorieren-Button im Profil | `html/view/userprofile.twig:16-33`, `user/ignoreButton.twig` | fehlt | `FE/player-profile.tsx` | |
| Ignorierliste: hinzufügen, löschen, alle löschen, „Siedler die Dich ignorieren“ | `Action/IgnoreUser`, `DeleteIgnores`, `DeleteAllIgnores`, `View/ShowIgnoreList`, `ShowIgnore`, `html/communication/ignorelist.twig`, `ignoretext.twig` | fehlt | — | |
| Ignorieren sperrt PMs | `Action/WritePm` (`ignoreListRepository->exists`) | fehlt | `messaging.service.ts#send` | Einziger fachlicher Verbraucher in STU |
| Siedler-Abkommen (Vorschlag, Annahme, Ablehnung, Rückzug, Frieden, Rechte) | `Action/CreateUserRelation`, `UserRelation/*`, `Component/Player/Relation/*` | vorhanden | `BE/alliance/*` (Siedlerdiplomatie), `FE/alliances.tsx` (`/alliances/settlers/diplomacy`), `FE/player-profile.tsx` (`SettlerPublicDiplomacy`) | Siehe `map.md`, Etappe 6 |

### 2.3 Notizen (Module/Notes)

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Mehrere Notizen mit Titel und Datum, Liste, Anlegen, Bearbeiten, markierte löschen | `Notes/Action/SaveNote`, `DeleteNotes`, `View/Overview`, `ShowNote`, `ShowNewNote`, `Orm/Entity/Note.php`, `html/notes/notes.twig`, `note.twig` | abweichend (faktisch) | `BE/settings/settings.controller.ts` (`GET/PATCH user/notes`), `User.notes`, `FE/notes.tsx`, Header-Button „Notizzettel öffnen“ | SWU hat **einen** Freitext-Notizzettel mit Autosave und localStorage-Fallback (max. 100.000 Zeichen) |

### 2.4 HoloNet / KN (Module/Communication, Component/Communication/Kn)

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Beitragsliste mit Seitennavigation | `Provider/CommunicationProvider.php`, `html/view/communication.twig`, `communication/kn.twig`, `knNavigation.twig` | vorhanden | `BE/holonet/holonet.service.ts#findAll`, `FE/holonet.tsx` | 20 statt 6 Beiträge je Seite |
| Kategorien NEWS, ROLEPLAY, TRADE, RECRUITMENT | — | abweichend (SWU-Erweiterung) | `holonet-post.entity.ts` | STU kennt keine Kategorien, nur Plot-Zuordnung |
| Beitrag schreiben | `Action/AddKnPost`, `View/ShowWriteKn`, `html/communication/writeKn.twig` | teilweise | `holonet.controller.ts#create`, `FE/holonet.tsx#HolonetComposePage` | Es fehlen die Prüfungen aus STU: Titel 6–80 Zeichen, Text mindestens 50, beim Bearbeiten mindestens 10. `create` validiert serverseitig nichts. Es fehlt außerdem die Option „Lesezeichen auf eigenen Beitrag setzen“ (`mark`). |
| Vorschau vor dem Absenden | `Action/KnPostPreview` | fehlt | — | |
| Bearbeiten und Löschen durch den Autor innerhalb von 10 Minuten | `Action/EditKnPost` (`EDIT_TIME=600`), `DeleteKnPost` | vorhanden | `holonet.service.ts#update/#delete` | STU löscht weich (`setDeleted`), SWU hart (`remove`). Admins dürfen in STU jederzeit bearbeiten, in SWU nicht. |
| Admin-Löschung mit Begründung und PM an den Autor | `Action/AdminDeleteKnPost`, `View/ShowAdminDeletePost`, `html/communication/adminDelete.twig` | fehlt | — | SWU hat stattdessen Admin-Pin (`togglePin`), eine SWU-Erweiterung |
| Kommentare (max. 250 Zeichen), eigene löschen | `Action/PostKnComment` (`CHARACTER_LIMIT=250`), `DeleteKnComment`, `View/ShowKnComments`, `knComments.twig` | vorhanden | `holonet.service.ts#addComment/#deleteComment` | STU verlangt mindestens 3 Zeichen und löscht weich |
| Benachrichtigung an den Autor bei Kommentar | `PostKnComment` | vorhanden | `holonet.service.ts#addComment` (`sendSystem`) | |
| Benachrichtigung an alle anderen Kommentatoren | `PostKnComment` (Schleife über `getComments`) | fehlt | — | |
| Bewertung ±1, einmal, nicht der eigene Beitrag, +5 Prestige bei positiver Bewertung | `Action/RateKnPost`, `View/ShowKnRating`, `knRating.twig` | vorhanden | `holonet.service.ts#rate`, `STU_PRESTIGE.HOLONET_POSITIVE_RATING` | STU zeigt einen Bewertungsbalken (positive/gesamt), SWU die Summe |
| Lesezeichen setzen, „Neue Beiträge ab Lesezeichen“ | `Action/SetKnMark`, `CommunicationProvider` (`user_mark`, `markedPost`) | vorhanden | `holonet.service.ts#updateCheckpoint/#getNewCount`, `FE/holonet.tsx` | |
| Zähler neuer KN-Beiträge in der Navigation | `CommunicationProvider` (`NEW_KN_POSTING_COUNT`), Maindesk `html/maindesk/newKnPostings.twig` | teilweise | `GET holonet/new-count` existiert; das Dashboard zeigt 5 Beiträge (`FE/dashboard/DashboardLowerSections.tsx`) | Kein Frontend-Verbraucher von `new-count` gefunden, also kein Badge in Header oder Sidebar (?) |
| Suche nach Text, Spieler, Beitrag-ID | `View/ShowSearchResult/*` | vorhanden | `holonet.controller.ts#findAll` (`text`, `authorId`, `postId`) | |
| Einzelbeitrag (Permalink) | `View/ShowSingleKn` | vorhanden | `/holonet/:id` | |
| Links zu Autorprofil und PM am Beitrag | `KnItem::displayContactLinks`, `kn.twig` | teilweise | `FE/holonet.tsx:516-533` | Der PM-Button hat keinen Empfänger, der Profil-Button ist deaktiviert |
| Übersetzungsblock `[translate]` | `KnItem::hasTranslation`, `initTranslations()` | vorhanden | `FC/BbCodeText.tsx` | |
| KN-Archiv früherer Spielversionen (Liste, Plots, Kommentare, Suche) | `View/ShowKnArchive*`, `ShowArchiveSearchResult`, `Component/Communication/Kn/KnArchive*`, `knArchiv.twig`, `plot/plotsArchiv.twig` | n/a | — | SWU hat keine früheren Runden. Achtung: SWU nennt die Live-Liste in der UI „Archiv“ (`FE/holonet.tsx:257`). |

### 2.5 RPG: Plots, Charaktere, Quests (Module/Communication, Module/PlayerProfile)

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Plot anlegen, bearbeiten, beenden | `Action/CreateKnPlot`, `EditKnPlot`, `EndKnPlot`, `View/ShowCreatePlot`, `ShowEditPlot`, `plot/createPlot.twig`, `editPlot.twig` | fehlt | — | Titel 6–80 Zeichen, Ersteller wird erstes Mitglied |
| Plotmitglieder hinzufügen und entfernen (mit PM) | `Action/AddKnPlotMember`, `DeleteKnPlotMember`, `Lib/PlotMemberService.php` | fehlt | — | |
| Plotlisten (alle, meine) und Plotdetail mit Beiträgen | `View/ShowPlotList`, `ShowUserPlotList`, `ShowKnPlot`, `plot/plotList.twig`, `userPlots.twig`, `plotdetails.twig` | fehlt | — | |
| KN-Beitrag in Plot (ohne Titelpflicht), Mitglieder werden benachrichtigt | `AddKnPost` (plotId), `Lib/NewKnPostNotificator.php` | fehlt | — | |
| Fremden Beitrag einem Plot zuordnen (Antrag und Annahme) | `Action/ApplyKnPostToPlot`, `AddKnPostToPlot` | fehlt | — | |
| Plots im Profil | `UserProfileProvider` (`RPG_PLOTS`), `userprofile.twig` „Plots“ | fehlt | — | |
| Charaktere im Profil anlegen, bearbeiten, löschen (Name, Beschreibung, Avatar) | `PlayerProfile/Action/CreateCharacter`, `ChangeCharacter`, `DeleteCharacter`, `Orm/Entity/UserCharacter.php`, `userprofile.twig` (`charactersContainer`) | fehlt | — | |
| Charaktere in KN-Beiträgen markieren, Besitzer benachrichtigen, Charakteransicht | `AddKnPost`/`EditKnPost` (`characterIds`), `View/ShowKnCharacter`, `knCharacter.twig` | fehlt | — | |
| RPG-Verhalten (aktiv, gelegentlich, ungern) im Profil | `Component/Player/UserRpgBehaviorEnum.php`, Einstellung `RPG_BEHAVIOR` | fehlt | — | |
| NPC-Quests (Liste, Bewerben, Einladung annehmen oder ablehnen, Belohnung, Koloniewahl) | `Action/ApplyForQuest`, `AcceptQuestInvitation`, `RejectQuestInvitation`, `ClaimQuestReward`, `View/ShowQuest*`, `html/communication/quest/*` | fehlt | — | Eigenes NPC-System, nur im KN-Modul eingehängt. Wohl eher im NPC/Admin-Bereich zu inventarisieren (?). |

### 2.6 Spielerprofil (Module/PlayerProfile, UserProfileProvider)

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Kopf: Avatar, Name, Fraktion, Allianz, „Siedler seit“ | `userprofile.twig:1-70` | vorhanden | `FE/player-profile.tsx`, `BE/database` (`GET database/settlers/:id`) | SWU zeigt zusätzlich Prestige, Kolonien, Schiffe, Forschung und das Admin-Badge |
| Beschreibung mit BBCode, Bildern und Übersetzung | `UserProfileProvider` (`ParserWithImage`), `StuBbCodeWithImageDefinitionSet.php` | teilweise | `FC/BbCodeText.tsx` | `[img]` und `[color]` werden nicht gerendert, siehe 2.10 |
| Aktionen: PM, Kontakt, Ignorieren | `userprofile.twig:6-36` | fehlt | — | Siehe 2.1 und 2.2 |
| Diplomatische Abkommen eines Siedlers | `UserProfileProvider` (`USER_RELATIONS`) | vorhanden | `SettlerPublicDiplomacy` | |
| Freunde (Avatare) | `UserProfileProvider` (`getFriendsByUserAndAlliance`) | fehlt | — | Genaue STU-Semantik nicht geprüft (?) |
| Awards mit Anzahl | `userprofile.twig:140-160` | fehlt | — | Siehe 2.8 |
| Kolonie-Scans (neueste je Kolonie, Löschen, Oberfläche) | `UserProfileProvider#getColonyScanList`, `View/ShowColonySurface` | vorhanden | `FC/database/ColonyScans.tsx`, `FE/player-profile.tsx` | Das Ticket `stu-systemdatenbank-und-kolonie-scans/issues/07` steht noch auf `ready-for-agent`, der Code ist aber vorhanden (`player-profile-scans.spec.tsx`). Status prüfen. |
| Schiffslogbücher (eigene sowie gescannte, nicht private fremde) | `SpacecraftLogRepository::getGroupedLogbooksForProfile`, `userprofile.twig` „Schiffslogbücher“ | fehlt | Logbuch existiert schiffsseitig (`BE/spacecraft/entities/ship-log-entry.entity.ts`, ohne `isPrivate`) | Bereichsübergreifend: Schiff |
| Profilbesucher erfassen und im Maindesk anzeigen | `PlayerProfile/Lib/ProfileVisitorRegistration.php`, `html/maindesk/visitors.twig` | fehlt | — | |
| Charaktere und Plots | siehe 2.5 | fehlt | — | |

### 2.7 Einstellungen (Module/PlayerSetting, Component/Player/Settings)

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Spielername ändern | `Action/ChangeUserName` | vorhanden (abweichend) | `PATCH user/profile` (`displayName`, 3–60 Zeichen, reiner Text) | STU erlaubt BBCode im Namen, siehe 2.10 |
| Passwort ändern | `Action/ChangePassword` | vorhanden | `PATCH user/password` | |
| E-Mail ändern | `Action/ChangeEmail` | teilweise | `PATCH user/email` | Es fehlen die Formatprüfung und die Sperrliste (`BlockedUserRepository`) (?) |
| Avatar | `Action/ChangeAvatar` | vorhanden | `PATCH user/avatar` (Data-URL in der DB) | |
| Siedlerbeschreibung | `Action/ChangeDescription` | vorhanden | `PATCH user/profile` (max. 2000 Zeichen) | |
| Territorialfarbe (RGB) | `Action/ChangeRgbCode`, `UserSettingEnum::RGB_CODE` | fehlt | — | Bereichsübergreifend: Karte. Allianzseitig gibt es einen Integrationsvertrag für die Territorialfarbe (`map.md`). |
| Urlaubsmodus (7-Tage-Sperre) | `Action/ActivateVacation` | vorhanden | `user/vacation/activate\|deactivate` | STU loggt danach aus. Die Spielwirkung des Urlaubs (Schutz, Tick) wurde nicht geprüft (?), sie gehört eher zu Schiff/Kolonie. |
| Account löschen (Mail-Bestätigung, später Ausführung) | `Action/DeleteAccount`, `Component/Player/Deletion/*`, `Deletion/Confirmation/RequestDeletionConfirmation.php` | teilweise | `POST user/delete` (setzt `deletionMark=1`) | Es gibt weder Bestätigungsmail noch Ausführung. Die Ausführung ist ein benannter Integrationspunkt (`AllianceService.removeAccount`). |
| E-Mail-Benachrichtigung, Lager-Meldung, Lesebestätigung, Startseite | `UserSettingEnum` | teilweise | `settings.service.ts` (`email_notification`, `storage_notification`, `show_pm_read_receipt`, `default_view`), `FE/settings.tsx` | **Gespeichert, aber kein Verbraucher.** Auch `default_view` wird nach dem Login nicht ausgewertet. |
| Online-Status öffentlich | `SHOW_ONLINE_STATUS` | fehlt (abweichend) | `GET database/online`, Dashboard-Widget „Online-Spieler“ | SWU zeigt Online-Spieler allen. `CONTEXT.md` begrenzt den Online-Status auf Allianzmitglieder. Widerspruch, siehe NEEDS-DECISION. |
| Login nicht speichern | `SAVE_LOGIN` | fehlt | — | JWT/Refresh-Token-Thema |
| Flotten standardmäßig fixieren, Warpsplit-Übertrag | `FLEET_FIXED_DEFAULT`, `WARPSPLIT_AUTO_CARRYOVER_DEFAULT` | fehlt (?) | — | Bereichsübergreifend: Schiff |
| Piraten-Einträge in der History zeigen | `SHOW_PIRATE_HISTORY_ENTRYS` | n/a (bewusst) | — | Spec `events-and-message-folders`: Out of Scope |
| Messenger-Ansicht | `INBOX_MESSENGER_STYLE` | fehlt | — | Siehe 2.1 |
| RPG-Verhalten | `RPG_BEHAVIOR` | fehlt | — | Siehe 2.5 |
| Interface-Farbschema | `CSS_COLOR_SHEET`, `Component/Player/UserCssClassEnum.php` | fehlt | — | Siehe NEEDS-DECISION |
| 3D-Modelle | `SHOW_3D_MODEL` | n/a | — | Beta-Funktion in STU |
| Crew-Ränge benennen, Crew-Rassen (anlegen, einreichen, wählen, verteilen) | `Action/ChangeCrewRankNames`, `CreateCrewRace`, `ResubmitCrewRace`, `SelectCrewRace`, `RemoveCrewRace`, `UpdateCrewRaceDistribution`, `UpdateUserCrewRaceChance`, `View/ShowCrewRaceManagement`, `Lib/CrewRace*` | fehlt | — | Bereichsübergreifend: Crew. Nicht in diesem Paket geplant. |
| Tutorials zurücksetzen | `Action/CreateTutorials`, `DeleteTutorials` | fehlt (?) | — | Bereichsübergreifend: Game/Onboarding |
| Einladungen | — | SWU-Erweiterung | `FE/settings.tsx` (Tab „Einladungen“) | Invite-basierte Registrierung |

### 2.8 Awards und Prestige (Module/Award, Module/Prestige)

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Award-Modell und Vergabe | `Award/Lib/CreateUserAward.php`, `Component/Player/UserAwardEnum.php`, `Orm/Entity/UserAward`, `Award` (?) | fehlt | — | |
| Award-Anzeige im Profil (Bild, Tooltip, Anzahl) | `userprofile.twig:140-160`, Assets `st-universe/assets/awards/*.png`, `/npcawards/` | fehlt | — | Die STU-Awards sind Star-Trek-spezifisch (Kazon, Föderation, Romulaner …) |
| Award-Auslöser: Forschung, Datenbankeinträge, Map-Zyklus, Lotterie, Piratenrunde, NPC-Vergabe | `Research/ResearchState.php`, `Database/Lib/CreateDatabaseEntry.php`, `Maintenance/MapCycle.php`, `EndLotteryPeriod.php`, `Tick/Process/EndPirateRound.php`, `NPC/Action/GiveNpcAward.php` | fehlt | — | Bereichsübergreifend |
| Prestige-Buchung mit Historie | `Prestige/Lib/CreatePrestigeLog.php` | vorhanden | `BE/prestige/prestige.service.ts#change` | |
| Prestigehistorie ansehen | `html/database/prestigeLog.twig` | vorhanden | `GET database/prestige-history`, `FE/database.tsx` („Prestigehistorie“) | |
| Prestigequellen | STU-Aufrufer von `CreatePrestigeLogInterface`: KN-Bewertung, Datenbankeintrag, Astro-Kartographie, Entern, Selbstzerstörung, Übernahme, Zerstörung (`Destruction/Handler/PrestigeGain.php`), Handel/Auktionen, TopFlightsReward, Lotterie, Ostern/Advent, Quests, Piratenzorn, Piratenrunde | teilweise | `STU_PRESTIGE` in `BE/prestige/prestige.constants.ts`. Genutzt: HoloNet, Entdeckungen, Rumpfscan, Kartographie, `spacecraft.service.ts` (2 Stellen) | `TOP_TEN_*` und `BOARDING_*` sind definiert, aber nicht referenziert (?). Die Quellen gehören fachlich in die Bereiche Schiff, Handel und Wartung. |
| Prestigewert eines Schiffs oder einer Flotte | `Prestige/Lib/PrestigeCalculation.php` | fehlt (?) | — | Bereichsübergreifend: Kampf |

### 2.9 Globale History (Module/History, Component/History, HistoryProvider)

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| History-Seite mit Typen, Zählern, Suche, Limit | `Provider/HistoryProvider.php`, `html/view/history.twig`, `Component/History/HistoryTypeEnum.php` | vorhanden | `BE/events/*`, `FE/events.tsx`, `SH/common` `GameEventType` (SHIP, STATION, COLONY, ALLIANCE, OTHER) | Spec `events-and-message-folders` ist umgesetzt |
| Maindesk-Vorschau | Maindesk | vorhanden | Dashboard | |
| Erzeuger SHIP | `AbstractWeaponPhase.php` u. a. | vorhanden | `spacecraft-destruction.service.ts`, `hyperdrive-disruption.service.ts` | |
| Erzeuger ALLIANCE (Kriegserklärung, Vertrag, Kündigung, Siedler-Abkommen) | `Component/History/Event/HistoryEntrySubscriber.php`, `Alliance/Action/AcceptOffer`, `CancelContract`, `Component/Player/Relation/UserRelationHistory.php` | fehlt | Allianzseitig gibt es stattdessen die **Diplomatie-Chronik** (je Allianz/Partei) | Siehe NEEDS-DECISION |
| Erzeuger STATION, COLONY, OTHER (Übernahme, Handelsposten-Löschung, Piratenrunde) | `ShipTakeoverManager.php`, `TradepostDeletionHandler.php`, `BeginPirateRound.php`, `EndPirateRound.php`, `CreateHistoryEntry.php` | fehlt | — | Bereichsübergreifend. Die Typen sind im Filter sichtbar, aber immer leer. |
| Piratenfilter | `getByTypeAndSearchWithoutPirate` | n/a (bewusst) | — | Spec: Out of Scope |

### 2.10 BBCode (Lib/StuBbCode*, Component/Communication/Kn/KnBbCode*)

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Grund-Tags b, i, u | `Lib/StuBbCodeDefinitionSet.php` | vorhanden | `FC/BbCodeText.tsx` | SWU hat zusätzlich `s`, `code`, `url` |
| `[color=…]` (CSS-Farbvalidator) | alle drei Definitionssets | fehlt | — | Wird in STU vor allem für Spieler- und Allianznamen und KN genutzt |
| `[img]` mit Bildvalidator | `StuBbCodeWithImageDefinitionSet.php`, `StuBbCodeImageValidator.php`, `KnBbCodeDefinitionSet.php` | teilweise | `BbCodeText` (`allowBannerImages`, nur Allianzbanner) | In KN und Profilbeschreibung nicht erlaubt |
| h2, h3, quote (KN) | `KnBbCodeDefinitionSet.php`, `KnBbCodeParser.php` | vorhanden | `BbCodeText` | |
| `[translate]` | STU-Twig-Erweiterung, `initTranslations()` | vorhanden | `BbCodeText` (`translate`/`translation`) | |
| BBCode in Spielernamen | `ChangeUserName`, `\|bbcode` in Twig | abweichend (faktisch) | `displayName` reiner Text | Für Allianznamen ist das per `map.md` bewusst ausgeschlossen. Für Spielernamen gibt es keine Entscheidung. |

### 2.11 Mail (Lib/Mail und Verbraucher)

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Mail-Infrastruktur (SMTP, Absender) | `Lib/Mail/MailFactory.php`, `StuMail.php` | vorhanden | `BE/mail/mail.service.ts` (nodemailer, deaktiviert ohne SMTP) | |
| Registrierungs- und Willkommensmail | `Component/Player/Register/RegistrationEmailSender.php` | vorhanden (abweichend) | `sendWelcomeMail` | STU verschickt eine Aktivierungsmail, SWU arbeitet invite-basiert |
| Passwort vergessen und zurücksetzen | `Index/Action/SendPassword`, `ResetPassword` | fehlt | — | Bereichsübergreifend: Auth |
| PM-Benachrichtigung | `EmailNotificationSender.php` | fehlt | — | Siehe 2.1 |
| Bestätigung der Kontolöschung | `RequestDeletionConfirmation.php` | fehlt | — | |
| Warnung bei Inaktivität | `Maintenance/IdleUserWarning.php` | fehlt | — | Bereichsübergreifend: Wartung |
| Admin-Massenmail, Fehlermail | `Admin/Action/SendMassMail.php`, `Component/Admin/Notification/FailureEmailSender.php` | fehlt | — | Admin-Bereich |
| SMS-Verifikation | `Register/SmsVerificationCodeSender.php`, `Maindesk/Action/SmsManagement` | n/a (?) | — | |

### 2.12 Allianz-Restlücken

Laut `map.md` sind alle sechs Etappen umgesetzt. Abgeglichen mit `STU/Module/Alliance/Action|View` (Boards, Themen, Wichtig-Markierung, Bewerbungen, Ämter, Beziehungen, Banner, Homepage): **keine weiteren allianzeigenen Lücken gefunden.** Offen bleiben nur die übergreifenden Punkte:

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Persönlicher Kontakt als Freund im Resolver | `FriendDeterminator.php` | fehlt (benannter Integrationspunkt) | `PersonalContactStatusPort` | Wird mit dem Kontaktlisten-Paket erledigt |
| PM-Schnellzugriff an Forumsbeiträgen und Mitgliedern | `allianceboardtopic.twig:61`, `alliancemanagement.twig:17` (`pmWindow`) | teilweise | Die Mitgliederübersicht hat den PM-Link, das Forum verlinkt nur das Profil (`FE/alliance-forum.tsx:65`) | Wird mit dem Schnell-PM-Paket erledigt |
| Kontolöschungsausführung, Spielreset-Aufrufer | `Component/Player/Deletion/*` | fehlt (benannter Integrationspunkt) | `AllianceService.removeAccount`, `AllianceResetService.resetAllianceData` | |

---

## 3. Vorgeschlagene Arbeitspakete

Größen: **S** (klein, ein Durchlauf), **M** (ein Durchlauf, mehrere Schichten), **L** (aufgeteilt). Alle Pakete legen DTOs in `packages/shared` ab und folgen `CONTRIBUTING.md`.

### A. Nachrichten

**A1 – PM-Serverregeln und Antwortverlauf (S)**
Beim Senden prüft der Server: Empfänger existiert, nicht an sich selbst, Text mindestens 5 Zeichen, Betreff höchstens 255 Zeichen, Textlänge begrenzt. Beim Antworten zeigt die Compose-Ansicht die letzten N Nachrichten mit dem Partner, aus Persönlich und Postausgang.
STU: `Message/Action/WritePm/WritePm.php`, `Message/View/ShowWritePm/ShowWritePm.php`, `html/message/writePm.twig`.
Abhängigkeiten: keine. Die Ignorier-Sperre kommt mit C1.

**A2 – Schnell-PM überall (S)**
PM-Button im Spielerprofil. Im HoloNet bekommt der ✉-Button den Autor als Empfänger, der Profil-Button wird aktiviert. PM-Link an Forumsbeiträgen. Optional ein Compose-Modal statt Seitenwechsel.
STU: `Message/View/ShowWriteQuickPm/*`, `html/communication/writeQuickPm.twig`, `html/macros.twig#pmWindow`, `Component/Communication/Kn/KnItem.php#displayContactLinks`.
Abhängigkeiten: keine. Die Crew-XP für Quick-PM entfällt, weil es keine Crew-XP gibt.

**A3 – Lesebestätigung im Postausgang (S)**
Der Postausgang zeigt „gelesen“, wenn Sender und Empfänger `show_pm_read_receipt` aktiviert haben.
STU: `UserSettingEnum::SHOW_PM_READ_RECEIPT`, `html/view/pmCategory.twig`, `Message/Lib/PrivateMessageListItem.php`.
Abhängigkeiten: keine.

**A4 – E-Mail bei neuer persönlicher PM (S)**
Wenn eine PM im Ordner Persönlich zugestellt wird und `email_notification` gesetzt ist, geht nach dem Commit eine Mail über `MailService` raus. Fehler werden nur geloggt.
STU: `Message/Lib/EmailNotificationSender.php`, `PrivateMessageSender.php#createPrivateMessage`.
Abhängigkeiten: SMTP-Konfiguration. **NEEDS-DECISION:** Soll der Standardwert `1` bleiben? Bei Aktivierung bekämen dann sofort alle Spieler Mails.

**A5 – Verlinkte Meldungen (S)**
Nachrichten erhalten ein generisches, serverseitig erzeugtes Ziel (Kolonie, Schiff, HoloNet-Beitrag, Allianzthema). Die UI zeigt „ansehen“. Für Koloniemeldungen gibt es das Ziel über `originColonyId` schon.
STU: `PrivateMessageSender::getHref`, `EntityWithHrefInterface`, `pmCategory.twig:34-40`.
Abhängigkeiten: Die Erzeuger der anderen Bereiche müssen das Ziel setzen.

**A6 – Messenger-Ansicht für „Persönlich“ (M)**
Neue Einstellung `inbox_messenger_style`. Der Ordner Persönlich wird nach Gesprächspartnern gruppiert, mit 20 Gesprächen je Seite, letzter Nachricht und Ungelesen-Status.
STU: `Game/Lib/View/Provider/Message/MessengerStyleProvider.php`, `Conversation.php`, `html/communication/conversations.twig`.
Abhängigkeiten: A1 (Verlauf).

**A7 – Eigene Nachrichtenordner und Verschieben (M)**
Eigene Ordner anlegen, umbenennen, löschen (Inhalt zurück nach Persönlich), sortieren. PMs aus Persönlich in eigene Ordner verschieben. Header und Zähler bleiben bei den sieben festen Ordnern.
STU: `Message/Action/AddPmCategory`, `EditPmCategory`, `DeletePmCategory`, `SortPmCategories`, `MovePm`, `html/communication/pmMoveSelector.twig`, `pmCategorySortingJs.twig`.
Abhängigkeiten: keine. **NEEDS-DECISION:** Die Spec `events-and-message-folders` legt eine geschlossene Ordnermenge fest. Sollen eigene Ordner als zweite Ebene dazukommen, und wenn ja, nur für persönliche PMs?

**A8 – Willkommens-PM der Fraktion (S)**
Nach dem Onboarding schickt ein Fraktions-Absender eine idempotente Systemnachricht mit Einstiegshinweisen.
STU: `Message/Lib/SendWelcomeMessage.php`.
Abhängigkeiten: Onboarding-Bereich. **NEEDS-DECISION:** Text und Absender (System oder Fraktions-NPC)?

### B. Kontakte

**B1 – Kontaktliste Backend und Resolver (M)**
Persistente Kontakte mit Modus Freund/Neutral/Feind, Kommentar und Datum. Endpunkte zum Anlegen, Moduswechsel, Kommentieren, Löschen und Alle-löschen, dazu eine Abfrage „wer hat mich eingetragen“. Eine echte Implementierung von `PersonalContactStatusPort.isFriend` ersetzt den No-Op. Nur Spieler derselben Fraktion sind eintragbar (?). Bereinigung bei Kontolöschung.
STU: `Message/Action/AddContact`, `SwitchContactMode`, `EditContactComment`, `DeleteContacts`, `DeleteAllContacts`, `Orm/Entity/Contact.php`, `Component/Player/Relation/FriendDeterminator.php`, `EnemyDeterminator.php`, `Component/Player/Deletion/Handler/ContactDeletionHandler.php`.
Abhängigkeiten: `BE/alliance/relationship-resolver.service.ts`.
**NEEDS-DECISION:** Welche Wirkung hat der Modus „Feind“? Laut `CONTEXT.md` sind Feinde nur Spieler der anderen Fraktion. Variante a: nur Markierung oder Kartenfarbe. Variante b: Wirkung auf automatische Reaktionen (Alarm Rot, sobald T-029 kommt).

**B2 – Kontaktliste UI und Profilaktionen (M)**
Kontaktliste unter „Nachrichten“ (Rail-Abschnitt „Kontakte“ wie STU `pmSidebar.twig`) mit Mehrfachauswahl und „Einträge anderer über Dich“. Moduswechsel und „Zu Kontakten hinzufügen“ im Profil. Kontakt-Dropdown im Compose.
STU: `html/user/contactList.twig`, `contactModeSwitch.twig`, `contactButton.twig`, `communication/pmSidebar.twig`, `userprofile.twig:16-30`.
Abhängigkeiten: B1, A2.

**B3 – Kontaktrechte „Als Freund behandeln“ und „Live-Position teilen“ (M)**
Einseitige Freigaben an einen Kontakt. Die Starmap-Sichtbarkeit (`starmap-visibility.service.ts`, `shared-live-positions`) berücksichtigt geteilte Positionen aus Kontakten.
STU: `Message/Action/UpdateContactPermissions`, `Component/Alliance/Enum/RelationPermissionEnum.php`, `Starmap/View/ShowUserStarmapRealtime.php:576-596`.
Abhängigkeiten: B1, Allianz-Infrastruktur (Sichtbarkeitsdienst). **NEEDS-DECISION:** Sollen einseitige Kontaktfreigaben überhaupt neben den ausgehandelten Beziehungsfreigaben existieren? Sie unterlaufen die beidseitige Aushandlung aus Etappe 4.

### C. Ignorierliste

**C1 – Ignorierliste (S/M)**
Spieler ignorieren, aus der Liste löschen, alle löschen. Ansicht „Siedler, die Dich ignorieren“. Ein ignorierter Spieler kann keine persönliche PM mehr senden („Der Siedler ignoriert Dich“). Button im Profil. Bereinigung bei Kontolöschung.
STU: `Message/Action/IgnoreUser`, `DeleteIgnores`, `DeleteAllIgnores`, `View/ShowIgnoreList`, `ShowIgnore`, `html/communication/ignorelist.twig`, `ignoretext.twig`, `user/ignoreButton.twig`, `WritePm.php`.
Abhängigkeiten: A1 (Sende-Validierung). **NEEDS-DECISION:** Soll Ignorieren auch HoloNet-Kommentar-Benachrichtigungen oder Forenbeiträge ausblenden? STU sperrt nur PMs.

### D. HoloNet

**D1 – HoloNet-Regeln an STU angleichen (S)**
Serverprüfungen: Titel 6–80 Zeichen, Text mindestens 50 (beim Bearbeiten mindestens 10), Kommentar mindestens 3. Weiche Löschung von Beiträgen und Kommentaren. Admins dürfen jederzeit bearbeiten. Benachrichtigung an alle bisherigen Kommentatoren. Bewertungsbalken positiv/gesamt statt Summe. Option „Lesezeichen auf eigenen Beitrag“ beim Schreiben.
STU: `Communication/Action/AddKnPost`, `EditKnPost`, `DeleteKnPost`, `PostKnComment`, `DeleteKnComment`, `Component/Communication/Kn/KnItem.php#getRatingBar`.
Abhängigkeiten: keine. Hinweis: Die Kategorien von SWU bleiben (bewusste Erweiterung).

**D2 – Admin-Löschung mit Begründung (S)**
Ein Admin löscht einen fremden Beitrag weich und gibt eine Begründung an. Der Autor bekommt eine Systemnachricht.
STU: `Communication/Action/AdminDeleteKnPost`, `View/ShowAdminDeletePost`, `html/communication/adminDelete.twig`.
Abhängigkeiten: D1 (weiche Löschung).

**D3 – Vorschau und Zähler für neue Beiträge (S)**
Vorschau im Compose mit `BbCodeText`. Badge mit `holonet/new-count` in Sidebar oder Header.
STU: `Communication/Action/KnPostPreview`, `CommunicationProvider` (`NEW_KN_POSTING_COUNT`), `html/maindesk/newKnPostings.twig`.
Abhängigkeiten: keine.

### E. RPG

**E1 – Spielercharaktere (M)**
Charaktere mit Name, BBCode-Beschreibung und optionalem Avatar im eigenen Profil anlegen, bearbeiten und löschen. Anzeige in fremden Profilen. Löschung mit dem Konto.
STU: `PlayerProfile/Action/CreateCharacter`, `ChangeCharacter`, `DeleteCharacter`, `Orm/Entity/UserCharacter.php`, `userprofile.twig` (`charactersContainer`).
Abhängigkeiten: keine. Die Avatar-Ablage kann `AllianceAssetPort` bzw. die Asset-Schnittstelle aus dem Banner wiederverwenden.

**E2 – Charaktere in HoloNet-Beiträgen (S)**
Beim Schreiben und Bearbeiten Charakter-IDs angeben. Die Besitzer fremder Charaktere werden benachrichtigt. Beiträge zeigen die Charaktere mit Detailansicht.
STU: `AddKnPost.php#notifyCharacterOwners`, `EditKnPost.php`, `View/ShowKnCharacter`, `html/communication/knCharacter.twig`.
Abhängigkeiten: E1.

**E3 – RPG-Plots Kern (M)**
Plot anlegen (Titel 6–80 Zeichen, Beschreibung), bearbeiten und beenden. Nur der Ersteller fügt Mitglieder hinzu oder entfernt sie (mit Systemnachricht). Listen „alle Plots“ und „meine Plots“, Plotdetail mit Mitgliedern und Beiträgen. Ein HoloNet-Beitrag kann einem Plot angehören, dann ist der Titel optional. Neue Plotbeiträge benachrichtigen die übrigen Mitglieder.
STU: `Communication/Action/CreateKnPlot`, `EditKnPlot`, `EndKnPlot`, `AddKnPlotMember`, `DeleteKnPlotMember`, `Lib/PlotMemberService.php`, `Lib/NewKnPostNotificator.php`, `View/ShowPlotList`, `ShowUserPlotList`, `ShowKnPlot`, `ShowCreatePlot`, `ShowEditPlot`, `html/communication/plot/*`, `plotdetails.twig`.
Abhängigkeiten: D1. **NEEDS-DECISION:** Wie verhalten sich Plotbeiträge zur Kategorie ROLEPLAY? Vorschlag: Plotbeiträge sind immer ROLEPLAY.

**E4 – Plots: fremde Beiträge zuordnen, Plots im Profil, RPG-Verhalten (S)**
Antrag und Annahme „Beitrag zum Plot hinzufügen“. Plotliste im Profil. Einstellung `rpg_behavior` mit Profilanzeige.
STU: `Communication/Action/ApplyKnPostToPlot`, `AddKnPostToPlot`, `UserProfileProvider` (`RPG_PLOTS`), `Component/Player/UserRpgBehaviorEnum.php`.
Abhängigkeiten: E3.

**E5 – NPC-Quests (L, nur vormerken)**
STU: `Communication/Action/*Quest*`, `View/ShowQuest*`, `html/communication/quest/*`, `NPC/*`.
Abhängigkeiten: NPC- und Admin-System, Belohnungen (Prestige, Awards). **NEEDS-DECISION:** Gehört das überhaupt in SWU? Wenn ja, in welchem Bereich wird es inventarisiert?

### F. Profil, Notizen, Einstellungen

**F1 – Profil-Ergänzungen: Freunde und Profilbesucher (S)**
Freunde-Box im Profil (zentral abgeleitete Freunde: Allianzmitglieder, Beziehungsfreigabe, Kontakt). Profilbesuche einmal je Besucher erfassen und als Box „Profilbesucher“ im Dashboard zeigen.
STU: `UserProfileProvider` (`FRIENDS`, `ProfileVisitorRegistration`), `PlayerProfile/Lib/ProfileVisitorRegistration.php`, `html/maindesk/visitors.twig`.
Abhängigkeiten: Die Freunde-Box wird mit B1 vollständig. **NEEDS-DECISION:** Profilbesucher sind ein Datenschutzthema. Übernehmen, und mit welcher Aufbewahrung?

**F2 – Gespeicherte Einstellungen wirksam machen (S)**
`default_view` steuert die Startseite nach dem Login. `storage_notification` unterdrückt `STORAGE_FULL`-Koloniemeldungen. `email_notification` und `show_pm_read_receipt` kommen aus A3/A4. Allowlist und Werte (`0`/`1`, Enum) serverseitig prüfen.
STU: `Module/PlayerSetting/Lib/UserSettingEnum.php`, `Component/Player/Settings/UserSettingsProvider.php`.
Abhängigkeiten: Kolonie-Bereich (`BE/messaging/colony-event.service.ts`).

**F3 – Weitere Spielereinstellungen (M)**
`show_online_status` (Opt-out für die öffentliche Online-Liste), `css_color_sheet`, `save_login`, `fleet_fixed_default`, `warpsplit_auto_carryover_default` (die beiden letzten mit den Schiffsverbrauchern).
STU: `UserSettingEnum.php`, `PlayerSettingsProvider.php`, `html/user/settings/*.twig`, `UserCssClassEnum.php`.
Abhängigkeiten: Schiffsbereich (Flotte, Warpsplit), Auth (Login speichern).
**NEEDS-DECISION:** (a) Die öffentliche Online-Spielerliste im Dashboard widerspricht `CONTEXT.md` („Online-Status nur für Mitglieder derselben Allianz“). Soll sie bleiben, mit Opt-out wie STU, oder entfernt werden? (b) Farbschemata sind ein SWU-Designthema. Übernehmen oder bewusst abweichen?

**F4 – Territorialfarbe des Spielers (S)**
Eigene RGB-Farbe (validiert) speichern und im Kartenvertrag bereitstellen.
STU: `PlayerSetting/Action/ChangeRgbCode`, `UserSettingEnum::RGB_CODE`.
Abhängigkeiten: Karten-Bereich (Territorialdarstellung), Allianz-Integrationsvertrag Territorialfarbe.

**F5 – Notizen als Notizsammlung (M)**
Mehrere Notizen mit Titel und Datum, Liste, Anlegen, Bearbeiten, Mehrfachlöschen. Der bisherige Einzelzettel wird als erste Notiz migriert.
STU: `Notes/Action/SaveNote`, `DeleteNotes`, `View/Overview`, `ShowNote`, `ShowNewNote`, `Orm/Entity/Note.php`, `html/notes/*`.
Abhängigkeiten: keine. **NEEDS-DECISION:** Ist SWUs Einzelzettel eine bewusste Vereinfachung? Wenn ja, als Abweichung dokumentieren und das Paket streichen.

**F6 – E-Mail-Änderung absichern (S)**
Formatprüfung, Normalisierung (Kleinschreibung, Trim) und optional eine Sperrliste.
STU: `PlayerSetting/Action/ChangeEmail/ChangeEmail.php`, `BlockedUserRepository`.
Abhängigkeiten: keine.

### G. Awards und Prestige

**G1 – Award-Grundsystem und Profilanzeige (M)**
Award-Katalog (ID, Beschreibung, Bild, NPC-Flag), Vergabe an Spieler mit Zähler, idempotenter Vergabedienst, Anzeige im Profil mit Tooltip und Anzahl, Admin-Vergabe.
STU: `Award/Lib/CreateUserAward.php`, `Component/Player/UserAwardEnum.php`, `NPC/Action/GiveNpcAward.php`, `userprofile.twig:140-160`, Assets `st-universe/assets/awards/`.
Abhängigkeiten: Admin-Bereich. **NEEDS-DECISION:** STU-Awards sind Star-Trek-spezifisch. Welchen SWU-Katalog wollen wir, und braucht es eigene Grafiken?

**G2 – Award-Auslöser (S je Auslöser, bereichsübergreifend)**
Zum Beispiel für Forschungsabschlüsse und erstmalige Datenbankeinträge.
STU: `Research/ResearchState.php`, `Database/Lib/CreateDatabaseEntry.php`, `Maintenance/MapCycle.php`.
Abhängigkeiten: G1 sowie die Bereiche Kolonie/Forschung und Datenbank.

**G3 – Fehlende Prestigequellen (bereichsübergreifend, nur Querverweis)**
Zerstörung (`Destruction/Handler/PrestigeGain.php`), Übernahme, Selbstzerstörung, Handel und Auktionen, Top-10-Flüge (`Maintenance/TopFlightsReward.php`, Konstanten `TOP_TEN_*` schon vorhanden), Entern (`BOARDING_*` vorhanden, Nutzung prüfen), Piratenzorn.
Abhängigkeiten: Schiffs-, Kampf- und Handelsbereich. Sollte dort als Paket geführt werden.

### H. History und Mail

**H1 – History-Erzeuger ALLIANCE (S)**
Die Diplomatie-Ereignisse Kriegserklärung, Vertragsabschluss, Kündigung und Siedler-Abkommen erzeugen zusätzlich einen globalen `GameEvent` vom Typ ALLIANCE.
STU: `Component/History/Event/HistoryEntrySubscriber.php`, `Component/Player/Relation/UserRelationHistory.php`, `Alliance/Action/AcceptOffer`, `CancelContract`.
Abhängigkeiten: Diplomatie-Chronik in `BE/alliance`. **NEEDS-DECISION:** Soll die globale History die öffentlichen Diplomatie-Ereignisse spiegeln (STU-Verhalten)? Oder bleibt die Diplomatie-Chronik die einzige Quelle?

**H2 – History-Erzeuger STATION, COLONY, OTHER (bereichsübergreifend, nur Querverweis)**
Übernahme, Handelsposten-Auflösung, Stationszerstörung, Kolonieeroberung.
STU: `ShipTakeoverManager.php`, `TradepostDeletionHandler.php`, `CreateHistoryEntry.php`.
Abhängigkeiten: Bereiche Schiff, Station und Handel.

**H3 – Passwort vergessen (M, bereichsübergreifend Auth)**
Token-basierter Reset per Mail mit Ablaufzeit, ohne Preisgabe, ob die Adresse existiert.
STU: `Index/Action/SendPassword`, `ResetPassword`.
Abhängigkeiten: SMTP, Auth-Bereich.

**H4 – Kontolöschung mit Bestätigung und Ausführung (L, aufteilen)**
(a) Bestätigungsmail mit Token und Widerruf (S). (b) Ausführender Lösch-Job, der alle Löschhandler aufruft, darunter `AllianceService.removeAccount`, Kontakte, Ignorierliste, PMs, Charaktere, Plots, HoloNet (M). (c) Schiffsübernahme und Kolonieaufgabe (bereichsübergreifend).
STU: `Component/Player/Deletion/PlayerDeletion.php`, `Deletion/Handler/*`, `Deletion/Confirmation/RequestDeletionConfirmation.php`.
Abhängigkeiten: alle Bereiche. Das ist der benannte Integrationspunkt aus `map.md`.

### I. BBCode

**I1 – `[color]` und `[img]` (S)**
`[color=…]` mit strenger Validierung (Hex oder benannte Farben) in BBCode-Texten. `[img]` in Profilbeschreibung und HoloNet mit der Bildprüfung aus STU (Allowlist, https).
STU: `Lib/StuBbCodeDefinitionSet.php`, `StuBbCodeWithImageDefinitionSet.php`, `StuBbCodeImageValidator.php`, `Component/Communication/Kn/KnBbCodeDefinitionSet.php`.
Abhängigkeiten: `FC/BbCodeText.tsx`. **NEEDS-DECISION:** (a) Externe Bilder in Profilen und KN zulassen (Datenschutz, Tracking, Missbrauch), nur eigene Uploads, oder gar nicht? (b) BBCode-Farben in Spielernamen: für Allianznamen bereits ausgeschlossen, für Spieler auch?

### Empfohlene Reihenfolge

1. A1, A2, D1, F2 (schnelle, risikoarme Paritätsgewinne)
2. C1, B1, B2 (soziale Grundfunktionen, schließt den Allianz-Integrationspunkt)
3. A3, A4, D2, D3, F6
4. E1, E2, E3, E4 (RPG-Schicht)
5. G1, F1, A6, A5
6. Nach den Entscheidungen: A7, B3, F3, F5, H1, I1, A8
7. Bereichsübergreifend koordinieren: G2, G3, H2, H3, H4, F4, E5

### Unsicherheiten

- Die Semantik von `getFriendsByUserAndAlliance` (STU-Profil „Freunde“) wurde nicht im Repository nachgelesen.
- Ob `messagingService.send` den Empfänger implizit über einen FK-Fehler prüft, wurde nicht getestet. Fehlende Validierung ist aus dem Code abgeleitet.
- Für `holonet/new-count` wurde im Frontend kein Verbraucher gefunden (Suche nach `new-count`).
- Der Status von Ticket 07 in `stu-systemdatenbank-und-kolonie-scans` (`ready-for-agent`) passt nicht zum vorhandenen Code.
- Spielwirkung des Urlaubsmodus, Nutzung der Konstanten `BOARDING_*` und `TOP_TEN_*` sowie die Quest-Zuordnung wurden nur oberflächlich geprüft.
- Der CodeGraph-Index stammt aus dem Haupt-Checkout, nicht aus dem Worktree. Die Aussagen beruhen überwiegend auf direktem Lesen der Dateien.
