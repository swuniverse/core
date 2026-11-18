# Abgleich Rahmen, Einstieg, Maindesk, Navigation, Admin, Laufzeit (2026-11-17)

Pfade: STU relativ zu `st-universe/core/src` (Cron: `st-universe/core/resource/cron/TickTasks.php`), SWU relativ zu `swuniverse/core`. Alle Angaben stammen aus dem aktuellen Code. Den Ticketstatus habe ich nicht als Beleg genommen.

## Zusammenfassung

Der Rahmen ist gegenüber der Inventur vom 21.10. deutlich näher an STU. Es gibt Passwort-Reset, E-Mail-Verifikation, System-News, Impressum, Datenschutz und Hilfe, Spielersperre mit Login-Schutz, Blockieren, Massennachricht, Tick-Admin, den Status TICK, ein Maintenance-Gerüst, ein Tutorial-PADD, STU-Navigations-Icons, Navlets mit Tooltips und wirksame Einstellungen. Die Funktionen sind fast alle vorhanden, die Lücken liegen vor allem in Laufzeitregeln und Informationsdichte.

Die gewichtigsten Abweichungen:
1. **Schiffsbau, Umrüstung und Werftreparatur werden nur im Haupttick fertig.** STU erledigt das minütlich im Process-Tick. Dasselbe gilt für die 15-Minuten-Schildregeneration.
2. **Der Haupttick nimmt den Urlaub sofort ernst statt nach 48 h.** Er prüft `vacationMode` statt `isVacationEffective`.
3. **Notrufe werden im Maindesk geladen, aber nicht angezeigt.**
4. **Die Registrierung umgeht die Fraktionssperre `isSelectable`.**
5. Die STU-Box „Zufällige Spieler (online)“ zeigt bis zu 35 Avatare, SWU nur einen Spieler.
6. Es gibt keine Spielrunde mit Rundennummer, Rundenstatistik und Version.
7. Mehrere STU-Maintenance-Handler fehlen. Am deutlichsten ist der Crew-XP-Wartungstick: Das Ereignis ist definiert, wird aber nie ausgelöst.

Die globalen UI-Bausteine `PageHeader`, `ActionResult` und `Tooltip` existieren, kommen aber kaum zum Einsatz. `ActionResult` wird nirgends gerendert, und nur 6 Seiten setzen Breadcrumb und Seitentitel. Admin-Werkzeuge wie Livekarte, Wetterbericht, Schiff aufladen, Einzel-Kolonie-/Schiffstick und Korrekturskripte fehlen. Für Spieler ist das unkritisch.

## Seitenabgleich

