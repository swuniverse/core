# STU→SWU Paritätsinventur: Rahmen, Einstieg, Admin, Laufzeit

Stand: 2026-10-21, Basis `81b1f40`. Nur Lese-Inventur, kein Produktcode geändert.
Referenz: `st-universe/core` (PHP/Twig) und `st-universe/assets`. Ziel: `swuniverse/core`.

## 1. Übersicht

- **Rahmen (Shell)**: SWU hat Header, Sidebar, mobile Bottom-Nav, Wartungsbanner und Tick-Toasts (`apps/frontend/src/components/layout/*`). Gegenüber STU fehlen u. a.: Serverzeit mit Runde und Version, Forum-Link, „Neue Nachricht schreiben“ in der Userbox, Kolonie-Tooltips im Header, das STU-Navigationsicon-Set (SWU nutzt in der Sidebar eigene SVG-Icons), ein globales Tooltip-System (Tippy) sowie ein einheitliches Breadcrumb- und Meldungsmuster (`systeminformation.twig`).
- **Einstieg (Index)**: Login und Registrierung (mit Invite-Key, Closed Alpha) sind vorhanden. Es **fehlen**: Passwort vergessen/zurücksetzen, E-Mail-Verifikation, Login-Sperre bei Löschmarkierung oder Sperre, News auf der Startseite, Impressum und Hilfe, Login per Spieler-ID.
- **Maindesk**: weitgehend vorhanden (Kolonien, Limits, Crew, zufälliger Online-Spieler, Forum, Ereignisse, HoloNet, Prozesse). Es fehlen Quests, eigene Boxen für Schiffsbau- und Umrüstfortschritt, die Markierung neuer KN/HoloNet-Beiträge sowie Notrufe in STU-Form (teilweise vorhanden).
- **Tick**: SWU hat einen stündlich geprüften Main-Tick mit konfigurierbaren Stunden (Default `0,12,15,18,21`, entspricht STU). Dazu kommen minütliche Jobs für Bauabschluss und Warp-Ankunft. Es **fehlen** fast alle Maintenance-Jobs (u. a. Inaktivitätswarnung und -löschung, Backup, Aufräumjobs), Pirate-Tick, History-Tick (Ereignis- und Ionensturmkarte), Rundenverwaltung (GameTurn, Sperren reduzieren) und die Wirkung des Urlaubsmodus im Tick.
- **Admin**: SWU hat Tick-Trigger, „Alle Bauten fertig“, Spielstatus (ONLINE, MAINTENANCE_ANNOUNCED, MAINTENANCE), Schiffs-Spawn und Baupläne, einen umfangreichen Kartenadmin, Invites und Benutzerrechte. Es **fehlen**: Spielerliste mit Sperren und Blockieren, Massenmail, News posten, Tick-Seite mit Einzeljobs und Historie, Skripte (Korrekturen), Livekarte, Signatur-Scan und „Schiff aufladen“.
- **Konto-Lebenszyklus**: Den Urlaubsmodus kann man setzen, er hat aber **keine Spielwirkung**: kein Tick-Skip, kein Angriffsschutz, kein Ende beim Login, kein 48-h-Vorlauf. Eine Kontolöschung wird nur angefordert (`deletionMark=1`). Es gibt keine Bestätigungsmail, keinen Ausführer und keine Löschung bei Inaktivität. Die Allianzseite hat bereits Einstiegspunkte (`.scratch/alliance-stu-parity/lebenszyklus-und-restparitaet-*`).

## 2. Feature-Tabelle

Legende SWU-Stand: **voll**, **teilweise**, **fehlt**, **abweichend** (bewusst oder strukturell anders). STU-Pfade sind relativ zu `st-universe/core/src`, SWU-Pfade relativ zu `swuniverse/core`.

### 2.1 Index / Einstieg

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Startseite (Landing) | `Module/Index/View/Overview`, `html/index/index.twig` | teilweise | `apps/frontend/src/pages/login.tsx` | SWU-Landing mit Hero, Features, Discord und Wiki. Keine System-News. |
| System-News auf der Startseite (5 neueste) | `Index/View/Overview` (`SYSTEM_NEWS`), `Component/Index/News/*`, Admin `PostNews` | fehlt | HoloNet kennt die Kategorie `NEWS` (`apps/backend/src/modules/holonet/entities/holonet-post.entity.ts`) | Ein öffentlicher News-Endpunkt fehlt. |
| Login | `Index/Action/Login`, `Lib/Session/SessionLogin.php` | teilweise | `apps/backend/src/modules/auth/auth.service.ts#login`, `pages/login.tsx` | JWT mit 7-Tage-Refresh. STU erlaubt den Login auch per Spieler-ID. SWU sperrt bei Wartung (`assertGameAccess`), aber **nicht** bei Sperre oder bestätigter Löschung. |
| Login beendet Urlaubsmodus | `SessionLogin::updateUser` | fehlt | — | SWU beendet den Urlaub nur per manuellem Button (`/user/vacation/deactivate`). |
| „Eingeloggt bleiben“ (`save_login`) | `UserSettingEnum::SAVE_LOGIN` | abweichend | `stores/auth.store.ts` | SWU persistiert Tokens immer. |
| Registrierung | `Index/Action/Register`, `Component/Player/Register/*`, `html/index/registration.twig` | teilweise | `auth.service.ts#register`, `pages/register.tsx` | SWU: Username, E-Mail, Passwort, Fraktion, Invite-Key. STU hat zusätzlich Referer und optional Mobilnummer mit SMS und vergibt den Namen „Siedler <id>“. |
| Registrierungsabschluss-Seite | `Index/View/ShowFinishRegistration`, `registrationEnd.twig` | abweichend | — | SWU loggt direkt ein und leitet zu `/claim-colony` weiter. |
| E-Mail-Verifikation (Code), Neusenden, Adresskorrektur | `Maindesk/Action/AccountVerification`, `EmailManagement`, `UserStateEnum::ACCOUNT_VERIFICATION`, `html/index/accountVerification.twig` | fehlt | `mail/mail.service.ts` (nur Willkommensmail) | Siehe AP-03. |
| SMS-Verifikation | `Maindesk/Action/SmsManagement`, `SmsVerificationCodeSender` | fehlt | — | Empfehlung: bewusst weglassen. |
| Passwort vergessen / zurücksetzen | `Index/Action/SendPassword`, `ResetPassword`, `View/ShowLostPassword`, `ShowResetPassword` | fehlt | — | Kritisch für den Live-Betrieb (AP-01). |
| Referer-Tracking | `RegistrationReferralTracker` | fehlt | — | Niedrige Priorität. Invites ersetzen es teilweise. |
| Impressum, Partnerseiten, Hilfe | `Index/View/ShowImprint`, `ShowPartnerSites`, `ShowHelp` | fehlt | — | Das Impressum ist rechtlich relevant (DE). |
| Fraktionsübersicht beim Registrieren | `Index/Lib/FactionItem`, `UiItemFactory`, `factionEntry.twig` | voll | `pages/register.tsx` (Spielerzahl, Boni) | — |
| Erstkolonie / Kolonieschiff | `Maindesk/Action/FirstColony`, `ColonizationShip`, `firstColonyDialogue.twig`, `colonizationShipDialogue.twig` | abweichend | `modules/onboarding/*`, `pages/onboarding.tsx` | SWU: Heimatwelt per Sektor-, System- und Planetenwahl. Die Kolonieschiff-Variante fehlt (wohl bewusst). |
| Wartung, Reset und Relocation | `Control/Router/Handler/*FallbackHandler`, `html/index/maintenance.twig`, `gameReset.twig`, `relocation.twig`, `Component/Game/GameStateEnum.php` | teilweise | `modules/game-status/*`, Banner in `components/layout/app-shell.tsx` | SWU kennt ONLINE, MAINTENANCE_ANNOUNCED und MAINTENANCE. STU kennt zusätzlich TICK (Spiel gesperrt), RESET und RELOCATION. |
| Gesperrt-Seite (Resttick, Grund) | `UserLockedFallbackHandler`, `html/index/accountLocked.twig` | fehlt | — | AP-08 |
| Fehler-Fallbacks (Item nicht gefunden, Schiff nicht gefunden, Uplink) | `Control/Router/Handler/*` | teilweise | Fehlertexte und Toasts je Seite | Keine 404- oder Fehlerseite. Die Catch-all-Route leitet zu `/` um. |