| STU-Seite/Template | SWU-Seite/Komponente | Status | Abweichung konkret |
|---|---|---|---|
| `html/index/index.twig` + `indexDefaults.twig` (Landing: Login-Box, Spielstatus, Live-Statistik, Discord-Widget, Galerie, News „Aktuelles“, Kopf-Links Hauptseite/Registrieren/Hilfe/Impressum/Forum/Chat/Changelog/Partnerseiten) | `apps/frontend/src/pages/login.tsx` | kleine Abweichung | News (5, Changelog-Kennzeichnung, Links) und Spielstatus sind vorhanden. Statistik zeigt Siedler, Kolonien, Schiffe, Forschungen, Gebäudetypen und Schiffsklassen (`/database/overview`), **aber keine Online-Zahl und keine Runde**. Kein Forum-Link. Impressum, Datenschutz und Hilfe erscheinen nur bei `VITE_LEGAL_PAGES_ENABLED=true` (`components/legal/LegalLinks.tsx`). Login steckt im Modal statt in einer festen Box. Textfehler „Gebaudetypen“ (`login.tsx:445`), „Schliessen“ (`login.tsx:603`). |
| Login (`Index/Action/Login`, `Lib/Session/SessionLogin.php`) | `login.tsx`, `apps/backend/src/modules/auth/auth.service.ts#login` | gleich | Login-Name oder Spieler-ID (`auth.service.ts:447`). Sperre, Löschmarke 2 und Wartung werden geprüft (`assertAccountAccess`/`assertGameAccess`, `auth.service.ts:887-916`). Login beendet den Urlaub. „Angemeldet bleiben“ und Startansicht `default_view` (`login.tsx:220-235`) sind umgesetzt. |
| `html/index/accountLocked.twig` (eigene Seite mit Grund) | Fehlermeldung im Login-Modal (`auth.service.ts:893-899`) | kleine Abweichung | Inhaltlich gleich (Resttick und Grund), aber keine eigene Seite. |
| `html/index/registration.twig`, `factionEntry.twig`, `Index/Action/Register` | `pages/register.tsx`, `auth.service.ts#register` | große Abweichung | Siehe G4: `isSelectable` wird bei der Registrierung nicht geprüft. Außerdem fehlt die Pflicht-Checkbox „Spielregeln/Datenschutzhinweis gelesen“ (STU `registration.twig:197-208`). Kein Referer-Feld. Keine Fraktionsbeschreibung (SWU zeigt Bonus-Chips und Spielerzahl). Zusätzlich gibt es den Invite-Key (Closed Alpha). |
| `registrationEnd.twig` | direkter Login und Weiterleitung nach `/verify-email` bzw. `/` (`register.tsx:94-95`) | kleine Abweichung | Bewusst SPA-Fluss. |
| `accountVerification.twig`, `Maindesk/Action/AccountVerification`, `EmailManagement`, `SmsManagement` | `pages/verify-email.tsx`, `game-status.guard.ts:75-86`, `app-shell.tsx:83-89` | kleine Abweichung | Link statt Code, Neusenden und Adresskorrektur vorhanden, hinter `EMAIL_VERIFICATION_ENABLED`. SMS fehlt (empfohlen weglassen). |
| `lostPassword.twig`, `resetPassword.twig`, `SendPassword`, `ResetPassword` | `pages/password-reset.tsx` (`/lost-password`, `/reset-password`) | kleine Abweichung | SWU nimmt Login-Name oder E-Mail und setzt das Passwort per Token-Link selbst. STU nimmt nur die E-Mail und verschickt ein neues Passwort. Der Link im Login erscheint nur, wenn das Feature aktiv ist (`login.tsx:671`). |
| `impressum.twig`, `help.twig`, `partnerSites.twig` | `pages/imprint.tsx`, `privacy.tsx`, `help.tsx` | kleine Abweichung | Impressum mit Platzhaltern (`imprint.tsx`), Datenschutz zusätzlich. Die Hilfe hat 7 Abschnitte statt STU-FAQ und Tutorial-Erklärung. Partnerseiten bewusst weggelassen. |
| `maintenance.twig`, `gameReset.twig`, `relocation.twig`, `GameStateEnum` (ONLINE/TICK/MAINTENANCE/RELOCATION/RESET) | `game-status.service.ts`, Banner `app-shell.tsx:110-127`, Landing-Box | kleine Abweichung | ONLINE, TICK, MAINTENANCE und MAINTENANCE_ANNOUNCED. RESET und RELOCATION fehlen. TICK: GET erlaubt, schreibende Aktionen geben 503 (`game-status.guard.ts:88-95`). |
| `game/game.twig` + `sitedefaults.twig` (Header-Boxen: Userbox, PM, Forschung, Kolonien, Nagus, Logout, Wiki, Forum, Einstellungen) | `components/layout/header.tsx`, `app-shell.tsx` | kleine Abweichung | **Forum-Link fehlt.** Der Nagus-/Deals-Blinker (`nagusComponent.twig`) fehlt. Der Rest ist vorhanden. |
| `userComponent.twig` (Avatar, Name, ID, Prestige, Notiz, Nachricht schreiben, Hinweis „Zum Maindesk“) | `header.tsx:140-215` | gleich | Notiz öffnet eine Seite statt eines Popups (bewusst). Zusätzlich gibt es einen Allianzlink. Der Hinweis „Zum Maindesk“ für neue Spieler fehlt (kosmetisch). |
| `pmComponent.twig` | `header.tsx#MailboxFolderLink` (`header.tsx:427-455`) | gleich | `_1`-Asset bei Ungelesenen und Zahl hervorgehoben. |
| `researchComponent.twig` | `header.tsx:247-305` | gleich | Name, Bild, Fortschritt, +Produktion, „wartet“. |
| `coloniesComponent.twig` | `header.tsx:313-370` | gleich | Alle Kolonien mit Tooltip (Koordinaten, System, EPS, Lager) und STU-Bildgrößen, zusätzlich ein Warnpunkt. |
| `navigationComponent.twig` (Kolonien, Schiffe, [Stationen], KommNet, Nachrichten, Forschung, Handel, Allianz, Datenbank, Ereignisse, Karte, [NPC], [Admin]) | `components/layout/sidebar.tsx:13-32`, `bottom-nav.tsx` | kleine Abweichung | Asset-Icons wie STU. Zusätzlich gibt es „Maindesk“ und „Karteneditor“. **Kein eigener Eintrag „Stationen“**, Stationen stehen auf `/spacecraft` (`pages/spacecraft.tsx:79,188`). Kein NPC-Eintrag. |
| `serverTimeAndVersionComponent.twig` (Datum und Uhrzeit, Runde, Version mit Changelog-Link) | `sidebar.tsx:103-125` (Tick-Ring und `HH:MM:SS`) | große Abweichung | Siehe G6: keine Runde, keine Version, kein Datum. Dafür gibt es einen Countdown zum nächsten Tick (SWU-Mehrwert). |
| `html/breadcrumb.twig` + `<title>` je Modul | `components/PageHeader.tsx` | große Abweichung | Siehe G7: nur 6 Seiten nutzen den Seitenkopf. |
| `html/systeminformation.twig` (Meldungsbox) | `components/ActionResult.tsx`, `Toast.tsx` | große Abweichung | Siehe G7: `ActionResult` wird nirgends gerendert. |
| Tippy-Tooltips (`default.js#initTooltips`) | `components/Tooltip.tsx` | kleine Abweichung | Die Komponente entspricht dem STU-Verhalten, wird aber nur in 5 Dateien genutzt (Header, `ShipHeaderTable`, `ShipStoragePanel`, `PanelShipyard`, `PanelBuildingManagement`). |
| `html/view/maindesk.twig` (links: Erstkolonie-Dialoge, neue KN-Beiträge, Quests, Allianzforum, Notrufe, Ereignisse; rechts 350 px: Kolonielimit, Crewlimit, zufällige Online-Spieler, Schiffe im Bau, Umrüstung) | `pages/dashboard.tsx:446-472` (links: Kolonien, Handlungsbedarf, Flotte, HoloNet, Forum, Ereignisse; rechts 350 px: Limits, Profilbesucher, Prozesse) | große Abweichung | Notrufe fehlen (G3). Online-Spieler: 1 statt bis zu 35 (G5). Die übrige Struktur passt. Die Boxen „Kolonien“, „Handlungsbedarf“ und „Flotte“ gibt es nur in SWU. |
| `maindesk/newKnPostings.twig` (max. 3 neue seit Marke, Avatar, Plot/Titel, von, Datum, Kommentare, Sprung zur Marke) | `DashboardLowerSections.tsx#DashboardMessages` (Zeilen 91-131) | kleine Abweichung | Bis zu 5 ungelesene Beiträge, ohne Avatar und ohne Plotname. Der Kopflink springt zum ersten Beitrag. |
| `maindesk/alliance.twig` (Themen mit Avatar und Name des letzten Posters, Datum; Kopf verlinkt das Forum) | `pages/dashboard/DashboardForum.tsx` | kleine Abweichung | Zeigt Titel, Datum und Board, aber nicht den letzten Poster. Kein Kopflink. Ohne Themen wird die Box ausgeblendet; STU zeigt „Keine Beiträge vorhanden“. |
| `maindesk/emergencies.twig` | — (Daten geladen in `dashboard.tsx:137-141`, Rendering fehlt) | fehlt | Siehe G3. |
| `maindesk/events.twig` (10 Einträge, Ebenen-Icon, Text, Datum) | `DashboardLowerSections.tsx#RecentEvents` | kleine Abweichung | Text „Ebene n · x\|y“ statt Ebenen-Icon. Zusätzlich gibt es den Link „Alle Ereignisse“. |
| `maindesk/colonyLimits.twig`, `crewLimit.twig` | `DashboardLowerSections.tsx#DashboardLimits` | gleich | Tabelle statt Icon-Zeile, Werte identisch. |
| `maindesk/randomOnline.twig` | `DashboardLowerSections.tsx:133-145, 216-241` | große Abweichung | Siehe G5. |
| `ship/buildProgress.twig`, `retrofitProgress.twig` | `pages/dashboard/DashboardProcesses.tsx` | kleine Abweichung | Eine gemeinsame Prozessliste (Forschung, Bau, Kolonisierung, Schiffsbau, Reparatur, Umrüstung) ohne Rumpfbild. |
| `maindesk/quests.twig` | — | fehlt (out of scope) | Quests sind out of scope. |
| `maindesk/firstColonyDialogue.twig`, `colonylist.twig` (Startplanetenwahl nach Ebene/Region, Planetentyp-Erklärung), `colonizationShipDialogue.twig` | `pages/onboarding.tsx` (`/claim-colony`) | kleine Abweichung | Wahl über Sektor, System und Planet mit Starterzonen. Keine Kolonieschiff-Variante. |
| `view/options.twig` + `Module/PlayerSetting/*` | `pages/settings.tsx` (Tabs Profil, Sicherheit, Benachrichtigungen, Gameplay, Einladungen, Gefahrenzone) | kleine Abweichung | Alle STU-Schalter (außer Piraten-History, 3D und Crew-Rassen) sind vorhanden und werden ausgewertet (`settings/user-settings-reader.ts`, Leser in `tick.service.ts`, `messaging.service.ts`, `database.service.ts`, `influence.service.ts`). Es **fehlen Crew-Ränge (eigene Rangnamen) und Crew-Rassen**. Die Tabs ersetzen die eine lange Tabellenseite. Siehe auch K12 und K13. |
| Urlaub (`ActivateVacation`, Hinweisliste in `options.twig:166-200`) | `settings.tsx:903-931`, `settings.service.ts:244-283`, `tick.service.ts:155-172` | große Abweichung | Siehe G2. Zusätzlich ein falscher UI-Text: „Nach Deaktivierung gilt eine 7-Tage-Abklingzeit“ (`settings.tsx:907`), das Backend zählt aber ab Aktivierung (`settings.service.ts:252-262`). |
| Konto löschen (`DeleteAccount`, `DeletionConfirmation`) | `settings.tsx:933-985`, `pages/confirm-deletion.tsx`, `modules/account-deletion/*` | gleich | Widerruf als SWU-Extra. Textfehler „rueckgaengig“ und „geloescht“ (`settings.tsx:935-936`), „Passwort bestaetigen“ (`:956`). |
| Tutorial (`Game/Action/SetTutorial`, `FinishTutorial`, `View/ShowPadd`, `html/tutorial/*`, `tutorial.js`, `TutorialStep`) | `components/tutorial/TutorialPadd.tsx`, `modules/tutorial/*` (34 Schritte in 7 Ansichten, `tutorial-definitions.ts`), Settings „Tutorials anzeigen / neu starten“ (`settings.tsx:655-680`) | gleich | Inhalte sind eigene SWU-Texte. Nicht abgedeckte Ansichten: Handel, Allianz, Datenbank, Ereignisse (`app-shell.tsx:20-31`). |
| `admin/overview.twig` (Wetterbericht/Ionensturmkarten je Ebene) | `pages/admin.tsx` (Quick Actions: Tick, alle Bauten fertig, Spielstatus, News; Tool-Kacheln) | große Abweichung | Siehe G8: kein Wetterbericht. Die Seite folgt dem SWU-Kachel-Layout, nicht den Konventionen. Textfehler „abschliessen“, „ausloesen“, „fuer“ (`admin.tsx:206,221,265,279,321`). |
| `admin/playerList.twig` (Avatar, Name, Allianz, Fraktion, Profil- und PM-Link, zuletzt online, Status, Sperren, Entsperren, Blockieren) | `pages/admin-users.tsx` | kleine Abweichung | Tabelle mit ID, Name, Fraktion, Registrierung, letzter Aktivität, Status, MAP_EDITOR und Aktionen (Sperren, Entsperren, Löschverbot, Blockieren, Sofort löschen) plus Suche. **Kein Avatar, keine Allianz, kein Profil- oder PM-Link.** |
| `admin/userLock.twig` | Dialog in `admin-users.tsx` | gleich | Ticks und Begründung (max. 500 Zeichen). |
| `admin/massMail.twig` (Medium E-Mail **oder** PM) | `pages/admin-mass-message.tsx` | kleine Abweichung | Immer als PM, optional zusätzlich E-Mail (hinter Flag). Fraktionsfilter als SWU-Extra. Reine E-Mail ohne PM ist nicht möglich. |
| `admin/ticks.twig` (Kolonie-Tick je Kolonie/Gruppe, Schiff-Tick je Schiff, Process, Wartung, Orion) | `pages/admin-ticks.tsx` | kleine Abweichung | Jobs MAIN, BUILDING_COMPLETION und MAINTENANCE (`packages/shared/src/lib/common/index.ts:32`) mit Laufhistorie (Status, Dauer, Fehler) als SWU-Mehrwert. **Kein Einzel-Kolonie- oder Einzel-Schiffstick.** |
| `admin/scripts.twig` (Spielstatus, Signaturen, Influence Areas, Kolonie-Korrektur, BB-Code-Bereinigung, fehlende Awards, Crewbedarf der Baupläne, Piratenflotte, Crew erstellen, Forschungsbaum je Fraktion, Spiegelwelt, Cache, **Spacecraft aufladen**, News) | `admin.tsx` (Spielstatus, News), `starmap.controller.ts` `admin/layers/:id/recalculate-influence`, Signaturen im Vollkarteneditor (`components/starmap-admin-fullmap/FlightSignaturePanel.tsx`) | große Abweichung | Siehe G8. |
| `admin/liveMap.twig` (`View/Map/LiveMap/*`: Live-Schiffspositionen inkl. getarnter Schiffe, Ionensturm-Bearbeitung, Spurenfilter) | — | fehlt | Siehe G8. |
| `admin/signatureScan.twig` | `FlightSignaturePanel.tsx` im Vollkarteneditor | gleich | sc-WP-NAV-2c. |
| Karteneditor (`mapeditor_*.twig`, `fullMapEditor.twig`, `influenceareas.twig`) | `pages/starmap-admin-fullmap.tsx`, `starmap.controller.ts` admin/* | gleich (strukturell anders) | Kartenbereich, hier nicht im Detail geprüft. |
| `admin/rumpCreator.twig` | `pages/admin-ships.tsx` (Admin-Baupläne, Spawn), Inhalte aus `game-data` | bewusst anders | — |
| `admin/researchTree.twig` | Spielerseite `/research/tree` (`pages/research-tree.tsx`) | kleine Abweichung | Kein Admin-Blick „Baum je Fraktion“. |
| — | `admin-invites.tsx`, `admin-factions.tsx`, `admin-awards.tsx`, `admin-trade-deals.tsx`, `admin-rpg-ships.tsx` | SWU-Extra | Für Spieler ohne Belang. |

## Große Abweichungen

### G1 – Schiffsbau, Umrüstung, Werftreparatur und Schildregeneration nur im Haupttick
- **STU:** Der Process-Tick läuft jede Minute (`resource/cron/TickTasks.php`, `->everyMinute()` für `ProcessTickRunner`). Er erledigt `Module/Tick/Process/FinishShipBuildJobs.php` (Kolonie- und Stationswerft, Auftrag mit `finish_date = time()+buildtime`, `Colony/Action/BuildShip/BuildShip.php:271-272`), `FinishShipRetrofitJobs.php`, `FinishPassiveShipRepairJobs.php`, `RepairTaskJobs.php` und `ShieldRegeneration.php` (alle 15 min, `SHIELD_REGENERATION_TIME`).
- **SWU:** Minütlich läuft nur `TickService#checkBuildingCompletions` für Gebäude und Terraforming (`apps/backend/src/modules/tick/tick.service.ts:311-376`). Die Werftqueue wird nur in `ColonyTickProcessorService#processTick` → `processShipBuildQueue` verarbeitet (`colony/colony-tick-processor.service.ts:229-238`, `colony-shipyard.service.ts:1228-1285`). Das gilt auch für Stationswerften (`spacecraft.service.ts:4917` → `station-shipyard.service.ts:148-164`), Stationsreparatur (`spacecraft.service.ts:4916` → `station-repair.service.ts:234-252`) und Eigenreparatur (`spacecraft.service.ts:4924-4926` → `spacecraft-repair.service.ts:187-193`, Dauer bis 3 h nach `:311-313`). Alles wird nur aus `handleTick` aufgerufen (`tick.service.ts:238-240`), also um 0, 12, 15, 18 und 21 Uhr (`tick.service.ts:44`, per `GAME_MAIN_TICK_SCHEDULE_HOURS` änderbar). Schilde regenerieren nur im Haupttick (`spacecraft.service.ts:4959-4965`). *(nachgeprüft 2026-11-17: kein Lazy-Abschluss in Lese-APIs, kein weiterer Cron; die einzigen `@Cron`/`@Interval` im Backend sind Haupttick, Gebäude-Minutentick, Wartung 3 Uhr, Saison-Anomalien, Deal-Hinweise, Allianzbanner und Diplomatie-Dispatcher. Zeilen auf den aktuellen Stand korrigiert.)*
- **Zusatz (nachgeprüft 2026-11-17):** Weil der Haupttick Kolonien von Urlaubern überspringt (`tick.service.ts:169-172`), werden in SWU während des Urlaubs auch Schiffsbau, Umrüstung und Reparatur in der Koloniewerft nicht fertig. STU schließt sie im Process-Tick ohne Urlaubsprüfung ab (`Module/Tick/Process/FinishShipBuildJobs.php:21-46`, `FinishShipRetrofitJobs.php:21`).
- **Auswirkung:** Ein Schiff mit z. B. 2 h Bauzeit, um 0:30 gestartet, zeigt die Fertigstellungszeit 2:30 (Maindesk „Aktive Prozesse“, `dashboard.tsx:394-395`), erscheint aber erst um 12:00. Das sind bis zu 12 h Verzug. Bei Umrüstungen und Reparaturen ist es genauso. Schilde laden zwischen den Ticks nicht nach (STU: alle 15 min).
- **Ticket:** Kein eigenes Ticket. `col-A3b`, `col-A5` und `sc-WP-STAT-5` sind resolved, ohne dass der Fertigstellungszeitpunkt geprüft wurde. Die Inventur hatte das schon als „unsicher“ markiert (`inventory/shell-admin-runtime.md:114-117`).

### G2 – Urlaub wirkt im Tick sofort statt nach 48 h
- **STU:** `ColonyTickManager.php:60-61` und `Tick/Spacecraft/ManagerComponent/CrewLimitations.php:46-48` prüfen `isVacationRequestOldEnough()` (`Orm/Entity/User.php:299-301`, Vorlauf 48 h).
- **SWU:** `tick.service.ts:155-172` baut `vacationUsers` aus `user.vacationMode`. Kolonien, Schiffsreparatur (`skipRepair`) und das globale Crewlimit (`tick.service.ts:258`) werden damit **ab Aktivierung** ausgesetzt. Das zentrale `isVacationEffective` (`packages/shared/src/lib/auth/index.ts:8-13`) nutzen nur der Interaktionsschutz und andere Pfade. Der Test `colony/colony-tick.spec.ts:7056-7061` prüft nur `vacationMode`. *(nachgeprüft 2026-11-17: Dasselbe Muster haben Ionensturm (`spacecraft/ion-storm-effects.ts:57-66`) und Subraumellipse (`anomaly/subspace-ellipse.handler.ts:75-82`). Sie verschonen Schiffe sofort ab Aktivierung, STU dagegen erst nach 48 h (`Orm/Entity/Location.php:150-154` `getSpacecraftsWithoutVacation` → `isVacationRequestOldEnough`, genutzt in `IonStormHandler.php:136` und `SubspaceEllipseHandler.php:76`).)*
- **Auswirkung:** Ein Spieler kann kurz vor einem Tick Urlaub aktivieren und sich danach wieder einloggen. Damit setzt er das Crewlimit für einen Tick aus. Außerdem friert die Kolonie sofort ein, während die UI 48 h Vorlauf verspricht (`settings.tsx:904-907`). Zusätzlich ist die UI-Angabe zur Sperrfrist falsch (siehe Tabelle).
- **Ticket:** `sh-AP-04c` ist resolved. Das AK „Kolonien wirksamer Urlauber werden … übersprungen … Urlaub < 48 h zählt als aktiv“ ist nur teilweise erfüllt: Die Implementierung unterscheidet nicht nach „wirksam“.

### G3 – Notrufe fehlen auf dem Maindesk
- **STU:** `html/maindesk/emergencies.twig` ist eine Box „Notrufe“ mit Koordinaten, Info (Schiff von Spieler), Notrufsignal und Zeitpunkt. Ohne Detailrecht steht dort nur der Sektor (`MaindeskProvider.php:155-170`, `EmergencyWrapper`).
- **SWU:** `pages/dashboard.tsx:137-141` lädt `/spacecraft/distress-signals/active` (`spacecraft-communication.service.ts:390-420`) in `data.distressSignals`. **Keine Komponente rendert das** (Suche nach `distressSignals` findet nur `dashboard.tsx` und `types.ts`). Notrufe sieht man nur am eigenen Schiff im `CommunicationDrawer.tsx`.
- **Auswirkung:** Spieler erfahren nichts von fremden Notrufen. Damit fehlt der STU-Anreiz, Rettungseinsätze zu fliegen und dabei Kapseln zu bergen.
- **Ticket:** Keins. `sh-AP-18` (resolved) hat Notrufe nicht im Scope. Die Inventur nannte sie „teilweise (unsicher)“.

### G4 – Registrierung umgeht die Fraktionswählbarkeit
- **STU:** `factionEntry.twig` zeigt `playerCount/playerLimit`. Eine volle Fraktion ist nicht wählbar.
- **SWU:** `tmw-FA1b1` hat `isSelectable` eingeführt. Erzwungen wird es nur in `onboarding/onboarding.service.ts:114`. Die Fraktion wird aber schon bei der Registrierung gesetzt: `auth.service.ts:333-410` prüft nur, ob die Fraktion existiert (`factionRepo.findOne`), und schreibt `factionId`. Danach lehnt das Onboarding mit „Faction is already selected“ ab (`onboarding.service.ts:106-107`). `pages/register.tsx:28-35, 250-276` kennt `isSelectable` gar nicht und bietet alle Fraktionen an.
- **Auswirkung:** Die Admin-Sperre einer Fraktion (Balancing) ist für neue Spieler wirkungslos.
- **Ticket:** `tmw-FA1b1` ist resolved. Das AK „direkte Requests können die Sperre nicht umgehen“ gilt nur für `POST onboarding/faction`, nicht für `POST auth/register`.

### G5 – „Zufällige Spieler (online)“ zeigt nur einen Spieler
- **STU:** `maindesk/randomOnline.twig` zeigt bis zu **35** Avatare online sichtbarer Spieler, sortiert nach letzter Aktion (`MaindeskProvider.php:97-99`, `UserRepository::getOrderedByLastaction(35, …)`). Sichtbar sind Spieler mit Online-Status oder solche, die einen als Freund führen.
- **SWU:** `DashboardLowerSections.tsx:133-145` wählt **einen** zufälligen Spieler aus `/database/online` und rendert ihn mit Avatar (`:222-235`).
- **Auswirkung:** Spürbar weniger soziale Information auf der Startseite. Man sieht nicht, wer gerade aktiv ist.
- **Ticket:** Keins (laut Inventur galt das als „voll“).

### G6 – Keine Spielrunde, keine Rundenstatistik, keine Version
- **STU:** `Module/Tick/TickManager.php:31-104` beendet die alte Runde, startet die nächste (`GameTurn`) und schreibt `GameTurnStats` (Spielerzahl, Logins 24 h, Inaktive, Urlauber, Schiffe, KN-Beiträge, Flugsignaturen, PMs). `serverTimeAndVersionComponent.twig` zeigt Datum und Uhrzeit, „Runde n“ und „Version“ mit Changelog-Link, die Landing zeigt „Runde“.
- **SWU:** Die Ticknummer ist ein Zeitstempel (`tick.service.ts:131`, `getMainTickNumber`). Es gibt kein Rundenmodell (keine Treffer für `GameTurn` oder `currentTurn`). Die Sidebar zeigt nur `HH:MM:SS` und den Tick-Ring (`sidebar.tsx:103-125`). Statistik-Snapshots gibt es (`statistics.service.ts#recordSnapshots`), aber ohne Rundenbezug.
- **Auswirkung:** Spieler können sich nicht über Rundennummern verständigen. Version und Changelog sind im Spiel nicht auffindbar, nur über die News auf der Landing.
- **Ticket:** Keins.

### G7 – Seitenkopf und Meldungsbox fast nicht ausgerollt
- **STU:** Jede Seite hat `/ Modul / Unterseite` (`html/breadcrumb.twig`) und `<title>` je Modul (`ModuleEnum::getTitle`). Jedes Aktionsergebnis erscheint als Tabelle „Meldung“ (`systeminformation.twig`).
- **SWU:** `components/PageHeader.tsx` gibt es, genutzt wird er nur in `dashboard.tsx`, `database.tsx`, `trade.tsx`, `admin-ticks.tsx`, `admin-mass-message.tsx` und `password-reset.tsx`. Kolonien, Schiffe, Schiffsdetail, Karte, Forschung, Nachrichten, HoloNet, Allianzen, Ereignisse und Einstellungen haben weder Breadcrumb noch Seitentitel (`document.title` setzt nur `PageHeader.tsx:20-26`). `components/ActionResult.tsx` samt `useActionResult` wird **nirgends** importiert, auch nicht in Maindesk und Datenbank, obwohl das AK diese Referenz verlangt. Mehrzeilige Ergebnisse laufen weiter über Toasts (max. 3, 4 s).
- **Auswirkung:** Orientierung und Tab-Titel sind uneinheitlich. Ergebnisse von Kampf, Transfer, Scan oder Massenschaltung gehen nach wenigen Sekunden verloren. STU zeigt sie bis zum Seitenwechsel.
- **Ticket:** `sh-AP-12` ist resolved. Das AK „ActionResult … Maindesk und Datenbank als Referenz“ ist für `ActionResult` nicht erfüllt, weil keine Seite die Komponente nutzt. Den Rollout der übrigen Seiten hat das Ticket bewusst den Fachbereichen überlassen, erledigt ist er dort nicht.

### G8 – Admin: Livekarte, Wetterbericht, Schiff aufladen, Einzel-Ticks, Korrekturskripte
- **STU:** `admin/liveMap.twig` und `Admin/View/Map/LiveMap/ShowLiveMapData.php:87-89` zeigen alle Schiffe live, auch getarnte, mit Spurenfilter und Ionensturm-Bearbeitung. `admin/overview.twig` zeigt Ionensturmkarten je Ebene. `scripts.twig:135-183` bietet „Spacecraft aufladen“ (EPS, Antrieb, Schilde, Reaktor, Batterie; Bulk für Schiffe und Stationen). Dazu Kolonie-Korrektur, Bereinigung defekter BB-Codes, fehlende Awards, Crewbedarf der Baupläne neu berechnen und Crew erstellen. `ticks.twig` erlaubt Kolonie- und Schiffstick je ID.
- **SWU:** `pages/admin.tsx:17-77` (Kacheln), `pages/admin-ticks.tsx` (nur drei globale Jobs), `pages/admin-ships.tsx` (nur Spawn und Baupläne). Für die genannten Werkzeuge gibt es keine Endpunkte (Admin-Routen geprüft in `auth.controller.ts`, `starmap.controller.ts`, `spacecraft.controller.ts`).
- **Auswirkung:** Kaum spielerseitig. Support und Tests sind aufwendiger, z. B. fehlt das Aufladen beim Testen, und Spielerstandorte lassen sich nicht live prüfen.
- **Ticket:** Keins (laut Inventur „fehlt“ bzw. „STU-spezifisch“).

### G9 – Maintenance-Handler unvollständig, Crew-XP-Wartungstick nie ausgelöst
- **STU:** `Module/Maintenance/services.php` registriert 20 Handler, darunter `MaintenanceCrewExperienceHandler` (jedes Spielerschiff erhält täglich `SkillEnhancementEnum::MAINTENANCE_TICK`), `EmptyPlotDeletion`, `CreateMissingUserAwards`, `CorruptFleetDeletion`, `ColonyCorrectorHandler`, `SpacecraftCorrectorHandler`, `UserInformation` (Hinweis-PM nach 4 und 5 Monaten) und `OldTachyonScanDeletion`.
- **SWU:** `tick/tick.module.ts:91-111` registriert 7 Handler (`top-flights-reward`, `profile-visits`, `layer-map-cycle`, `trade-licenses`, `trade-offers`, `trade-lottery`, `idle-users`). `CrewEnhancementEvent.MAINTENANCE_TICK` ist in `spacecraft/crew-expertise.ts:28,69` definiert (TECHNICAL +1), wird aber **nirgends ausgelöst**: Eine Suche nach der Verwendung findet nur die Definition.
- **Auswirkung:** Technik-Crew sammelt keine tägliche Grund-XP, Beförderungen kommen langsamer als in STU. Leere RPG-Plots bleiben stehen. Fehlende Datenbank-Awards werden nicht nachgetragen.
- **Ticket:** `sc-WP-CREW-2` ist resolved („Ereignisquellen“), die Ereignisquelle MAINTENANCE_TICK fehlt aber.

## Kleine Abweichungen

- Landing ohne Online-Zahl und ohne Forum- oder Changelog-Link. Legal-Links sind per Default unsichtbar (`components/legal/LegalLinks.tsx:3-6`), die Routen funktionieren trotzdem (`app/app.tsx:96-98`).
- Registrierung ohne Akzeptanz-Checkbox für Regeln und Datenschutz (STU `registration.twig:197-208`) und ohne Fraktionsbeschreibung.
- Die gesperrte Anmeldung zeigt eine Fehlermeldung im Modal statt einer eigenen Seite (`accountLocked.twig`).
- Spielstatus RESET und RELOCATION fehlen (`game-status.service.ts:17-21`).
- Header ohne Forum-Link und ohne Deals-Hinweis (`nagusComponent.twig`). Kein Hinweis „Zum Maindesk“ für neue Spieler.
- Keine eigene Navigation „Stationen“ (STU `navigationComponent.twig:5-7`). Stationen stehen als Tabelle auf der Schiffsliste (`pages/spacecraft.tsx:188, 217-235`).
- Maindesk, neue HoloNet-Beiträge: ohne Avatar und Plotname, 5 statt 3 Einträge (`DashboardLowerSections.tsx:91-131` gegenüber `newKnPostings.twig`, `KnPostRepository.php:121`).
- Maindesk, Allianzforum: ohne letzten Poster und Avatar, ohne Leerzustand (`DashboardForum.tsx:8`).
- Maindesk, Ereignisse: Ebene als Text statt als Icon `buttons/layer_<id>.png` (`DashboardLowerSections.tsx:55-63`).
- Maindesk, Werftfortschritt ohne Rumpfbild (`DashboardProcesses.tsx`).
- `DashboardAttention` nutzt Emoji-Icons ⚡ 👤 🛡 📦 (`dashboard.tsx:259, 269, 283, 299, 311, 321`) entgegen Konvention 3.6. `sh-AP-13a` hat nur die drei Alarm-Emoji entfernt.
- Umlaut-Reste trotz `sh-AP-13a`: `settings.tsx:276, 289, 935-936, 956`, `login.tsx:445, 603`, `admin.tsx:206, 221, 265, 279, 321`.
- Settings-Boxen in `rounded-lg` und eine Admin-Seite mit `text-2xl`/Cinzel-Titel (`settings.tsx:58, 991-1000`, `admin.tsx:319`) entgegen Konvention 3.2 und 3.3.
- Settings: Crew-Ränge (eigene Rangnamen, `ChangeCrewRankNames`) und Crew-Rassen fehlen.
- Der Button „Kryoschlaf beenden“ ist praktisch nicht erreichbar, weil die Aktivierung ausloggt und ein Login den Urlaub beendet (`settings.tsx:853-871`). Kosmetisch.
- Admin-Spielerliste ohne Avatar, Allianz, Profil- und PM-Link (`admin-users.tsx`).
- Massennachricht nicht als reine E-Mail möglich (`admin-mass-message.tsx`).
- Admin-Ticks ohne Einzel-Kolonie- oder Einzel-Schiffstick (`admin-ticks.tsx`, `TICK_RUN_TYPES`).
- Kein Admin-Forschungsbaum je Fraktion (`admin/researchTree.twig`).
- Tutorial deckt Handel, Allianz, Datenbank und Ereignisse nicht ab (`app-shell.tsx:20-31`).
- History-Tick fehlt: keine stündliche Ereignis- bzw. Ionensturmkarte (`Tick/History/*`), in Admin und Spiel nicht sichtbar.
- Sammelfelder erschöpfen nicht (nachgeprüft 2026-11-17): STU zieht beim Bussard-Sammeln 95–105 (Fraktionsmodul 190–220) vom Feldvorrat `LocationMining.actual_amount` ab, markiert leere Felder mit `depleted_at` (`Module/Tick/Spacecraft/Handler/BussardCollectorHandler.php:50-69`), und der Wartungshandler `CreateInterstellarMedia` füllt sie täglich wieder auf (0 → 5 % von max, sonst +15 %, `Module/Maintenance/CreateInterstellarMedia.php:16-28`). SWU hat nur eine feste Rate je Feldtyp ohne Vorrat (`galaxy_field_types.miningResources`, `database/migrations/20261116140000-add-field-mining-resources.ts:6-12`; `spacecraft/resource-collection.service.ts:144-158, 271-295`). Sammeln ist damit unbegrenzt, der STU-Handler hat kein Gegenstück.
- Fehler-Fallbacks: Die Catch-all-Route leitet ohne Meldung auf `/` um (`app/app.tsx:282`).
- Passwort-Reset als Token-Link statt neues Passwort per Mail. Funktional eher besser.
- Tooltip-Komponente nur in 5 Dateien genutzt (siehe Tabelle).

## Bewusste/entschiedene Abweichungen

- Quests (Maindesk-Box, Maintenance) und Piraten (PirateTick, `BeginPirateRound`, `PirateWrathDecreaser`, Piratenflotte im Admin, Option `show_pirate_history_entrys`) sind out of scope (`map.md`, Leitplanke 3; Duplikat-Tabelle).
- Orion-Sklavenhandel entfällt (`map.md`, Leitplanke 2; `inventory/shell-admin-runtime.md:514`).
- E-Mail-Verifikation, Kontolöschung, Inaktivitätslöschung, Massenmail und Rechtstexte laufen hinter Flags und sind per Default aus (`map.md`, Leitplanke 4). Impressum enthält Platzhalter (`pages/imprint.tsx`).
- SMS-Verifikation, Referer-Tracking, Partnerseiten, Spiegelwelt, PHP-Cache, GameRequest-Log und Benchmark werden nicht übernommen (`inventory/shell-admin-runtime.md:514`, `issues/sh-AP-17-impressum-datenschutz-hilfe.md:16`).
- Rumpf-Editor: Inhalte kommen aus `game-data` (`inventory/shell-admin-runtime.md:159`).
- In-Universe-Datum „n NSY“ statt STU-Jahr +370 (`map.md`, Eintrag sh-AP-13b; `apps/frontend/src/lib/format.tsx`).
- Farbschemata: drei SWU-Schemata statt der STU-CSS-Sheets (`map.md`, Eintrag soc-F3b).
- Profilbesucher werden auf dem Maindesk angezeigt; in STU ist das auskommentiert (`map.md`, Eintrag soc-F1b).
- Spieler-IDs ab 100 (`map.md`, Eintrag tmw-T12a).
- Tick-Zeitzone Europe/Berlin (`map.md`, Eintrag sh-AP-07c; `tick/maintenance.service.ts:13`).
- Status TICK sperrt schreibende Aktionen (`map.md`, Eintrag sh-AP-20).
- Urlaub pausiert den Kolonie-Tick, Sperrfrist ab Aktivierung (`map.md`, Eintrag sh-AP-04c). Die Umsetzung weicht ab, siehe G2.
- „KommNet“ heißt HoloNet, „Urlaub“ heißt Kryoschlaf (Star-Wars-Ersatz).
- Invite-Keys und Closed Alpha (SWU-eigen, `auth.service.ts:370-399`).
- Startplanetenwahl über Sektor, System und Planet statt STU-Liste; keine Kolonieschiff-Variante (`inventory/shell-admin-runtime.md:36`).
- Fraktionen ohne `playerLimit` (`issues/tmw-FA1b1-*.md`, AK „weder playerLimit noch automatische Balancing-Sperren“).

## Unsicherheiten – nachgeprüft (2026-11-17, codegraph)

- **G1 – Lazy-Abschluss oder weiterer Cron für Werft, Umrüstung, Reparatur, Schilde?** **Ergebnis: bestätigt** (G1 bleibt, Belege präzisiert).
  - Einziger Aufrufer von `ColonyShipyardService#processShipBuildQueue` (`colony-shipyard.service.ts:1228`) ist `colony-tick-processor.service.ts:238`, nur aus `ColonyTickProcessorService#processTick`. Dieses wird nur von `TickService#handleTick` über `colonyService.processTick` aufgerufen (`tick.service.ts:176`). Der Wrapper `colony.service.ts:1670-1672` hat keinen weiteren Aufrufer.
  - Die Abschlussfunktionen `finishShipBuildQueue`, `finishShipRepairQueue` und `finishShipRetrofitQueue` (`colony-shipyard.service.ts:1330, 1340, 1425`) werden nur in `processShipBuildQueue` aufgerufen (`:1276-1283`). `ShipbuildingCoreService#completeBuild` (`shipbuilding-core.service.ts:241`) hat genau zwei Aufrufer: `colony-shipyard.service.ts:1334` und `station-shipyard.service.ts:160` (`processTick`).
  - `StationShipyardService#processTick`, `StationRepairService#processTick` und `SpacecraftRepairService#processTick` (`spacecraft-repair.service.ts:187`) werden nur in `SpacecraftService#processTick` (`spacecraft.service.ts:4916-4925`) aufgerufen. Dieses ruft nur `tick.service.ts:239` im Haupttick.
  - Die Lese-APIs berechnen nichts und schließen nichts ab. `dashboard.service.ts:199-208`, `colony-projection.service.ts:439-450, 1079, 1137` und `station-repair.service.ts:60-110` geben `finishesAt` nur aus.
  - Weitere Zeitgeber: Im Backend gibt es nur `tick.service.ts:83` (Haupttick stündlich, aktiv nur zu den Stunden `0,12,15,18,21`, `:44`), `tick.service.ts:311` (Minutentick nur für `colony_fields`), `maintenance.service.ts:68` (3 Uhr), `seasonal-anomaly.service.ts:74`, `trade-deal-notification.service.ts:27`, `alliance-banner.service.ts:238` und `diplomacy-notification-dispatcher.service.ts:28`. Keiner davon fasst Werft-Queues an.
  - Admin-Abkürzung: „Alle Bauten fertig“ (`tick.service.ts:395-410`) setzt `finishesAt` in die Vergangenheit und startet dann den Haupttick. Das ist kein Spielerpfad.
  - STU zum Vergleich: `TickTasks.php:68-74` (`ProcessTickRunner`, `everyMinute`) mit `Module/Tick/Process/FinishShipBuildJobs.php:21-60` (Kolonie- und Stationswerft), `FinishShipRetrofitJobs.php:21`, `FinishPassiveShipRepairJobs.php:24-28, 129-152` und `ShieldRegeneration.php:15, 29-61` (15 min, nur abgeschaltete Schilde, 10 % bei intaktem System laut `SpacecraftWrapper.php:147-155`).
  - **Neu:** Weil der Haupttick Kolonien von Urlaubern überspringt, steht während des Urlaubs auch die Koloniewerft still. In STU nicht (siehe Zusatz in G1).
  - Ob `GAME_MAIN_TICK_SCHEDULE_HOURS` in Produktion vom Default abweicht, lässt sich nur aus der Prod-Konfiguration klären (`.env.example:14` zeigt `*`, also stündlich, auskommentiert). Selbst bei stündlichem Haupttick bleibt bis zu 1 h Verzug statt ≤ 1 min.
- **G2 – Fallen `vacationMode` und „wirksam“ zusammen?** **Ergebnis: bestätigt**, zusätzlich erweitert.
  - `settings.service.ts:264-268` setzt `vacationMode`, `vacationRequestedAt` und `vacationStartedAt` gleichzeitig. Die 48 h steckt nur in `isVacationEffective` (`packages/shared/src/lib/auth/index.ts:1, 8-13`).
  - Der Tick liest nur `vacationMode` (`tick.service.ts:155-158`). Davon hängen ab: übersprungene Kolonien (`:169-172`), `skipRepair` für Schiffe und Stationen (`:240` → `spacecraft.service.ts:4916, 4924`, `station-repair.service.ts:235`) und das Crewlimit (`:258`).
  - STU prüft an genau diesen Stellen `isVacationRequestOldEnough` (48 h, `UserConstants.php:32`): `ColonyTickManager.php:60-61`, `CrewLimitations.php:46-48`, `RepairActions.php:153`.
  - **Neu:** Auch Ionensturm (`spacecraft/ion-storm-effects.ts:57-66`) und Subraumellipse (`anomaly/subspace-ellipse.handler.ts:75-82`) filtern nach `vacationMode`. STU nimmt `Location::getSpacecraftsWithoutVacation` (`Orm/Entity/Location.php:150-154`, also 48 h). In G2 ergänzt.
  - Die Login-Seite ist in beiden Spielen gleich: Login beendet den Urlaub (`auth.service.ts:461-471`, STU `SessionLogin.php:143-147`). Damit funktioniert der in G2 beschriebene Missbrauch (Crewlimit für einen Tick aussetzen).
  - Statistik und Inaktivitätslöschung nutzen bewusst `vacationMode` (`statistic-metrics.ts:85-87`, `idle-user-maintenance.service.ts:92-93`). Das entspricht STU (`IdleUserWarning.php:192`, `isVacationMode`) und ist keine Abweichung.
  - Ein Integrations- oder Unit-Test für „Urlaub < 48 h ⇒ Tick läuft“ fehlt weiterhin (`colony-tick.spec.ts:7056-7061` setzt nur `vacationMode`).
- **Livekarte und Wetterbericht im Vollkarteneditor?** **Ergebnis: bestätigt (fehlt).**
  - Die Overlays im Editor sind nur Raster, Regionen, Admin-Regionen, Systemtypen, Unpassierbar, Grenzen und Effekte (`components/starmap-admin-fullmap/OverlayToggles.tsx:3-11`). Keine Komponente in `components/starmap-admin-fullmap/*` enthält Schiffe oder Stürme.
  - Unter den Admin-Routen in `starmap.controller.ts:322-750` gibt es keinen Endpunkt für Schiffspositionen oder Ionenstürme. Das Anomalie-Modul hat nur den Spieler-Endpunkt `seasonal-anomaly.controller.ts:17`.
  - Das Feld-Overlay „Effekte“ zeigt Feldtyp-Effekte, keine aktuellen Stürme. G8 bleibt unverändert.
- **Mining-Regeneration (`CreateInterstellarMedia`) gegenstandslos?** **Ergebnis: neu eingeordnet**, als kleine Abweichung statt „gegenstandslos“.
  - SWU kennt keinen Feldvorrat. Die Ausbeute ist eine feste Rate je Feldtyp (`galaxy-field-type.entity.ts:6-7`, Migration `20261116140000-add-field-mining-resources.ts:6-12`, Rate 100), und das Sammeln zieht nichts ab (`resource-collection.service.ts:144-158, 271-295`).
  - STU erschöpft Felder beim Sammeln (`BussardCollectorHandler.php:50-69`) und füllt sie täglich wieder auf (`CreateInterstellarMedia.php:16-28`).
  - Den Handler braucht SWU also nicht. Die eigentliche Lücke ist die fehlende Erschöpfung (unbegrenztes Sammeln). Unter „Kleine Abweichungen“ ergänzt. Ob das bewusst so ist, muss der Product Owner entscheiden. Die Zeile „Bussard/Aggregation … gleich“ in `spacecraft.md:58` ist insoweit zu optimistisch.
- **Tutorial-Inhalte gegen `stu_tutorial_step`?** **Ergebnis: weiterhin offen.**
  - Die STU-Migrationen legen nur die Tabelle an (`Migrations/pgsql/Version20241024092428_TutorialRemake.php:21-26`, `Version20260103160052.php:19-21`) und enthalten keine `INSERT`. Auch die Sqlite-Testmigration enthält keine Tutorialschritte.
  - Die Inhalte gibt es nur im Prod-Dump. Ohne Dump oder laufendes STU ist kein Vergleich möglich. Da SWU eigene Texte schreibt, ist das niedrig priorisiert.
- **Mobil/Responsive und visuelle Darstellung.** **Ergebnis: weiterhin offen.** Das braucht ein laufendes Spiel im Browser. Aus dem Code allein lässt es sich nicht belastbar beurteilen.
- **`VITE_LEGAL_PAGES_ENABLED` im Produktionsbuild?** **Ergebnis: neu eingeordnet**, nach Codelage praktisch „aus“, letzte Gewissheit nur mit Prod-Zugang.
  - Der Wert wird zur Build-Zeit eingebacken (`LegalLinks.tsx:3`, `import.meta.env`). Das Frontend-Image baut mit `npx nx build frontend` (`apps/frontend/Dockerfile:10-17`) ohne `ARG` oder `ENV`, und `deploy.yml:83-92` übergibt keine `build-args`.
  - `.dockerignore` schließt `.env.example` und `.env.production.example` aus. Die lokale `.env` enthält den Schlüssel nicht. `.env.example:45` setzt `false`.
  - Ohne Eingriff in die CI ist der Wert im Prod-Build also nicht gesetzt, und die Links sind unsichtbar. Durch die PO-Entscheidung (README G: keine Flags mehr) wird die Frage ohnehin obsolet.