### 2.2 Spielrahmen (Game / Shell)

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Userbox (Avatar, Name, ID, Prestige, Klick führt zum Maindesk) | `html/game/component/userComponent.twig`, `Game/Component/UserProfileComponent` | voll | `components/layout/header.tsx` | Zusätzlich ein Allianzlink. Der Avatar führt zum Profil. |
| Userbox: Notizzettel | `userComponent.twig` (`openNotes()`-Popup) | abweichend | `header.tsx` → `/notes` | SWU nutzt eine eigene Seite statt eines Popups. |
| Userbox: „Neue Nachricht schreiben“ | `userComponent.twig` (`WRITE_PM`) | fehlt | — | AP-15 |
| Userbox: Hinweis „Zum Maindesk“ für neue Spieler | `userComponent.twig` (`IS_NEW_USER`) | fehlt | — | Kosmetisch. |
| PM-Navlet (Ordner-Icons mit Ungelesen-Zahl) | `pmComponent.twig`, `MessageFolderComponent` | teilweise | `header.tsx#MailboxFolderLink` | STU wechselt bei ungelesenen Nachrichten auf das Asset `pmnavlet_<n>_1` mit hervorgehobener Zahl. SWU zeigt immer `_0`. |
| Forschungs-Navlet (Name, Bild, Fortschritt, +Produktion, Wartend „+1“, Detail-Popup) | `researchComponent.twig`, `ResearchComponent` | teilweise | `header.tsx` (ab `lg`) | SWU zeigt Name, Balken und Punkte. Bild, Warenicon, +Produktion, Badge und Popup fehlen. |
| Kolonien-Navlet (alle Planetenbilder; Tooltip mit Koordinaten, System, EPS, Lager) | `coloniesComponent.twig`, `ColoniesComponent` | teilweise | `header.tsx` (max. 4, ab `xl`) | SWU zeigt eine Warnfarbe statt des Tooltips und begrenzt auf 4 Kolonien. |
| Nagus-/Deals-Popup | `nagusComponent.twig` | fehlt | — | Hängt am Handel (anderer Bereich). |
| Logout | `Game/Action/Logout` | teilweise | `header.tsx#handleLogout` | Nur clientseitig. Das Refresh-Token wird serverseitig nicht invalidiert. |
| Wiki-Link | `sitedefaults.twig` | voll | `header.tsx` | — |
| Forum-Link | `sitedefaults.twig` (`FORUM`) | fehlt | — | Discord-Link nur auf der Landing. |
| Einstellungen-Button | `sitedefaults.twig` | voll | `header.tsx#NavigationLink` | — |
| Sidebar-Navigation (Kolonien, Schiffe, Stationen, KommNet, Nachrichten, Forschung, Handel, Allianz, Datenbank, Ereignisse, Karte, NPC, Admin) | `navigationComponent.twig`, `macros.twig#navigation_item` | teilweise / abweichend | `components/layout/sidebar.tsx`, `bottom-nav.tsx` | SWU nutzt eigene SVG- bzw. Unicode-Icons statt `assets/navigation/menu_*0/1.png`. Stationen, Handel und NPC fehlen (Domänen anderer Bereiche). Zusätzlich gibt es den Eintrag „Maindesk“. „KommNet“ heißt bewusst „HoloNet“. |
| Serverzeit, Runde, Version | `serverTimeAndVersionComponent.twig`, `ServertimeComponent`, `default.js#startServerTimer` | abweichend | `sidebar.tsx#TickRing`, `hooks/use-status-bar.ts` | SWU zeigt einen Countdown bis zum nächsten Tick und „n/5“. Es fehlen die laufende Serverzeit, die Rundennummer (kein GameTurn-Modell) und Version/Changelog. |
| Komponenten nachladen | `Game/View/ShowComponent`, `ViewComponentLoader`, `outdatedComponent.twig` | abweichend | Polling alle 60 s und Socket-Events `TICK`/`COLONY_UPDATED` | In der SPA nicht 1:1 nötig. |
| Seitentitel je Modul | `ModuleEnum::getTitle`, `<title>{{PAGETITLE}}` | fehlt | `apps/frontend/index.html` (statischer Titel) | Es gibt kein `document.title` je Route. |
| Breadcrumb „/ Modul / Unterseite“ | `html/breadcrumb.twig`, `view/breadcrumbAndView.twig` | teilweise | `pages/dashboard.tsx`, `pages/database.tsx` | Keine gemeinsame Komponente (AP-12). |
| Meldungsbox (Aktionsergebnis, ab 6 Einträgen einklappbar, Weiter-Link) | `html/systeminformation.twig`, `GameController::getInfo` | abweichend | `components/Toast.tsx` (max. 3, 4 s) | Mehrzeilige Ergebnisse gehen verloren (AP-12). |
| Popup-Fenster (verschiebbar) | `html/popupWindow.twig`, `default.js` | teilweise | Einzeldialoge (`components/spacecraft/*Dialog.tsx`) | Kein gemeinsames Dialog-Primitive. |
| Tutorial (PADD-Schritte) | `Game/Action/SetTutorial`, `FinishTutorial`, `View/ShowPadd`, `ShowTutorialCloseButton`, `html/tutorial/*`, `Orm/Entity/TutorialStep`, `UserTutorial` | fehlt | — | AP-19, NEEDS-DECISION |
| Ansicht ohne Reload wechseln | `Game/Action/SwitchView`, `switchInnerContent` | abweichend | React Router | — |
| Benutzer-Farbschema (schwarz, lila, grün, gelb, rot, lcars, orange) | `UserSettingEnum::CSS_COLOR_SHEET`, `UserCssClassEnum`, `Public/static/css/*.css` | fehlt | `apps/frontend/src/styles.css` (ein Theme) | NEEDS-DECISION (AP-16) |
| Startansicht wählbar (`default_view`) | `UserSettingEnum::DEFAULT_VIEW` | teilweise | Wird in `settings.service.ts` gespeichert. | **Nirgends ausgewertet** (AP-16). |
| Realtime | `Component/Realtime/*`, `core/realtime/starmap-server.js` (Redis-Stream nur für die Sternenkarte) | abweichend (breiter) | `modules/websocket/game.gateway.ts`, `hooks/use-socket.ts`, `packages/shared/src/lib/common/index.ts#WsEventType` | Socket.io mit Raum pro User. Events: TICK, COLONY_UPDATED, COLONY_TICK_REPORT, SHIP_MOVED, COMBAT_STARTED, RESOURCE_UPDATED, SPACECRAFT_EVENT, DISTRESS_CHANGED. Die Sichtbarkeits-Streams der Karte gehören zum Kartenbereich. |
| Live-Benachrichtigung über neue PM | — | fehlt | `header.tsx` lädt Ordner nur bei Fokus | Kein Socket-Event dafür (AP-15). |
| Achievement-/Award-Box | `html/achievements.twig` | fehlt | — | Hängt an Awards (anderer Bereich). |

### 2.3 Maindesk

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Layout: links Inhalt, rechts eine 350-px-Spalte | `html/view/maindesk.twig` | teilweise | `pages/dashboard.tsx` | Das `1fr/300px`-Grid gilt nur für Kolonien und Limits. |
| Kolonielimits (Planet, Mond, Asteroid) | `maindesk/colonyLimits.twig`, `Component/Player/ColonyLimitCalculator` | voll | `pages/dashboard/DashboardLowerSections.tsx#DashboardLimits` | — |
| Crewlimit | `maindesk/crewLimit.twig`, `CrewLimitCalculator` | voll | dito | — |
| Zufälliger Online-Spieler | `maindesk/randomOnline.twig` | voll | dito (`useStableRandomPlayer`) | Gerade umgesetzt (`b37b82d`, `81b1f40`). |
| Besucher | `maindesk/visitors.twig` | — | — | In STU auskommentiert, nicht übernehmen. |
| Neue KN-Beiträge mit Markierung und Seitensprung | `maindesk/newKnPostings.twig`, `MaindeskProvider` (`MARKED_KN_ID`) | teilweise | `DashboardLowerSections.tsx#DashboardMessages` (HoloNet Top 5) | Kein Marker „neu seit zuletzt gelesen“. |
| Allianzforum (letzte Themen) | `maindesk/alliance.twig` | voll | `pages/dashboard/DashboardForum.tsx`, `/dashboard/forum-topics` | — |
| Quests | `maindesk/quests.twig`, `MaindeskProvider::setActiveQuests` | fehlt | — | Die Quest-Domäne gehört zu einem anderen Bereich. |
| Notrufe / Emergencies | `maindesk/emergencies.twig`, `setPotentialEmergencies` | teilweise (unsicher) | `pages/dashboard/DashboardAttention.tsx` | Nicht im Detail verglichen. |
| Letzte Ereignisse (optional ohne Piraten) | `maindesk/events.twig` | voll | `DashboardLowerSections.tsx#RecentEvents` | Der Piratenfilter entfällt (keine Piraten). |
| Kolonieliste | `maindesk/colonylist.twig`, `Maindesk/View/ShowColonyList` | voll | `pages/dashboard/DashboardColonies.tsx` | — |
| Schiffsbau- und Umrüstfortschritt | `html/ship/buildProgress.twig`, `retrofitProgress.twig` | teilweise | `pages/dashboard/DashboardProcesses.tsx` (nur FORSCHUNG, BAU) | AP-18 |
| Flottenübersicht | — (SWU-eigen) | zusätzlich | `pages/dashboard/DashboardFleet.tsx` | Nutzt Emoji 🔴🟡🟢 und verstößt damit gegen die Konventionen in 3.6. |

### 2.4 Tick-Jobs (nur Liste, Domänendetails in anderen Inventuren)

STU-Zeitplan (`resource/cron/TickTasks.php`, Zeitzone Europe/Berlin):
- Kolonie-, Spacecraft- und TickManager-Tick um **0, 12, 15, 18 und 21 Uhr**.
- Maintenance täglich um **03:00**.
- Process **jede Minute**.
- Pirate zwischen 12:00 und 23:59 jeweils um **:05/:15/…/:55**.
- History **stündlich um :30**.

SWU (`apps/backend/src/modules/tick/tick.service.ts`):
- `handleScheduledMainTick` läuft stündlich und ist nur in `GAME_MAIN_TICK_SCHEDULE_HOURS` aktiv (Default identisch mit STU).
- `checkBuildingCompletions` und `checkWarpArrivals` laufen minütlich.
- Idempotenz über `game_tick_states`.
- Es gilt die Serverzeitzone. Unsicher: vermutlich UTC im Container.
- Weitere periodische Jobs: `alliance/diplomacy-notification-dispatcher.service.ts` (10 s) und `alliance/alliance-banner.service.ts` (60 s).

| STU-Job | STU-Quelle | SWU-Stand | Notiz / SWU-Pfad |
|---|---|---|---|
| ColonyTick (in Gruppen): Lager/Produktion, Forschung, Migration, Crew-Begrenzung | `Tick/Colony/*` | teilweise | `colony/colony-tick-processor.service.ts#processTick`: Bauabschluss, Produktion, Bevölkerung, Fabrikation, Crew-Training, lokales Crewlimit, Schiffsbauqueue. Keine Gruppen. **Urlauber werden nicht übersprungen.** |
| SpacecraftTick-Handler: Lebenserhaltung, EPS-Check, Systemdeaktivierung, Energieverbrauch, Übernahme fertig, Astro-Kartierung fertig, Tracker, Bussard, Aggregation, Stationsbau, passive Stationsreparatur, Effekte | `Tick/Spacecraft/Handler/*`, `SpacecraftTick.php` | teilweise | `spacecraft/spacecraft.service.ts#processTick`: Bewegung, Recharge mit Deaktivierung, Schilde, Warp-Cooldown, Modul-Selbstreparatur, Kartographie-Finalisierung. Lebenserhaltung, Takeover, Tracker, Bussard, Aggregation und Stationen fehlen. |
| SpacecraftTickManager: Anomalien, Crew-Begrenzung, Rettungskapseln, NPC-Schiffe, Hüllenabbau, Anomalie-Erzeugung, Reparaturaktionen | `Tick/Spacecraft/ManagerComponent/*` | fehlt | — |
| TickManager: neue Spielrunde, Spielersperren herunterzählen, Rundenstatistik | `Tick/TickManager.php` | teilweise | `tickNumber` ist ein Zeitstempel. Rundennummer und Sperren fehlen. Statistiken über `statistics.service.ts#recordSnapshots` und `dashboard.service.ts#recordSnapshot` (abweichend). |
| Process: Gebäudebau fertig | `Tick/Process/FinishBuildJobs` | voll | `tick.service.ts#checkBuildingCompletions` |
| Process: Terraforming fertig | `FinishTerraformingJobs` | voll | dito |
| Process: Schiffsbau fertig | `FinishShipBuildJobs` | abweichend (unsicher) | `colony-shipyard.service.ts#processShipBuildQueue` läuft im Main-Tick, nicht minütlich. `completeAllBuilds` setzt `finishesAt`. Verzögerung bis zum nächsten Main-Tick ist zu prüfen. |
| Process: Umrüstung fertig | `FinishShipRetrofitJobs` | teilweise (unsicher) | `colony-shipyard.service.ts` |
| Process: passive Schiffsreparatur und Reparatur-Tasks | `FinishPassiveShipRepairJobs`, `RepairTaskJobs` | abweichend | REPAIR-Modus der Werftqueue im Main-Tick |
| Process: Schildregeneration (15 min) | `ShieldRegeneration` | abweichend | Nur im Main-Tick |
| Process: Tholianisches Netz, Piratenrunde beenden, neue Deals | `FinishTholianWebs`, `EndPirateRound`, `NewDealsInformation` | fehlt | STU-spezifisch bzw. NPC und Handel |
| Warp-Ankunft | — | SWU-eigen | `tick.service.ts#checkWarpArrivals` |
| PirateTick | `Tick/Pirate/*` | fehlt | NPC-Domäne. NEEDS-DECISION: Bekommt SWU NPC-Piraten? |
| HistoryTick: Ereigniskarte (PNG je Layer), Ionensturmkarte | `Tick/History/Component/*` | fehlt | Die Ereignisliste existiert (`events`-Modul), aber ohne Kartenbild. |
| Maintenance: DatabaseBackup | `Maintenance/DatabaseBackup` | fehlt | Eher Infrastruktur |
| Maintenance: IdleUserWarning | `Maintenance/IdleUserWarning` | fehlt | AP-06 |
| Maintenance: IdleUserDeletion | `Maintenance/IdleUserDeletion`, `Component/Player/Deletion/*` | fehlt | AP-05, AP-06 |
| Maintenance: CreateInterstellarMedia (Mining-Felder regenerieren) | dito | fehlt | Mining-Domäne |
| Maintenance: MapCycle | dito | fehlt | Kartendomäne |
| Maintenance: CreateMissingUserAwards | dito | fehlt | Awards |
| Maintenance: OldTachyonScanDeletion, OldFlightSignatureDeletion, TopFlightsReward | dito | fehlt | Keine Signaturen und kein Tachyon in SWU |
| Maintenance: OldTradeOffersDeletion, OldTradeLicenseDeletion, OrionSlaveTrade, EndLotteryPeriod | dito | fehlt | Handel |
| Maintenance: CorruptFleetDeletion, SpacecraftCorrectorHandler, ColonyCorrectorHandler | dito | fehlt | Konsistenzkorrekturen, sinnvoll als Admin-Skript |
| Maintenance: EmptyPlotDeletion | dito | fehlt | RPG-Plots |
| Maintenance: MaintenanceCrewExperienceHandler | dito | fehlt | Crew-XP fehlt (siehe `CONTEXT.md`) |
| Maintenance: BeginPirateRound, PirateWrathDecreaser | dito | fehlt | NPC |
| Maintenance: UserInformation (Hinweis-PM nach 4 und 5 Monaten wegen Noobzone) | dito | fehlt | Noobzone-Konzept in SWU unklar |
| Maintenance: GameRequestCleanUp | dito | fehlt | Kein Request-Log in SWU |
| Tick-Sperre, Transaktions-Runner, Fehlermail an Admin | `Tick/Lock/*`, `TransactionTickRunner`, `Component/Admin/Notification/FailureEmailSender` | teilweise | `game_tick_states` speichert Status und Fehler. Keine Admin-Benachrichtigung, keine Historie-Ansicht (AP-07). |
| Spielstatus TICK (Spiel während des Ticks gesperrt) | `GameStateEnum::TICK`, `Control/GameController.php` | fehlt | AP-20 |
| CLI-Kommandos | `Component/Cli/*` | teilweise | Admin-HTTP-Endpunkte statt CLI |

### 2.5 Admin

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Admin-Übersicht (Wetterbericht / Ionensturm) | `Admin/View/Overview`, `html/admin/overview.twig` | abweichend | `pages/admin.tsx` (Quick Actions und Tool-Karten) | — |
| Admin-Navigation (Spielerliste, Nachrichten, Karteneditor, Vollkarte, Livekarte, Ticks, Skripte) | `macros.twig#adminnavigation`, `html/admindefaults.twig` | abweichend | Kartenraster in `admin.tsx` und Sidebar-Einträge | — |
| Spielerliste | `Admin/View/Playerlist`, `Lib/UserlistEntry`, `playerList.twig` | teilweise | `pages/admin-users.tsx` (nur Recht MAP_EDITOR) | AP-08 |
| Spieler sperren (n Ticks, Grund) und entsperren | `Admin/Action/LockUser`, `UnlockUser`, `View/ShowUserLock`, `Orm/Entity/UserLock` | fehlt | — | AP-08 |
| Spieler blockieren (E-Mail-Hash-Sperre und Löschmarke) | `Admin/Action/BlockUser`, `Orm/Entity/BlockedUser` | fehlt | — | AP-08 |
| Massenmail | `Admin/Action/SendMassMail`, `View/MassMail` | fehlt | Bausteine: `messaging` (`sendSystem`), `mail.service.ts` | AP-10 |
| News posten | `Admin/Action/PostNews` | fehlt | — | AP-02 |
| Spielstatus setzen | `Admin/Action/SetGameState` | voll | `game-status/*`, `admin.tsx#GameStatusControl` | SWU bietet zusätzlich eine Ankündigungsnachricht. |
| Manuelle Ticks (Kolonie einzeln, Spacecraft, Process, Maintenance, Orion) und Tickseite | `Admin/Action/Ticks/*`, `View/Ticks/ShowTicks`, `ticks.twig` | teilweise | `tick/tick.controller.ts` (`admin/tick/trigger`, `admin/colony/complete-all-builds`) | AP-07 |
| Kolonie-Korrektur | `Ticks/DoColonyCorrection` | fehlt | — | Optional in AP-07 |
| Skripte (Influence Areas, BB-Codes, Awards, Crewbedarf der Baupläne, Piratenflotte, Crew erstellen, Spiegelwelt, Cache) | `Admin/Action/*`, `View/Scripts/ShowScripts`, `scripts.twig` | teilweise | `admin-ships.tsx` (Spawn), `starmap/starmap.controller.ts` admin/* | Großteils STU-spezifisch |
| Schiff aufladen (Ressourcen) | `Admin/Action/ChargeSpacecraftResources` | fehlt | `pages/admin-ships.tsx` | Kleiner Zusatz für Tests |
| Karteneditor (Felder, Systeme, Regionen, Grenzen, Effekte, Vollkarte) | `Admin/Action/Map/*`, `View/Map/*` | weitgehend (abweichend) | `pages/starmap-admin-fullmap.tsx`, `components/starmap-admin-fullmap/*`, `starmap.controller.ts` | Kartenbereich |
| Livekarte | `View/Map/LiveMap/*` | fehlt (unsicher) | — | Kartenbereich |
| Signatur-Scan | `View/ShowSignatures` | fehlt | — | Keine Signaturen in SWU |
| Rumpf-Editor | `View/RumpCreator`, `Action/CreateRump` | abweichend | `game-data`-Submodul und Baupläne in `admin-ships.tsx` | Bewusst: Inhalte kommen aus game-data. |
| Spielreset | `Component/Admin/Reset/*`, `Cli/GameResetCommand`, `PlayerDeletion::handleReset` | teilweise | `starmap.controller.ts` (`admin/world-reset/tactical`), Allianz-Reset-Einstieg (Issue 07 im Allianz-Lebenszyklus) | Kein Gesamt-Reset |
| Rechtemodell | `game->isAdmin()` (Admin-IDs in der Config), `Control/AccessCheck`, `AccessGrantedFeatureEnum` | teilweise | `auth/admin.guard.ts`, `permission.guard.ts`, `permissions.ts` (nur MAP_EDITOR) | — |
| Invite-Verwaltung | — | SWU-eigen | `pages/admin-invites.tsx` | Closed Alpha |

### 2.6 PlayerSetting (Rahmenanteil), Urlaub, Löschung

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Einstellungsseite | `html/view/options.twig`, `Module/PlayerSetting/*` | teilweise | `pages/settings.tsx`, `settings/settings.controller.ts` | — |
| Spielername ändern (BBCode) | `ChangeUserName` | abweichend | `PATCH /user/profile` (`displayName`, Klartext) | — |
| Avatar | `ChangeAvatar` | voll | `PATCH /user/avatar` (Data-URL bis ca. 250 KB in der DB) | — |
| RGB-Namensfarbe | `ChangeRgbCode` | fehlt | — | Niedrige Priorität |
| Einstellungsschalter | `UserSettingEnum` | teilweise | `settings.service.ts#SETTING_DEFAULTS` (`email_notification`, `storage_notification`, `show_pm_read_receipt`, `default_view`) | Die Werte werden gespeichert, laut grep aber **nirgends ausgewertet**. Es fehlen u. a. `show_online_status`, `inbox_messenger_style`, `rpg_behavior` und `css_color_sheet` (AP-16). |
| Crew-Rassen, Crew-Ränge | `CreateCrewRace` u. a., `ChangeCrewRankNames` | fehlt | — | Crew-Domäne |
| Urlaubsmodus aktivieren | `PlayerSetting/Action/ActivateVacation` | teilweise | `settings.service.ts#activateVacation` | STU: 7 Tage Sperre ab der letzten **Aktivierung**, danach Logout. SWU: 7 Tage ab dem **Ende** des letzten Urlaubs, kein Logout. |
| Urlaubswirkung: 48 h Vorlauf, Kolonie-Tick pausiert, Crew-Limit-Prüfung entfällt, nicht angreifbar oder abschleppbar, Name mit „(UMODE)“, Löschfrist 6 statt 3 Monate | `Orm/Entity/User.php#isVacationRequestOldEnough`, `Tick/Colony/ColonyTickManager.php`, `Lib/Interaction/CustomizedInteractionChecker.php`, `Tick/Spacecraft/ManagerComponent/CrewLimitations.php`, `RepairActions.php`, diverse `Ship/Action/*` (21 Dateien) | **fehlt** | Nur `statistics/statistic-metrics.ts` liest `vacationMode`. | AP-04 |
| Urlaub endet beim Login | `SessionLogin::updateUser` | fehlt | — | AP-04 |
| Löschung anfordern, Bestätigungsmail, Token-Bestätigung | `PlayerSetting/Action/DeleteAccount`, `Component/Player/Deletion/Confirmation/*`, `Index/Action/DeletionConfirmation` | teilweise | `settings.service.ts#requestDeletion` setzt nur `deletionMark=1`. | AP-05a |
| Löschung ausführen (ca. 22 Handler) | `Component/Player/Deletion/PlayerDeletion.php`, `Handler/*` | **fehlt** | Allianz-Einstieg vorhanden (`alliance.service.ts`, siehe Allianz-Issue 03) | AP-05 |
| Inaktivitätslöschung (3 Tage unverifiziert, 3 Monate inaktiv, 6 Monate im Urlaub, Admins ausgenommen) und Warnmails | `PlayerDeletion::handleDeleteable`, `Maintenance/IdleUserWarning` | fehlt | `auth/last-activity.service.ts` pflegt `lastActiveAt`. | AP-06 |
| Löschverbot durch Admin (Marke 3) | `UserConstants::DELETION_FORBIDDEN` | teilweise | `requestDeletion` prüft die Marke, aber es gibt keine Admin-UI, um sie zu setzen. | AP-08 |

### 2.7 Config, Control, Logging, Image

| Feature | STU-Quelle | SWU-Stand | SWU-Pfade | Notiz |
|---|---|---|---|---|
| Zentrale Konfiguration (Game, Colony, Map, Pirate, Reset, Security, E-Mail, Admin-IDs, Debug, Cache) | `Module/Config/*` | abweichend | `@nestjs/config` mit ENV (`JWT_SECRET`, `DATABASE_URL`, `SMTP_*`, `MAIL_FROM_*`, `GAME_BUILD_TIME_MULTIPLIER`, `GAME_MAIN_TICK_SCHEDULE_HOURS`) und `game-data` | Admins über `users.isAdmin`. Das JWT-Secret fällt auf `'fallback'` zurück (Sicherheitsnotiz, AP-09). |
| Debug, Benchmark, SQL-Logging | `DebugSettings`, `SqlLoggingSettings`, `Control/BenchmarkResult` | fehlt | — | Niedrige Priorität |
| Logging | `Module/Logging/*` | abweichend | Nest `Logger` | Ausreichend |
| Request-Log und IP-Tabelle | `Orm/Entity/GameRequest`, `SessionLogin::addIpTableEntry` | fehlt | — | NEEDS-DECISION (Datenschutz, Multi-Account-Erkennung) |
| Serverseitige Bilderzeugung (GD, Graphen) | `Component/Image/ImageCreation` | abweichend | Clientseitige Charts (`components/database/StackedAreaChart.tsx`), Pixi | Bewusste Abweichung |
| STU-Datum (Jahr +370) | `Control/StuTime::transformToStuDate` | abweichend | `lib/format.ts` (`de-DE`, reales Jahr) | NEEDS-DECISION (AP-13) |

## 3. Globale UI-Konventionen STU vs. SWU

Ziel: STU-typische Informationsdichte mit SWU-Mitteln (React, Tailwind v4, Theme-Tokens). Quellen: `st-universe/core/src/Public/static/css/stu.css`, `schwarz.css`, `static/js/default.js`, `src/html/macros.twig` und der aktuelle SWU-Code.

### 3.1 Farben

| Rolle | STU (Theme „schwarz“) | SWU-Token (`apps/frontend/src/styles.css`) | Regel |
|---|---|---|---|
| Seitenhintergrund | `#000000` | `--color-swu-bg #0a0e27` | SWU-Token verwenden |
| Box / Fläche | Schwarz bzw. `#1b1b1f`, Tabellengitter `#262323` | `--color-swu-surface #1a1a2e` | `bg-swu-surface` bzw. `bg-swu-surface/70` |
| Rahmen | `#4b4b4b` (`.border_box`), `#262323` (`.box`, Tabellen) | `--color-swu-border #0f3460` | Nur `border-swu-border`, keine Hex-Werte in Komponenten |
| Primärtext, Links | Links `#909090`, Hover `#c7c4c2`, Akzent- und Eingabetext `#8897cf` | `--color-swu-primary #8897cf` (identisch), `--color-swu-text #eee`, `--color-swu-muted #aaa` | Titel und Links in `text-swu-primary`, Nebenwerte in `text-swu-muted` |
| Hervorhebung | `#c2b942` (`.cfld`), `#d4c112` | `--color-swu-accent #c2b942` (identisch) | Für aktive Elemente und Fortschritt |
| Positiv / negativ | `.positive{color:Green}`, `.negative{color:Red}`, Modulhintergründe `#003806` / `#3d0000` | `--color-swu-success #4fc3f7` (**cyan**), `--color-swu-danger #b10000`, `--color-swu-warning #ff9800` | Für Bilanzen fehlen grün/rot-Tokens (AP-13). Bis dahin `text-green-500` bzw. `text-red-500` nur für +/−-Werte. |
| Header | `#262323` | `--color-swu-header #262323` ist definiert, der Header nutzt aber hart `bg-[#0d0e1b]` | Auf das Token umstellen (AP-13) |
| Logout | Hintergrund `#2d0000`, Hover `#4d0000` | neutral | Optional |

Benutzerwählbare Farbschemata: STU tauscht `--color-N`-Variablen per CSS-Datei. SWU hat ein festes Theme. Falls Schemata kommen, dann nur über die `--color-swu-*`-Tokens (AP-16).

### 3.2 Schrift und Größen

- STU: `Arial, Helvetica, Verdana, sans-serif`, Basisgröße `0.99em`. Navigation und Header bei 75–80 %. Tabellen mit `padding:3px` und `line-height:1.3em`.
- SWU: Fließtext und Daten in **IBM Plex Mono** (`--font-swu-mono`). **Cinzel** (`--font-swu-display`) für Landing, Auth und Admin-Titel.
- Regeln:
  - Spielseiten verwenden `text-xs` (Kleinstwerte `text-[10px]`).
  - Zellen haben `px-1.5 py-1` bis `px-2 py-1`.
  - Keine `text-2xl`-Titel und kein Cinzel in Spielseiten, Tabellen oder Boxen.
  - Die Admin-Seiten (`p-6`, `text-2xl`, `rounded-lg`) sind intern tolerierbar, aber kein Vorbild.

### 3.3 Boxen, Kopfzeilen, Seitenstruktur

- STU: `.box` (1 px `#262323`, Radius 3 px) mit `.box_title` (zentriert, fett, dunkler Balken). Alternativ `.divhead` + `.divbody`.
- SWU-Standard (Maindesk-Muster, **wiederverwenden**):
  - Box: `<section className="border border-swu-border bg-swu-surface/70">`
  - Kopf: `<header className="border-b border-swu-border px-3 py-2 text-xs font-bold text-swu-primary">`
  - Keine `rounded-lg`, keine Schatten, keine Glassmorphism-Effekte.
- Seitenkopf: STU zeigt über jedem Inhalt linksbündig `/ Modul / Unterseite`. SWU macht das bisher nur auf Maindesk und Datenbank (`border border-swu-border bg-black/30 px-3 py-1.5` mit `h1.text-xs.font-bold.text-swu-primary`). Regel: Jede Spielseite beginnt so. Eine gemeinsame Komponente fehlt (AP-12).
- Rahmenmaße:
  - STU: Sidebar 120 px fix, Header-Boxen 70 px, Inhalt mit `margin-top:80px`.
  - SWU: Sidebar 68 px (`md`), Header 86 px (`md`) bzw. 58 px (mobil), Bottom-Nav nur mobil.
  - Neue fixe Overlays müssen diese Offsets nutzen: `top-[58px] md:top-[86px]` und `md:ml-[68px]`.

### 3.4 Tabellen

- STU: `table.tcal` hat einen `#262323`-Hintergrund mit `border-spacing:1px`. Die Zellen sind schwarz (`padding:3px`), dadurch entsteht ein 1-px-Gitter. `th` ist dunkel, hell und zentriert. `td.selectable:hover` färbt `#1b1b1f`. Zahlen stehen rechts (`.right`). Warenicons (15–20 px) stehen vor den Mengen. Keine Zebrastreifen.
- SWU: uneinheitlich (`text-sm` bzw. `text-xs`; Zellränder nur teilweise, etwa in `components/spacecraft/ShipHeaderTable.tsx`).
- Regel für Spieltabellen:
  - `w-full border-collapse text-xs`
  - Zellen `border border-swu-border px-1.5 py-1`
  - Kopfzeile `bg-black/40 font-bold text-swu-primary text-center`
  - Zeilen `hover:bg-white/5`
  - Zahlen `font-mono text-right`
  - Keine Zebrastreifen
  - Eine gemeinsame Utility bzw. Komponente fehlt (AP-13).

### 3.5 Buttons, Links, Formulare

- STU: `.button` bzw. `a.linkbutton` mit Hintergrund `#1b1b1f`, 1 px Rahmen `#7c85a8`, Text `#8897cf`. Hover `#161515` bzw. `#3c3c3c`. Destruktiv (`linkbutton_red`) mit Hover `#b10000`. Eingaben haben einen dunklen Hintergrund und einen 1-px-Rahmen.
- SWU-Praxis (`pages/settings.tsx`): Buttons `bg-swu-accent/20 border border-swu-accent text-swu-accent text-xs font-semibold rounded hover:bg-swu-accent/30`, Eingaben `bg-swu-bg border border-swu-border rounded p-2 text-swu-primary`.
- Regeln:
  - In Spielansichten kleine Buttons (`text-xs px-2 py-1`) mit Rahmen statt Füllfläche.
  - Destruktive Aktionen rot umrandet.
  - Keine Pills, keine Verläufe.

### 3.6 Icons und Assets

- STU nutzt ausschließlich PNG/GIF-Assets aus `st-universe/assets`:
  - `navigation/menu_<name>0.png` (normal) und `…1.png` (Hover), getauscht per `cp()`
  - `buttons/*` (z. B. `notiz1/2`, `msg1/2`, `pmnavlet_<n>_0/1`, `time.png`)
  - `commodities/<id>.png`, `planets/<classId>.png`, `research/<id>.png`, `bev/*`
  - **Keine Emoji oder Unicode-Glyphen.**
- SWU:
  - Das Asset-Submodul `assets/` (`swuniverse/assets`) enthält unter `navigation/` nur doku, logout, option und ships.
  - Header und Nachrichten folgen dem STU-Muster: `/assets/buttons/...` mit Hover-Tausch per `group-hover:hidden` / `group-hover:block`.
  - Die Sidebar nutzt eigene SVGs, die Bottom-Nav Unicode (◉ △ ◫ ✦ ⚗ …), `DashboardFleet.tsx` Emoji (🔴🟡🟢).
- Regeln:
  - Neue UI nutzt `/assets/<kategorie>/<datei>`. Die Basis kommt aus `VITE_ASSET_BASE_URL`, siehe `apps/frontend/src/lib/assets.ts`.
  - Hover über das Bildpaar `…0.png` / `…1.png` mit `group-hover`.
  - Status als kleiner Punkt (`size-1.5 rounded-full bg-…`, wie bei den Header-Kolonien) oder als Asset-Icon. **Keine Emoji.**
  - Fehlende Navigations-Icons gehören nach `swuniverse/assets` (AP-14, NEEDS-DECISION zur Herkunft bzw. Lizenz).
  - Anomalie-Icons liegen unter `map/anomalies/<typ>.png` mit dem Typschlüssel in Kleinbuchstaben: `subspace_ellipse.png` und `ion_storm.png`, übernommen aus STU `anomalies/1.png` bzw. `2.png` (Freigabe Product Owner, 2026-11-12). Typen ohne Grafik zeigen in LSS und Kolonie-Sektorscan einen CSS-Ring als Fallback (tmw-K10a3).
- Größen:
  - Header-Navicons 40 px (STU) bzw. 24–32 px (SWU).
  - Warenicons 15–20 px.
  - Header-Planeten 50 px (Monde 30, Asteroiden 40).

### 3.7 Tooltips

- STU-Verhalten (`default.js#initTooltips`):
  - Tippy.js auf `[data-tippy-content]` mit `allowHTML`.
  - **Folgt dem Cursor**, Platzierung `bottom`, Offset 20 px.
  - **Ohne Verzögerung und Animation** (`delay:[0,0]`, `duration:[0,0]`).
  - Immer nur ein Tooltip offen.
  - Das Theme `light-border` ist transparent und `pointer-events:none`. Der Inhalt bringt sein Aussehen selbst mit, meist eine `table.tcal` mit `<th>`-Titelzeile.
  - Neuinitialisierung nach jedem AJAX-Nachladen.
  - Für einfache Icons überall natives `title=`.
- SWU: kein Tooltip-System. Es gibt nur natives `title=` (ca. 121 Stellen) sowie Ad-hoc-Hover-Panels in Charts und Karten (`StackedAreaChart`, `StarmapCanvas`, `FullMapCanvas`).
- Regeln:
  - Einfache Icons bekommen `title` und `aria-label`.
  - Reichhaltige Inhalte (Kolonie-Infos, Warenlisten, Modulwerte) sollen eine gemeinsame `<Tooltip>`-Komponente mit STU-Verhalten nutzen: sofort, cursorfolgend, nur einer gleichzeitig, Inhalt als kleine Tabelle mit Titelzeile, auf Touch per Tap (AP-11).
  - Bis dahin keine weiteren Ad-hoc-Hover-Panels bauen.

### 3.8 Meldungen und Feedback

- STU: Das Ergebnis jeder Aktion erscheint als Tabelle „Meldung“ oben im Inhalt (`systeminformation.twig`). BBCode ist erlaubt, ab 6 Einträgen ist die Liste einklappbar, optional mit Weiter-Link. Die Meldung bleibt bis zum nächsten Seitenwechsel stehen.
- SWU: Toasts (`useToast`, max. 3, 4 s, oben rechts) und Tick-Reports (8 s).
- Regeln:
  - Kurze Bestätigungen als Toast.
  - Mehrzeilige Ergebnisse (Kampf, Transfer, Scan, Kolonisierung) als persistente Meldungsbox im Seitenkopf (AP-12).

### 3.9 Sprache, Datum, Zahlen

- Sprache: Deutsch, Domänenbegriffe gemäß `CONTEXT.md`. Echte Umlaute verwenden. Aktuell gibt es Umschreibungen wie „Passwort aendern“, „Konto loeschen“ und „Brucke“ in `pages/settings.tsx`, `pages/login.tsx` und `pages/admin.tsx`.
- Datum:
  - STU: `d.m.<Jahr+370>` bzw. `… H:i`.
  - SWU: ausschließlich `formatDate` / `formatDateTime` aus `apps/frontend/src/lib/format.ts` verwenden (`de-DE`, reales Jahr).
- Zahlen:
  - STU: Tausenderpunkt (`numberWithThousandSeperator`), Deltas mit `+` (`addPlusCharacter`), Färbung grün/rot.
  - SWU hat noch keinen zentralen Formatter. Bis AP-13: `toLocaleString('de-DE')`.

## 4. Vorgeschlagene Arbeitspakete

Größen: S = wenige Dateien. M = ein Feature über Backend und Frontend. L = muss geteilt werden und ist bereits zerlegt.

### AP-01 Passwort vergessen / zurücksetzen — M
- **Beschreibung:**
  - Anfrage per Login-Name oder E-Mail. Die Antwort verrät nicht, ob das Konto existiert.
  - Gehashter Token mit Ablauf (z. B. 24 h) per Mail.
  - Reset-Seite setzt das neue Passwort und invalidiert das Refresh-Token.
  - Öffentliche Routen `/lost-password` und `/reset-password?token=`, Link im Login.
- **STU:** `Module/Index/Action/SendPassword/*`, `ResetPassword/*`, `View/ShowLostPassword`, `ShowResetPassword`, `html/index/lostPassword.twig`, `resetPassword.twig`.
- **SWU:** `apps/backend/src/modules/auth/*`, `modules/mail/mail.service.ts`, `apps/frontend/src/pages/login.tsx`, `app/app.tsx`.
- **Abhängigkeiten:** keine.

### AP-02 System-News — M
- **Beschreibung:**
  - Admin-Formular „News erstellen“ (Titel, Text, Links).
  - Öffentlicher Endpunkt mit den 5 neuesten News.
  - Anzeige auf Landing und Login.
- **STU:** `Admin/Action/PostNews`, `html/admin/scripts.twig`, `Component/Index/News/*`, `Index/View/Overview`, `html/index/index.twig`.
- **SWU:** `modules/holonet/*`, `pages/login.tsx`, `pages/admin.tsx`.
- **NEEDS-DECISION:** Eigene News-Entität, oder HoloNet-Beiträge der Kategorie `NEWS` von Admins, öffentlich ohne Login lesbar?

### AP-03 E-Mail-Verifikation — M
- **Beschreibung:**
  - Nach der Registrierung gilt der Status „unverifiziert“.
  - Code bzw. Link per Mail. Zugang zum Onboarding erst nach Verifikation.
  - Neusenden und Adresskorrektur.
  - Unverifizierte Konten werden nach 3 Tagen gelöscht (über AP-06).
- **STU:** `Maindesk/Action/AccountVerification`, `EmailManagement`, `Component/Player/Register/RegistrationEmailSender`, `PlayerCreator`, `PlayerSetting/Lib/UserStateEnum.php`, `html/index/accountVerification.twig`, `Control/Router/Handler/AccountNotVerifiedFallbackHandler.php`.
- **SWU:** `auth/*`, `mail/*`, `pages/register.tsx`, `components/layout/app-shell.tsx`.
- **Abhängigkeiten:** AP-01 (gemeinsamer Token-Mechanismus).
- **NEEDS-DECISION:** Schon in der Closed Alpha mit Invites oder erst zum öffentlichen Start? SMS dauerhaft weglassen?

### AP-04 Urlaubsmodus mit Spielwirkung — M (bei vielen Interaktionspfaden teilen in 04a/04b)
- **Beschreibung:**
  - Wirksam wird der Urlaub erst 48 h nach der Aktivierung (`isVacationEffective`).
  - Der Main-Tick überspringt die Kolonien wirksamer Urlauber.
  - Angriff, Traktorstrahl, Blockade und Übernahme gegen Urlauber werden zentral verhindert.
  - Ein Login beendet den Urlaub, die Aktivierung loggt aus.
  - Namensanzeige „(Urlaub)“.
  - Sperrfrist wie STU: 7 Tage ab der letzten Aktivierung.
- **Aufteilung:** 04a Tick, Login und Anzeige. 04b Interaktionsschutz.
- **STU:** `PlayerSetting/Action/ActivateVacation`, `Orm/Entity/User.php` (`isVacationRequestOldEnough`, `getName`), `PlayerSetting/Lib/UserConstants.php`, `Tick/Colony/ColonyTickManager.php`, `Tick/Spacecraft/ManagerComponent/CrewLimitations.php`, `RepairActions.php`, `Lib/Interaction/CustomizedInteractionChecker.php`, `Lib/Session/SessionLogin.php`.
- **SWU:** `settings/settings.service.ts`, `auth/auth.service.ts`, `tick/tick.service.ts`, `combat/*`, `spacecraft/*`.
- **NEEDS-DECISION:** Sollen Schiffe von Urlaubern weiter ticken (STU: ja, außer Crewlimit)? Soll die Produktion komplett pausieren (STU: ja)?

### AP-05 Kontolöschung ausführen — L, geteilt
- **AP-05a Orchestrator und Bestätigung (M):**
  - Antrag sendet eine Mail mit Token. Die Bestätigung setzt die Marke auf 2.
  - Der Login wird gesperrt („zur Löschung vorgesehen“).
  - `PlayerDeletionService` mit registrierbaren Handlern (Port-Muster wie bei der Allianzbereinigung).
  - Admin-Endpunkt „jetzt löschen“.
  - STU: `PlayerSetting/Action/DeleteAccount`, `Component/Player/Deletion/Confirmation/*`, `Index/Action/DeletionConfirmation`, `Component/Player/Deletion/PlayerDeletion.php`, `UserConstants::DELETION_*`, `SessionLogin::checkUser`.
- **AP-05b Domänen-Handler (M):**
  - Kolonien, Schiffe und Flotten.
  - Nachrichten (Absender „Gelöschter Siedler“), HoloNet, Kontakte, Notizen.
  - Kartenwissen (Systementdeckung, Kartographiepläne, Kolonie-Scans), Prestige-Historie, Invites.
  - Den Allianz-Handler an den vorhandenen Einstieg anschließen.
  - STU-Checkliste: `Component/Player/Deletion/Handler/*` (22 Handler).
- **Abhängigkeiten:** 05b nach 05a. Allianz-Lebenszyklus-Issue 03 sollte resolved sein.
- **NEEDS-DECISION:** Kolonien herrenlos bzw. als Ruine belassen oder zurücksetzen? Nachrichten anonymisieren oder löschen?

### AP-06 Inaktivitätslöschung und Warnmails — M
- **Beschreibung:**
  - Maintenance-Handler, täglich um 03:00.
  - Löscht unverifizierte Konten nach 3 Tagen, Inaktive nach 3 Monaten (`lastActiveAt`) und Urlauber nach 6 Monaten. Admins sind ausgenommen.
  - Warnmails vorab im STU-Tagesfenster.
- **STU:** `Module/Maintenance/IdleUserDeletion.php`, `IdleUserWarning.php`, `Component/Player/Deletion/PlayerDeletion.php`, `Orm/Repository/UserRepository.php#getDeleteable`, `getIdleRegistrations`.
- **Abhängigkeiten:** AP-05a/b, AP-07, AP-04 (Urlaubsfrist), optional AP-03.
- **NEEDS-DECISION:** Ab wann aktivieren (nicht in der Closed Alpha)? Fristen von STU übernehmen?

### AP-07 Maintenance-Gerüst und Tick-Admin — M
- **Beschreibung:**
  - `MaintenanceTickService` mit Handlerliste (Cron 03:00), dokumentiert in `game_tick_states` mit neuem Typ.
  - Admin-Seite „Ticks“: letzte Läufe (Typ, Status, Dauer, Fehler) und Buttons für Einzeljobs (Main, Bauabschluss, Warp, Maintenance).
  - Benachrichtigung an Admins bei FAILED.
  - Zeitzone der Crons explizit festlegen (`timeZone` bzw. `TZ`).
- **STU:** `Module/Tick/Maintenance/*`, `Module/Maintenance/services.php`, `Admin/View/Ticks/ShowTicks`, `Admin/Action/Ticks/*`, `html/admin/ticks.twig`, `Component/Admin/Notification/FailureEmailSender`, `resource/cron/TickTasks.php`.
- **SWU:** `modules/tick/*`, `pages/admin.tsx`.
- **Abhängigkeiten:** keine.
- **NEEDS-DECISION (klein):** Zeitzone Europe/Berlin wie STU?

### AP-08 Spielerverwaltung im Admin — M
- **Beschreibung:**
  - Spielerliste mit ID, Name, Fraktion, Registrierung, letzter Aktivität, Urlaub, Löschmarke und Sperre.
  - Sperren für n Haupt-Ticks mit Grund. Die Login-Meldung zeigt Resttick und Grund. Der Main-Tick zählt herunter.
  - Entsperren.
  - Blockieren: E-Mail-Hash auf die Sperrliste, die Registrierung prüft diese Liste, dazu die Löschmarke.
  - Löschverbot setzen (Marke 3).
- **STU:** `Admin/View/Playerlist`, `Admin/Lib/UserlistEntry`, `Admin/Action/LockUser`, `UnlockUser`, `BlockUser`, `Admin/View/ShowUserLock`, `html/admin/playerList.twig`, `userLock.twig`, `Tick/TickManager.php#reduceUserLocks`, `Lib/Session/SessionLogin.php#checkUser`, `Orm/Entity/UserLock`, `BlockedUser`.
- **SWU:** `pages/admin-users.tsx`, `modules/auth/*`, `tick/tick.service.ts`.
- **Abhängigkeiten:** Blockieren setzt AP-05a voraus. Sperren ist unabhängig.

### AP-09 Login- und Session-Härtung — S
- **Beschreibung:**
  - Login auch per Spieler-ID.
  - Serverseitiger Logout: Refresh-Token löschen.
  - In Produktion ohne `JWT_SECRET` nicht starten (`'fallback'` entfernen).
  - Sperr- und Löschprüfung zentral in `login` und `refresh`.
- **STU:** `Lib/Session/SessionLogin.php`, `Game/Action/Logout`.
- **SWU:** `auth/auth.service.ts`, `auth/auth.controller.ts`, `auth/jwt.strategy.ts`, `game-status/game-status.guard.ts`, `components/layout/header.tsx`.
- **Abhängigkeiten:** Die Prüfungen nutzen AP-08 und AP-05a. Mit Haken (Erweiterungspunkten) kann das Paket vorher starten.

### AP-10 Admin-Massennachricht — S
- **Beschreibung:** System-PM an alle Spieler oder an eine Fraktion, optional zusätzlich als Mail an Spieler mit `email_notification=1`.
- **STU:** `Admin/Action/SendMassMail`, `Admin/View/MassMail`, `html/admin/massMail.twig`.
- **SWU:** `modules/messaging/*`, `mail/mail.service.ts`, `pages/admin.tsx`.
- **NEEDS-DECISION:** Nur Ingame oder auch E-Mail?

### AP-11 Tooltip-Komponente im STU-Verhalten — S
- **Beschreibung:**
  - `components/Tooltip.tsx`: sofort, cursorfolgend, nur einer gleichzeitig.
  - Inhalt als `ReactNode` im Tabellenstil mit Titelzeile.
  - Bedienung per Tap auf Touch-Geräten, Portal mit passendem z-Index.
  - Erste Nutzung: Header-Kolonien mit Koordinaten, System, Energie und Lager.
- **STU:** `Public/static/js/default.js#initTooltips`, `Public/static/css/stu.css` (`.tippy-box[data-theme~="light-border"]`), `html/game/component/coloniesComponent.twig`.
- **SWU:** `components/layout/header.tsx`.
- **Abhängigkeiten:** keine.

### AP-12 Seitenkopf und persistente Meldungsbox — S
- **Beschreibung:**
  - `PageHeader` mit „/ Modul / Unterseite“; setzt `document.title`.
  - `ActionResult`: mehrzeilige Ergebnisse, ab 6 Einträgen einklappbar, mit Weiter-Link.
  - Maindesk und Datenbank als Referenz umstellen. Weitere Seiten folgen in den jeweiligen Bereichen.
- **STU:** `html/breadcrumb.twig`, `html/systeminformation.twig`, `html/view/breadcrumbAndView.twig`, `Component/Game/ModuleEnum.php`.
- **Abhängigkeiten:** keine.

### AP-13 Tokens, Tabellenstil, Formatter, Textkorrekturen — S
- **Beschreibung:**
  - Header auf das Token `swu-header` umstellen.
  - Tokens `--color-swu-positive` und `--color-swu-negative` ergänzen.
  - Spieltabellen-Utility nach 3.4.
  - `formatNumber` und `formatDelta` in `lib/format.ts`.
  - Emoji in `DashboardFleet.tsx` durch Statuspunkte ersetzen.
  - Umlaute in `settings.tsx`, `login.tsx` und `admin.tsx` korrigieren.
- **STU:** `Public/static/css/stu.css`, `schwarz.css`, `Module/Template/TemplateHelper.php`, `Module/Twig/TwigHelper.php`.
- **SWU:** `apps/frontend/src/styles.css`, `lib/format.ts`, `components/layout/header.tsx`, `pages/dashboard/DashboardFleet.tsx`.
- **NEEDS-DECISION:** In-Universe-Datum wie STU (Jahr + Offset)? Falls ja: welche Ära und welcher Offset (z. B. ABY)?

### AP-14 Navigations-Icons nach Asset-Konvention — S (Code) + Asset-Arbeit
- **Beschreibung:**
  - Sidebar und Bottom-Nav auf `navigation/menu_<x>0/1.png` mit Hover-Tausch umstellen.
  - Fehlende Icons in `swuniverse/assets` ergänzen: Kolonien, HoloNet, Nachrichten, Forschung, Allianz, Datenbank, Ereignisse, Karte, Admin.
- **STU:** `html/macros.twig#navigation_item`, `html/game/component/navigationComponent.twig`, `st-universe/assets/navigation/*`.
- **SWU:** `components/layout/sidebar.tsx`, `bottom-nav.tsx`, Submodul `assets/navigation/`.
- **NEEDS-DECISION:** STU-Icons übernehmen (Lizenz `st-universe/assets/LICENSE` prüfen) oder eigene Star-Wars-Icons? Die Assets liegen in einem eigenen Repo.

### AP-15 Header-Navlets vervollständigen — S
- **Beschreibung:**
  - Ordner mit Ungelesenen nutzen das hervorgehobene Asset `pmnavlet_<n>_1`.
  - Neues Socket-Event `MESSAGE_RECEIVED` aktualisiert die Zähler live.
  - „Neue Nachricht schreiben“ in der Userbox.
  - Forschungs-Navlet mit Bild, Warenicon, +Produktion pro Tick und Badge „+1“.
  - Alle Kolonien mit Tooltip.
  - Laufende Serverzeit im Sidebar-Fuß.
- **STU:** `html/game/component/pmComponent.twig`, `researchComponent.twig`, `coloniesComponent.twig`, `userComponent.twig`, `serverTimeAndVersionComponent.twig`.
- **SWU:** `components/layout/header.tsx`, `sidebar.tsx`, `modules/dashboard/dashboard.service.ts#getHeader`, `modules/messaging/*`, `packages/shared/src/lib/common/index.ts` (`WsEventType`).
- **Abhängigkeiten:** AP-11 für die Tooltips.

### AP-16 Benutzereinstellungen wirksam machen — S
- **Beschreibung:**
  - `default_view` wird nach dem Login bzw. auf `/` ausgewertet.
  - `email_notification` gilt beim Mailversand.
  - `storage_notification` gilt für Tick-Reports.
  - `show_pm_read_receipt` gilt in Messaging.
- **STU:** `Module/PlayerSetting/Lib/UserSettingEnum.php`, `Component/Player/Settings/UserSettingsProvider.php`.
- **SWU:** `settings/settings.service.ts`, `pages/settings.tsx`, `app/app.tsx`, `modules/messaging/*`, `colony/colony-tick-processor.service.ts`.
- **NEEDS-DECISION (Folgepaket):** Wählbare Farbschemata wie STU?

### AP-17 Impressum, Datenschutz, Hilfe — S
- **Beschreibung:** Öffentliche Seiten mit Footer-Links auf Landing und Login.
- **STU:** `Index/View/ShowImprint`, `ShowHelp`, `ShowPartnerSites`, `html/index/impressum.twig`, `help.twig`, `partnerSites.twig`.
- **NEEDS-DECISION:** Die Inhalte (Betreiberangaben) muss der Betreiber liefern. Ein Agent kann nur das Gerüst bauen.

### AP-18 Maindesk-Restparität — S
- **Beschreibung:**
  - Neue HoloNet-Beiträge seit dem letzten Lesen markieren.
  - Prozessliste um Schiffsbau, Reparatur und Umrüstung erweitern.
  - Rechte Spalte (ca. 350 px) für Limits, Online-Spieler und Fortschritt.
- **STU:** `html/view/maindesk.twig`, `html/maindesk/newKnPostings.twig`, `html/ship/buildProgress.twig`, `retrofitProgress.twig`, `Module/Game/Lib/View/Provider/MaindeskProvider.php`.
- **SWU:** `pages/dashboard.tsx`, `pages/dashboard/*`, `modules/holonet` (`new-count`).
- **Abhängigkeiten:** keine. Das Quest-Widget kommt erst mit der Quest-Domäne.

### AP-19 Tutorial-System — L (nur nach Entscheidung)
- **Beschreibung:** PADD-Tutorial pro Modul mit Fortschritt je Spieler. Zurücksetzen und Abschalten in den Einstellungen.
- **STU:** `Game/Action/SetTutorial`, `FinishTutorial`, `Game/View/ShowPadd`, `ShowTutorialCloseButton`, `Control/Component/TutorialProvider.php`, `Orm/Entity/TutorialStep.php`, `UserTutorial.php`, `PlayerSetting/Action/CreateTutorials`, `DeleteTutorials`, `html/tutorial/*`, `Public/static/js/tutorial.js`.
- **NEEDS-DECISION:** Ist ein Tutorial gewünscht, oder genügen Onboarding und Wiki?
- **Aufteilung bei Zusage:** 19a Modell und API, 19b Overlay-UI, 19c Inhalte.

### AP-20 Spielstatus „Tick läuft“ — S
- **Beschreibung:**
  - Während des Main-Ticks gilt der Status TICK.
  - Schreibende Spieleraktionen erhalten 503 mit „Tick läuft“. Admins sind ausgenommen.
  - Banner in der App-Shell.
- **STU:** `Component/Game/GameStateEnum.php`, `Module/Control/GameController.php`.
- **SWU:** `modules/game-status/*`, `tick/tick.service.ts`, `components/layout/app-shell.tsx`.
- **NEEDS-DECISION:** Sperre wie STU, oder parallele Aktionen mit DB-Locking?

### Nicht als eigenes Paket empfohlen

- **STU-spezifisch oder obsolet:** SMS-Verifikation, Referer-Tracking, Benchmark, PHP-Cache-Reset, GameRequest-Log, Spiegelwelt, Rumpf-Editor (Inhalte kommen aus game-data), Tholianisches Netz, Orion-Sklavenhandel.
- **Domänen anderer Inventuren:** Pirate-Tick, History-Kartenbild und Ionensturm, Mining-Regeneration, MapCycle, Awards, Flugsignaturen und Tachyon, Handel und Lotterie, Crew-XP. AP-07 liefert dafür nur den Einhängepunkt.
- **Datenbank-Backup:** gehört in die Infrastruktur (pg_dump-Cron), nicht in die App. NEEDS-DECISION beim Betreiber.

## Unsicherheiten

- Es ist offen, ob Schiffsbau, Umrüstung und Reparatur in SWU nur im Main-Tick abgeschlossen werden. Gesehen wurde `processShipBuildQueue` im Kolonie-Tick, weitere Pfade wurden nicht vollständig geprüft.
- Die Zeitzone des SWU-Cron (Container) wurde nicht geprüft.
- `DashboardAttention` wurde nur oberflächlich mit STU `emergencies.twig` verglichen.
- Die Lizenz der STU-Assets wurde nicht geprüft.
- Es wurde nicht geprüft, wer HoloNet-Beiträge der Kategorie `NEWS` anlegen darf.
- Die Auswertung der Einstellungen wurde per grep geprüft. Indirekte Nutzung (dynamische Schlüssel) ist nicht völlig ausgeschlossen.
