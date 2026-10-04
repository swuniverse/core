# STU Allianzsystem – Funktionaler Katalog (Referenz für identischen Nachbau)

Quelle: `st-universe/core` (PHP). Alle Pfadangaben sind relativ zum STU-Repo-Root, Format `pfad:zeile` bzw. `pfad:von-bis`.
Status: Snapshot vom 2026-10-02. Es wird nur STU beschrieben, keine swuniverse-Designs.

Konventionen in diesem Dokument:
- „AV“ = `AccessViolationException` (harter Abbruch, keine Info-Meldung an den Nutzer).
- „Info“ = `$game->getInfo()->addInformation(...)`, eine Meldung, die dem Nutzer angezeigt wird.
- „PM“ = Private Message über `PrivateMessageSender::send(sender, recipient, text, folder = SPECIAL_SYSTEM)` (`src/Module/Message/Lib/PrivateMessageSender.php:33-43`). Wichtig: Ist `sender === recipient`, wird **keine** PM verschickt (`PrivateMessageSender.php:41-43`).
- `USER_NOONE` = System-Absender mit der User-ID 1 (`src/Module/PlayerSetting/Lib/UserConstants.php:12`).
- „Allianz-Rundschreiben“ = `AllianceActionManager::sendMessage(allianceId, text)`. Das schickt eine PM von `USER_NOONE` an **jedes Mitglied** der Allianz (`src/Module/Alliance/Lib/AllianceActionManager.php:91-102`).
- `hasPerm(X)` = `AllianceJobManager::hasUserPermission(user, alliance, X)`. Die Semantik steht in §3.2.

---

## 1. Überblick

Das Allianzsystem von STU umfasst: Spielerverbände (Allianzen) mit optionaler Fraktionsbindung; Gründung, Bewerbung, Aufnahme, Austritt, Rauswurf, Auflösung; ein frei konfigurierbares Rollen- und Rechtesystem („Jobs“ mit Permissions, Präsident/Vize/Diplomat als Eltern-Rechte); ein internes Allianzforum (Boards → Topics → Posts); Diplomatie zwischen Allianzen (Krieg, Frieden, Freundschaft, Bündnis, Handel, Vasall) als Angebots-/Annahme-Zustandsmaschine mit Relation-Permissions („als Freund behandeln“, „Live-Karten-Positionen teilen“) und Vertragstexten. Dazu kommen Diplomatie-Abkommen zwischen einer Allianz und allianzlosen Siedlern (dieselbe `stu_relations`-Tabelle), eine öffentliche Allianzliste und Detailseite mit BBCode-Beschreibung und Platzhaltervariablen, ein Diplomatie-Graph (GraphViz), interne Verwaltungsansichten (Kolonien, Schiffe, Crew und Depots der Mitglieder) sowie Querschnittseffekte: Freund/Feind-Bestimmung (Alarmstufen, Kampfreaktion, Transfer, Schilde), Dockrechte, Wurmlochrechte, Handelsposten-Zugang, Sternenkarte (Territorialfarbe, Sichtbarkeit von Allianzschiffen, Live-Positionen), geteilte Kolonie-Scans, Piratenrunden-Prestige, Allianz-Depots und Historieneinträge.

---

## 2. Datenmodell

Alle Tabellen außer `stu_alliance_posts`, `stu_alliance_topics`, `stu_alliance_settings` und `stu_relation_permissions` tragen das Attribut `#[TruncateOnGameReset]` und werden beim Spiel-Reset geleert.

### 2.1 `stu_alliances` – Entity `Alliance` (`src/Orm/Entity/Alliance.php`)

| Feld | Typ | Default/Constraint | Zitat |
|---|---|---|---|
| id | int, IDENTITY | PK | `Alliance.php:27-30` |
| name | string (VARCHAR 255) | `''`, NOT NULL, **kein Unique** | `Alliance.php:32-33`, `src/Migrations/Sqlite/Version20260915191824.php:47` |
| description | text | `''` | `Alliance.php:35-36` |
| homepage | string | `''` | `Alliance.php:38-39` |
| date | int (Unix-TS der Gründung) | 0 | `Alliance.php:41-42` |
| faction_id | int, nullable → FK `stu_factions` | null = keine Fraktionsallianz | `Alliance.php:44-45, 56-58` |
| accept_applications | bool | **false** | `Alliance.php:47-48` |
| avatar | string(32) | `''` (md5-Dateiname ohne `.png`) | `Alliance.php:50-51` |
| rgb_code | string(7) | `''` | `Alliance.php:53-54` |

Relationen:
- `settings`: OneToMany `AllianceSettings` (`Alliance.php:63-64`)
- `members`: OneToMany `User` über `stu_user.allys_id` (`Alliance.php:69-70`; Gegenseite `src/Orm/Entity/User.php:79-81`, Index `user_alliance_idx` `User.php:28`)
- `jobs`: OneToMany `AllianceJob` (`Alliance.php:75-76`)
- `stations`: OneToMany `Station` über `stu_station.ally_id` (`Alliance.php:81-82`; `src/Orm/Entity/Station.php:33, 59-61`)

Abgeleitete Methoden:
- `getFounder()`: erster Job mit Permission FOUNDER. Gibt es keinen, wird `AllianceFounderNotSetException` geworfen (`Alliance.php:193-201`).
- `getSuccessor()`: erster Job mit SUCCESSOR **und ohne** FOUNDER, sonst null (`Alliance.php:203-214`).
- `getDiplomatic()`: erster Job mit DIPLOMATIC, ohne FOUNDER und ohne SUCCESSOR, sonst null (`Alliance.php:216-228`).
- `isNpcAlliance()`: true, wenn irgendein User im Gründer-Job NPC ist (`Alliance.php:271-286`).
- `hasTranslation()`: Die Beschreibung enthält `[translate]` und `[/translate]` (`Alliance.php:301-305`).
- `hasAvatar()`: avatar !== '' (`Alliance.php:163-166`).

### 2.2 `stu_alliances_jobs` – `AllianceJob` (`src/Orm/Entity/AllianceJob.php`)
| Feld | Typ | Zitat |
|---|---|---|
| id | int PK | `:25-28` |
| alliance_id | FK, NOT NULL, ON DELETE CASCADE | `:30-32` |
| title | string, nullable | `:34-35` |
| sort | int, nullable | `:37-38` |

- `memberAssignments`: OneToMany `AllianceMemberJob`, cascade remove (`:43-44`)
- `permissions`: OneToMany `AllianceJobPermission`, cascade persist+remove (`:49-50`)
- `hasPermission(int)` (`:112-120`), `getUsers()` (`:125-131`), `hasUser()` (`:133-141`), `getUser()` = **erster** zugewiesener User oder null (`:143-147`).
- Mehrere User pro Job sind möglich (n:m über `stu_alliance_member_job`).

### 2.3 `stu_alliance_job_permission` – `AllianceJobPermission`
id PK; job_id FK NOT NULL ON DELETE CASCADE; permission int (Wert aus `AllianceJobPermissionEnum`) (`src/Orm/Entity/AllianceJobPermission.php:22-32`). Es gibt keinen Unique-Index auf (job, permission).

### 2.4 `stu_alliance_member_job` – `AllianceMemberJob`
id PK; user_id FK NOT NULL ON DELETE CASCADE; job_id FK NOT NULL ON DELETE CASCADE (`src/Orm/Entity/AllianceMemberJob.php:22-33`). Es gibt keinen Unique-Index. Doppelte Zuweisungen verhindert nur `AllianceJobManager::assignUserToJob` per Lookup (`src/Module/Alliance/Lib/AllianceJobManager.php:20-33`).

### 2.5 `stu_alliance_applications` – `AllianceApplication`
id PK; alliance_id FK CASCADE; user_id FK CASCADE; date int (`src/Orm/Entity/AllianceApplication.php:22-36`). Es gibt keinen Unique-Index. „Eine Bewerbung pro User und Allianz“ wird nur über den Checker sichergestellt (§4.2).

### 2.6 `stu_alliance_settings` – `AllianceSettings`
id PK; setting string-Enum `AllianceSettingsEnum`; value string `''`; alliance_id FK CASCADE (`src/Orm/Entity/AllianceSettings.php:21-34`). Werte: `founder_description`, `successor_description`, `diplomatic_description` (`src/Component/Alliance/AllianceSettingsEnum.php:9-11`). **Es gibt keinen Schreibpfad im Code** (siehe §11).

### 2.7 Forum
- `stu_alliance_boards` – `AllianceBoard`: id; alliance_id int (FK CASCADE); name string `''`; Index `alliance_idx` (`src/Orm/Entity/AllianceBoard.php:22-54`). `topics` OneToMany; `posts` OneToMany, sortiert nach date DESC (`:42-50`). `getLatestPost()` = erster Post (neuester) (`:93-100`). `getPostCount()` = Summe über die Topics (`:84-91`).
- `stu_alliance_topics` – `AllianceBoardTopic`: id; board_id FK CASCADE; alliance_id FK CASCADE; name string; last_post_date int; user_id FK CASCADE (Ersteller); sticky bool **false** (`src/Orm/Entity/AllianceBoardTopic.php:22-61`). Indizes `recent_topics_idx(alliance_id,last_post_date)`, `ordered_topics_idx(board_id,last_post_date)` (`:23-24`). `posts` OneToMany, date DESC (`:66-68`). `getPages()`: bei mehr als 20 Posts ein Array Seite→Offset, sonst null (`:147-160`).
- `stu_alliance_posts` – `AllianceBoardPost`: id; topic_id FK CASCADE; board_id FK CASCADE; name string `''`; date int; text text; user_id FK CASCADE; lastedit int nullable (`src/Orm/Entity/AllianceBoardPost.php:17-59`). Indizes `topic_date_idx`, `board_date_idx` (`:18-19`).

### 2.8 Diplomatie: `stu_relations` – `Relation` (`src/Orm/Entity/Relation.php`)
Eine gemeinsame Tabelle für Allianz↔Allianz, Allianz↔User und User↔User.

| Feld | Typ | Default | Zitat |
|---|---|---|---|
| id | int PK | | `:36-39` |
| type | smallint-Enum `AllianceRelationTypeEnum` | FRIENDS | `:41-42` |
| date | int | **0 = ausstehendes Angebot (pending)**, >0 = aktiv seit | `:44-45`, `isPending()` `:100-103` |
| text | text nullable (Vertragswerk) | null | `:51-52` |
| last_edited | int nullable | null | `:54-55` |
| source_user_id / source_alliance_id | FK nullable, **kein CASCADE** | | `:57-63` |
| recipient_user_id / recipient_alliance_id | FK nullable, kein CASCADE | | `:65-71` |

Indizes auf allen vier Party-Spalten (`:25-28`). Invarianten aus `RelationPartyTrait::validateParties()`, geprüft bei jedem `save` (`src/Orm/Repository/RelationRepository.php:23-27`):
- Genau eine Ausgangspartei (User XOR Allianz), genau eine Zielpartei, und die Parteien müssen verschieden sein (`src/Component/Alliance/Relations/Trait/RelationPartyTrait.php:75-93`).
- Bei Allianz-Relationen heißt `getAlliance()` = Quelle und `getOpponent()` = Ziel (`RelationPartyTrait.php:122-150`).
- `isSourceParty(user)` / `isRecipientParty(user)`: Der User ist selbst die Partei oder ist Mitglied der Partei-Allianz (`:95-113`).
- `hasText()`: text != null und trim != '' (`Relation.php:137-140`).

### 2.9 `stu_relation_permissions` – `RelationPermission` (`src/Orm/Entity/RelationPermission.php`)
| Feld | Typ | Default | Zitat |
|---|---|---|---|
| permission | smallint-Enum `RelationPermissionEnum` | – | `:28-29` |
| direction | smallint-Enum `RelationPermissionDirectionEnum` | MUTUAL | `:31-32` |
| pending | bool | false | `:34-35` |
| granted | bool | true | `:37-38` |
| offeredBySource | bool | false | `:40-41` |
| relation_id | FK nullable → stu_relations (kein CASCADE) | | `:43-45` |
| contact_id | FK nullable → stu_contactlist | | `:47-49` |

Invariante: genau eins von relation oder contact ist gesetzt (`:133-140`). `isGrantedTo(user)`: Bei MUTUAL immer true, sonst nur für die Zielpartei (`:142-149`).

Aktive Rechte sind `pending=false && granted=true`. Ausstehende Rechteänderungen sind Zeilen mit `pending=true`; `granted` steht dann für „soll gesetzt/entfernt werden“ (§5.6).

### 2.10 Externe Spalten mit Allianzbezug
- `stu_user.allys_id` → Mitgliedschaft (`src/Orm/Entity/User.php:41, 79-81`).
- `stu_station.ally_id` → Allianz-Depot-Zuordnung (`src/Orm/Entity/Station.php:33, 59-61`).
- `stu_docking_privileges` mit `privilege_type = 2 (ALLIANCE)`, target = alliance id (`src/Component/Station/Dock/DockTypeEnum.php:10`).
- Wurmloch-Restriktionen mit `WormholeEntryTypeEnum::ALLIANCE = 2` (`src/Component/Ship/Wormhole/WormholeEntryTypeEnum.php:10`).
- `stu_history.type = 4 (ALLIANCE, Anzeigename „Diplomatie“)` (`src/Component/History/HistoryTypeEnum.php:12, 21`).

### 2.11 Enums
- `AllianceJobPermissionEnum` (`src/Component/Alliance/Enum/AllianceJobPermissionEnum.php:9-22`): FOUNDER=1 „Präsident“, SUCCESSOR=2 „Vize“, DIPLOMATIC=3 „Diplomat“, CREATE_AGREEMENTS=4, EDIT_DIPLOMATIC_DOCUMENTS=5, ALLIANCE_LEADERSHIP=6, EDIT_ALLIANCE=7, MANAGE_APPLICATIONS=8, MANAGE_JOBS=9, VIEW_COLONIES=10, VIEW_MEMBER_DATA=11, VIEW_SHIPS=12, VIEW_ALLIANCE_STORAGE=13, VIEW_ALLIANCE_HISTORY=14. Beschreibungen `:24-42`.
  - Eltern: CREATE_AGREEMENTS und EDIT_DIPLOMATIC_DOCUMENTS → DIPLOMATIC; die Werte 6–14 → SUCCESSOR; FOUNDER, SUCCESSOR und DIPLOMATIC haben keine Eltern (`:52-61`). `getChildPermissions()` (`:71-91`). `isEditable()`: FOUNDER false (`:44-50`, im Code nicht genutzt). Kategorien (`:93-103`).
- `AllianceJobTypeEnum` FOUNDER=1, SUCCESSOR=2, DIPLOMATIC=3, PENDING=4 (`src/Component/Alliance/Enum/AllianceJobTypeEnum.php`). **Wird nirgends verwendet** (Legacy).
- `AllianceRelationTypeEnum` (`src/Component/Alliance/Enum/AllianceRelationTypeEnum.php:9-14`): WAR=1 „Krieg“, PEACE=2 „Friedensabkommen“, FRIENDS=3 „Freundschaftabkommen“ (sic, Schreibfehler im Original), ALLIED=4 „Bündnis“, TRADE=5 „Handelsabkommen“, VASSAL=6 „Vasall“ (`:16-26`). Farben (`:47-57`), Bildnamen (`:63-72`), `getPossibleTypes()` (`:31-45`, siehe §5.2).
- `RelationPermissionEnum` (`src/Component/Alliance/Enum/RelationPermissionEnum.php`): FRIENDLY=1 „Als Freund behandeln“, SHARE_LIVE_MAP_POSITIONS=2 „Schiffspositionen auf der Live-Karte teilen“ (`:9-18`). Bitmaske. Verfügbarkeit: FRIENDLY für TRADE, FRIENDS, VASSAL, ALLIED; SHARE nur für ALLIED (`:20-35`). `sanitize(bits, type)` entfernt nicht verfügbare Bits (`:37-47`).
- `RelationPermissionDirectionEnum`: MUTUAL=1, SOURCE_TO_RECIPIENT=2 (`src/Component/Alliance/Enum/RelationPermissionDirectionEnum.php`). Bei Relationen wird immer MUTUAL verwendet; SOURCE_TO_RECIPIENT nur bei Kontakten (`src/Orm/Repository/RelationPermissionRepository.php:43-82`).

### 2.12 Repository-Abfragen (verhaltensrelevant)
- `AllianceRepository::findAllOrdered()` sortiert nach id ASC (`src/Orm/Repository/AllianceRepository.php:38-44`); `findByApplicationState(bool)` sortiert nach id ASC (`:47-53`).
- `AllianceApplicationRepository::getByAlliance` sortiert nach date ASC (`src/Orm/Repository/AllianceApplicationRepository.php:38-46`).
- `AllianceBoardTopicRepository::getByBoardIdOrdered` sortiert nach sticky DESC, last_post_date DESC (`src/Orm/Repository/AllianceBoardTopicRepository.php:56-62`); `getRecentByAlliance(limit=3)` nach last_post_date DESC (`:40-47`).
- `AllianceBoardPostRepository::getByTopic(topic, limit, offset)` nach date ASC (`src/Orm/Repository/AllianceBoardPostRepository.php:50-58`).
- `RelationRepository` (`src/Orm/Repository/RelationRepository.php`):
  - `getActive()`: date>0, beide Parteien Allianzen, id ASC (`:56-61`)
  - `getByAlliance(id)`: alle Allianz↔Allianz-Relationen der Allianz, auch pending (`:76-82`)
  - `getByAlliancePair` richtungsunabhängig (`:85-91`)
  - `getPendingCountByAlliances` richtungsunabhängig (`:93-105`)
  - `getActiveByAlliance` (`:108-114`)
  - `getActiveByAlliancePair` und `getActiveByTypeAndAlliancePair` mit `getOneOrNullResult` (`:116-154`)
  - `getActiveByParties` richtungsunabhängig, für User oder Allianz (`:122-138`)
  - `getByUserAndAlliance(user, alliance?)`: Relationen mit Beteiligung des Users bzw. der Allianz, **aber nur, wenn mindestens eine Partei ein User ist** (`:157-170`)
  - `truncateByAlliance` (`:40-45`), `truncateByAlliances(a,b)` (`:47-53`). `delete*` löscht vorher die zugehörigen Permissions (`:29-33, 248-276`).

---

## 3. Rollen & Rechte

### 3.1 Rollenmodell
- Rollen sind frei definierbare `AllianceJob`s mit Titel, Sortierung und Permissions. Ein User kann mehrere Jobs haben, ein Job mehrere User.
- Bei der Gründung entsteht genau ein Job „Präsident“, sort=1, mit den Permissions FOUNDER, SUCCESSOR und DIPLOMATIC; der Gründer wird zugewiesen (`src/Module/Alliance/Action/CreateAlliance/CreateAlliance.php:62-91`).
- „Präsident“ ist der Job mit FOUNDER. „Vize“ ist der erste Job mit SUCCESSOR und ohne FOUNDER. „Diplomat“ ist der erste Job mit DIPLOMATIC und ohne FOUNDER/SUCCESSOR (§2.1).
- Default-Bezeichnungen, falls kein Setting existiert: „Präsident“, „Vize-Präsident“, „Außenminister“ (`src/Module/Game/Lib/View/Provider/AllianceProvider.php:195-208`). In der UI werden sie nicht verwendet (§11).

### 3.2 Rechte-Auflösung `hasUserPermission(user, alliance, perm)` (`src/Module/Alliance/Lib/AllianceJobManager.php:89-109`)
Für jeden Job des Users **in genau dieser Allianz** (`getUserJobs`, gefiltert über `job.alliance.id`, `:74-86`):
1. Hat der Job FOUNDER → true (der Präsident darf alles).
2. Hat der Job `perm` → true.
3. Hat der Job die Eltern-Permission von `perm` (SUCCESSOR bzw. DIPLOMATIC) → true.

Sonst false. Daraus folgt:
- SUCCESSOR impliziert die Rechte 6–14, DIPLOMATIC impliziert 4 und 5.
- Wer **alle** Kinder hat, aber das Elternrecht nicht, besteht eine Prüfung auf SUCCESSOR bzw. DIPLOMATIC **nicht**. SaveJobs normalisiert diesen Fall allerdings zum Elternrecht (§4.8).
- Ein normales Mitglied ohne Job hat keine Rechte.

Twig-Helfer `hasAlliancePermission(int|array)`: true, wenn der User in einer Allianz ist und mindestens eine der übergebenen Permissions per `hasUserPermission` erfüllt (`src/Module/Twig/TwigHelper.php:212-216, 268-291`).

### 3.3 Sessioncheck (CSRF-Token `sstr`)
Aktionen mit `performSessionCheck() = false` brauchen kein `sstr`: AddBoard (`AddBoard.php:60-63`), ChangeAvatar (`ChangeAvatar.php:118-121`), CreateRelation (`CreateRelation.php:120-123`), DeleteAvatar (`DeleteAvatar.php:63-66`), SetTopicSticky (`SetTopicSticky.php:42-45`), UnsetTopicSticky (`UnsetTopicSticky.php:42-45`). Alle anderen verlangen ein gültiges `sstr` (`src/Module/Control/AccessCheck.php:50-77`).

### 3.4 Matrix Aktion × Rolle (serverseitige Prüfung)

Legende: P = Präsident (FOUNDER), V = Job mit SUCCESSOR, D = Job mit DIPLOMATIC, „x“ = darf, „–“ = darf nicht, M = beliebiges Mitglied ohne Job, N = Nichtmitglied. Einzelrechte: CA=4, EDD=5, EA=7, MA=8, MJ=9.

| Aktion (Identifier) | Serverprüfung | P | V | D | M | N | Zitat |
|---|---|---|---|---|---|---|---|
| Allianz gründen `B_CREATE_ALLIANCE` | keine (nur Name ≥ 5) | – | – | – | x (!) | x | `CreateAlliance.php:35-47` |
| Bewerben `B_SIGNUP_ALLIANCE` | `mayApply` | – | – | – | – | x | `Signup.php:40-42` |
| Bewerbung annehmen `B_ACCEPT_APPLICATION` | MA | x | x | – | – | – | `AcceptApplication.php:46-52` |
| Bewerbung ablehnen `B_DECLINE_APPLICATION` | MA | x | x | – | – | – | `DeclineApplication.php:37-39` |
| Austreten `B_LEAVE_ALLIANCE` | Mitglied | x (!) | x | x | x | – | `Leave.php:30-34` |
| Rauswerfen `B_KICK_USER` | MJ, Ziel in eigener Allianz | x | x | – | – | – | `KickPlayer.php:42-50` |
| Befördern `B_PROMOTE_USER` | MJ; Founder-Job zusätzlich FOUNDER | x | x (nicht in den Founder-Job) | – | – | – | `PromotePlayer.php:41-64` |
| Degradieren `B_DEMOTE_USER` | MJ, Ziel ≠ selbst | x | x | – | – | – | `DemotePlayer.php:45-57` |
| Rollen speichern `B_SAVE_ALLIANCE_JOBS` | MJ | x | x | – | – | – | `SaveJobs.php:43-45` |
| Details editieren `B_UPDATE_ALLIANCE` | EA | x | x | – | – | – | `EditDetails.php:49-51` |
| Avatar hochladen/löschen | EA | x | x | – | – | – | `ChangeAvatar.php:34-36`, `DeleteAvatar.php:33-35` |
| Allianz löschen `B_DELETE_ALLIANCE` | FOUNDER oder SUCCESSOR | x | x | – | – | – | `DeleteAlliance.php:38-43` |
| Forum anlegen `B_ADD_BOARD` | EA | x | x | – | – | – | `AddBoard.php:37-39` |
| Forum umbenennen/löschen | **nur Mitgliedschaft** | x | x | x | x | – | `RenameBoard.php:29-32`, `DeleteBoard.php:24-27` |
| Thema erstellen / Beitrag schreiben | Mitgliedschaft | x | x | x | x | – | `CreateTopic.php:47-50`, `CreatePost.php:39-42` |
| Thema umbenennen/löschen/sticky | **nur Mitgliedschaft** | x | x | x | x | – | `RenameTopic.php:29-32`, `DeleteTopic.php:27-30`, `SetTopicSticky.php:27-30`, `UnsetTopicSticky.php:27-30` |
| Beitrag editieren/löschen | **nur Mitgliedschaft** | x | x | x | x | – | `EditPost.php:25-32`, `DeletePost.php:30-37` |
| Abkommen anbieten / Krieg erklären `B_NEW_RELATION` | CA | x | – | x | – | – | `CreateRelation.php:48-54` |
| Angebot annehmen `B_ACCEPT_OFFER` | D oder EDD oder CA | x | – | x | – | – | `AcceptOffer.php:56-74` |
| Angebot ablehnen `B_DECLINE_OFFER` | CA | x | – | x | – | – | `DeclineOffer.php:40-46` |
| Angebot zurückziehen `B_CANCEL_OFFER` | D oder EDD oder CA | x | – | x | – | – | `CancelOffer.php:53-71` |
| Vertrag lösen `B_CANCEL_CONTRACT` | D oder EDD oder CA | x | – | x | – | – | `CancelContract.php:43-61` |
| Frieden vorschlagen `B_SUGGEST_PEACE` | CA | x | – | x | – | – | `SuggestPeace.php:39-48` |
| Vertragstext bearbeiten `B_EDIT_RELATION_TEXT` | EDD | x | – | x | – | – | `EditRelationText.php:46-52` |
| User-Abkommen `B_MANAGE_USER_RELATION` | Mitglied + je nach Unteraktion CA bzw. (CA oder D oder EDD) | x | – | x | – | – | `ManageUserRelation.php:34-37`, `src/Component/Player/Relation/UserRelationAccessChecker.php:68-90` |

Ansichten:

| Ansicht | Prüfung | Zitat |
|---|---|---|
| Liste / Details (Default-View) | keine, öffentlich | `src/Module/Game/Lib/View/Provider/AllianceProvider.php:40-60` |
| Gründen `CREATE_ALLIANCE` | nur ohne Allianz (sonst AV) | `View/Create/Create.php:20-22` |
| Bewerbungen `SHOW_APPLICATIONS` | MA | `View/Applications/Applications.php:32-34` |
| Verwaltung `SHOW_MANAGEMENT` | eins von SUCCESSOR, DIPLOMATIC, MJ, 10, 11, 12, 13; sonst stilles return | `View/Management/Management.php:56-66` |
| Editieren `EDIT_ALLIANCE` | EA | `View/Edit/Edit.php:28-30` |
| Diplomatie `SHOW_RELATIONS` | D oder EDD oder CA | `View/Relations/Relations.php:43-61` |
| Vertragstext bearbeiten (View) | EDD + Beteiligung | `View/EditRelationText/EditRelationText.php:39-55` |
| Vertragstext anzeigen | **keine** | `View/ShowRelationText/ShowRelationText.php:21-37` |
| Diplomatie-Graph | keine (öffentlich) | `View/Diplomatic/DiplomaticRelations.php:29-55` |
| Forum-Ansichten | Mitglied und Objekt in eigener Allianz | `View/Boards/Boards.php:21-24`, `View/Board/Board.php:26-34`, `View/Topic/Topic.php:32-46` usw. |
| Mitgliedskolonie | Mitglied, gleiche Allianz, VIEW_COLONIES | `View/ShowMemberColonyInfo/ShowMemberColonyInfo.php:38-59` |
| Mitglieds-Rumpfinfo | eins von 2, 3, 9, 10, 11, 12, 13 in der Allianz des Mitglieds | `View/ShowMemberRumpInfo/ShowMemberRumpInfo.php:46-61` |

UI-Gating (nur Anzeige) auf der Detailseite (`src/html/view/alliance.twig:9-35`):
- Forum-Link: Mitglied.
- „Diplomatie“: `hasAlliancePermission([4,5])`.
- „Editieren“: 7.
- „Bewerbungen“: 8.
- „Verwaltung“: `[9,10,11,12,13]`.
- „Allianz verlassen“: `CAN_LEAVE_ALLIANCE` = Mitglied und nicht FOUNDER (`AllianceProvider.php:89`).
- „Bewerben“: `CAN_SIGNUP` = `mayApply` (`AllianceProvider.php:90-93`).

---

## 4. Lebenszyklus

### 4.1 Gründung `B_CREATE_ALLIANCE` (`src/Module/Alliance/Action/CreateAlliance/CreateAlliance.php`)
Request (`CreateAllianceRequest.php`):
- `name`: required, `tidyString` = `trim(strip_tags())` (`src/Lib/Request/CustomControllerHelperTrait.php:33-38`).
- `description`: required, tidyString.
- `factionid`: int, Default 0.

Ablauf:
1. `mb_strlen(name) < 5` → View CREATE_ALLIANCE, Info „Der Name muss aus mindestens 5 Zeichen bestehen“, Abbruch (`:43-47`).
2. Neue Allianz mit name, description und date=time(). Ist `factionid === 1`, wird faction = Fraktion des Users gesetzt (`:49-55`). Danach save und flush.
3. `removeRelationsForAllianceEntry(user, alliance, isAllianceCreation=true)` (`:60`). Alle Relationen, an denen der User als **User-Partei** beteiligt ist, werden gelöscht. Pro Relation geht der Text „Der Siedler {user} hat die Allianz {name} gegründet. Das {Typ} mit {Die Allianz X|Der Siedler Y} entfällt.“ an beide Parteien (an eine Allianz als Rundschreiben) (`src/Component/Player/Relation/UserRelationAllianceEntryManager.php:18-38`).
4. Job „Präsident“, sort 1, Permissions FOUNDER, SUCCESSOR, DIPLOMATIC (`:62-86`).
5. `user.alliance = alliance`, Zuweisung zum Job (`:88-92`). Info „Die Allianz wurde gegründet“ (`:96`).

Nicht geprüft:
- ob der User bereits in einer Allianz ist (nur der View prüft das, `View/Create/Create.php:20-22`),
- Eindeutigkeit des Namens,
- BBCode-Balance, Unicode und Maximallänge (anders als beim Editieren, §4.7),
- Kosten (es gibt keine).
Offene Bewerbungen des Gründers bleiben bestehen. `accept_applications` ist nach der Gründung false.

### 4.2 Bewerbung `B_SIGNUP_ALLIANCE` (`Signup.php`)
Parameter `id` (Allianz). Existiert die Allianz nicht → stilles return (`:35-38`). Ist `mayApply` false → AV (`:40-42`).

`AllianceUserApplicationChecker::mayApply` (`src/Component/Alliance/AllianceUserApplicationChecker.php:21-36`) ist true genau dann, wenn:
- noch keine Bewerbung des Users bei dieser Allianz existiert,
- die Allianz `accept_applications = true` hat,
- der User in **keiner** Allianz ist,
- und (die Allianz hat keine Fraktion **oder** die Fraktion des Users gleich der Allianzfraktion ist).

Danach: Bewerbung mit date=time() anlegen, flush, refresh. PM **vom Bewerber** „Der Siedler {name} hat sich für die Allianz beworben“ an alle User des Founder-Jobs und an alle User des ersten Successor-Jobs (`:44-69`). Info „Deine Bewerbung für die Allianz wurde abgeschickt“. Bewerbungen bei mehreren Allianzen gleichzeitig sind erlaubt.

### 4.3 Bewerbung annehmen `B_ACCEPT_APPLICATION` (`AcceptApplication.php`)
Parameter `aid`. Bedingungen: Mitglied mit MA, die Bewerbung existiert und gehört zur eigenen Allianz; sonst AV (`:40-57`).
1. `removeRelationsForAllianceEntry(applicant, alliance)` mit dem Text „… ist der Allianz {name} beigetreten …“ (`:60`; Text `UserRelationAllianceEntryManager.php:24-32`).
2. `applicant.alliance = alliance` (`:61`). Es wird **nicht** geprüft, ob der Bewerber inzwischen in einer anderen Allianz ist (§11).
3. Alle anderen Bewerbungen des Bewerbers werden gelöscht. Pro gelöschter Bewerbung geht eine PM von `USER_NOONE` „Der Siedler {name} wurde bei einer anderen Allianz aufgenommen“ an die Founder- und Successor-User **der anderen Allianz** (`:83-111`).
4. Die Bewerbung wird gelöscht. PM **vom Annehmenden** an den Bewerber: „Deine Bewerbung wurde akzeptiert - Du bist jetzt Mitglied der Allianz {name}“ (`:68-77`).
5. Info „Die Bewerbung wurde angenommen“, View SHOW_APPLICATIONS.

### 4.4 Bewerbung ablehnen `B_DECLINE_APPLICATION` (`DeclineApplication.php`)
Prüfungen wie oben (MA, Zugehörigkeit). Die Bewerbung wird gelöscht. PM von `USER_NOONE`: „Deine Bewerbung bei der Allianz {name} wurde abgelehnt“. Info „Die Bewerbung wurde abgelehnt“ (`:31-58`).
Automatisches Ablehnen: Wer `accept_applications` auf 0 setzt, lehnt **alle** offenen Bewerbungen mit derselben PM ab (`EditDetails.php:89-104`).

### 4.5 Austritt `B_LEAVE_ALLIANCE` (`Leave.php`)
Ohne Allianz → `SanityCheckException` (`:31-34`).
1. Den User aus allen Jobs dieser Allianz entfernen.
2. Seine Stationen mit `ally_id = alliance` auf null setzen.
3. `user.alliance = null` (`:37-45`).
4. PM **vom Austretenden** „Der Siedler {name} hat die Allianz verlassen“ an Founder- und Successor-User (`:47-62`).
5. View = Allianz-Default, Info „Du hast die Allianz verlassen“.

Keine Sperre für den Präsidenten (nur die UI blendet aus, `AllianceProvider.php:89`). Verlässt der Präsident die Allianz, bleibt sie ohne besetzten Founder-Job bestehen. Verlässt das letzte Mitglied die Allianz, bleibt sie mit 0 Mitgliedern bestehen. Es gibt **keine** automatische Auflösung (§11).

### 4.6 Rauswurf `B_KICK_USER` (`KickPlayer.php`)
Parameter `uid`. Bedingungen: MJ; Ziel existiert und ist in der eigenen Allianz; sonst AV (`:42-50`).
1. Ziel aus der members-Collection entfernen.
2. `isKickedPlayerFounder = hasUserPermission(**actor**, alliance, FOUNDER)` (`:54`). Ist der Handelnde Präsident, wird das Ziel aus dem Founder-Job entfernt und der Handelnde (erneut) hinzugefügt (`:56-60`). Siehe Bug in §11.
3. Stationen des Ziels von der Allianz lösen; das Ziel aus allen Jobs entfernen; `alliance = null` (`:62-72`).
4. PM von `USER_NOONE`: „Deine Mitgliedschaft in der Allianz {name} wurde beendet“. Info „Der Siedler wurde rausgeworfen“, View SHOW_MANAGEMENT.

Kein serverseitiges Verbot, sich selbst oder den Präsidenten zu kicken. Die UI zeigt den Button nur, wenn das Ziel nicht Präsident und nicht man selbst ist (`src/Module/Alliance/View/Management/ManagementListItem.php:90-94`, `src/html/alliance/alliancemanagement.twig:83-90`).

### 4.7 Details editieren `B_UPDATE_ALLIANCE` (`EditDetails.php`)
Request (`EditDetailsRequest.php`):
- `name` required
- `homepage`, `description` Default ''
- `factionid` int 0
- `acceptapp` int 0
- `rgb` **required**
- `job_id_*` / `job_title_*` für founder, successor und diplomatic
Alle Strings gehen durch tidyString.

Ablauf in exakter Reihenfolge:
1. EA, sonst AV (`:49-51`).
2. `CleanTextUtils::checkBBCode(name)`: Für die Tags b, i, u und color muss die Zahl öffnender und schließender Tags gleich sein (`src/Lib/CleanTextUtils.php:25-47`). Sonst Info „Der Name enthält ungültige BB-Code Formatierung“, Abbruch (`:53-57`).
3. `clearEmojis` (Konvertierung UTF-8→ISO-8859-15//IGNORE, Whitespace-Folgen werden zu einem Leerzeichen) (`CleanTextUtils.php:9-15`). Ändert `clearUnicode` (entfernt `&#123;`-Entities) den Namen → Info „Der Name enthält ungültigen Unicode“, Abbruch (`:59-64`).
4. `mb_strlen(name) > 255` → Info „Der Name darf inklusive BBCode nur maximal 255 Zeichen lang sein“, Abbruch (`:66-71`).
5. View EDIT_ALLIANCE (`:79`).
6. **Fraktionsmodus**, wenn `mayEditFactionMode(alliance, user.factionId)` gilt: Ist die Allianzfraktion null → true. Sonst true nur, wenn **alle** Mitglieder die factionId des Editors haben (`AllianceActionManager.php:105-118`). Dann bei factionid==1 faction = Fraktion des Users, sonst null (`:81-87`).
7. **Bewerbungen**: acceptapp==1 → true. Sonst false, und alle offenen Bewerbungen werden abgelehnt und gelöscht, mit PM (`:89-104`).
8. Validierung: Hat der BBCode-befreite Text des Namens nach trim weniger als 5 Zeichen → Info „Der Name muss aus mindestens 5 Zeichen bestehen“, Abbruch (`:106-109`).
9. Ist die Homepage nicht leer und beginnt nicht mit `http` → Info „Diese Homepage-Adresse ist nicht gültig“, Abbruch (`:111-114`).
10. RGB: Ist der Wert nicht leer, muss `strlen === 7` gelten (sonst Info „Der RGB-Code muss sieben Zeichen lang sein, z.B. #11ff67“) und der Regex `/^#?(([a-f0-9]{3}){1,2})$/i` passen (sonst „Der RGB-Code ist ungültig!“). Dann wird gesetzt (`:116-128`, `:161-164`). Ein leerer Wert ändert **nichts**; der Farbcode lässt sich also nicht löschen.
11. Jobtitel über `job_id_*` und `job_title_*` (`:130-132`, `:143-159`): Ist die ID 0 oder der Titel leer, wird übersprungen. Ist `strlen(title) < 3`, gibt es die Info „Alle Postenbeschreibungen müssen mindestens 3 Zeichen lang sein“, die Verarbeitung läuft **aber weiter**. Gehört der Job zur Allianz, wird der Titel gesetzt. Das Edit-Template sendet diese Felder nicht (`src/html/alliance/allianceEdit.twig`), der Pfad ist faktisch tot.
12. name, homepage und description werden gesetzt und gespeichert. Info „Die Allianz wurde editiert“ (`:134-140`).

Wichtig für die Identität des Nachbaus: Die Schritte 6 und 7 verändern die gemanagte Entity **vor** den Validierungen 8 bis 10. Da nach jeder Action `flush()` läuft (`src/Module/Control/Component/CallbackExecution.php:50-53`), bleiben Fraktions- und Bewerbungsänderungen samt Ablehnungs-PMs auch dann erhalten, wenn die Namens-, Homepage- oder RGB-Validierung danach scheitert.

### 4.8 Rollen verwalten `B_SAVE_ALLIANCE_JOBS` (`SaveJobs.php`)
Voraussetzung MJ (`:43-45`). Parameter `jobs` = JSON-Array, Default `'[]'` (`SaveJobsRequest.php:14-17`). Das Frontend sendet `[{id, title, sort: index+1, permissions:[int]}]` (`src/Public/static/js/ally.js:329-384`); neue Jobs haben IDs mit dem Präfix `new_`.
- Kein Array → Info „Fehlerhafte Daten übermittelt“ (`:49-54`).
- Pro Eintrag: Fehlt id, title oder sort → überspringen. Ist `strlen(trim(title)) < 3` → Info „Alle Rollenbezeichnungen müssen mindestens 3 Zeichen lang sein“, **Abbruch der ganzen Verarbeitung**. Bereits verarbeitete Einträge bleiben gespeichert (neue Jobs wurden schon geflusht) (`:64-77`).
- `new_*` → neuen Job mit Titel, Sort und bereinigten Permissions anlegen (`:79-90`).
- Bestehender Job der Allianz: Titel und Sort setzen. Founder-Job: Sort wird immer 1, die Permissions bleiben **unverändert**. Sonst werden alle Permissions gelöscht und neu gesetzt (`:92-116`).
- Bestehende Jobs, die nicht im Payload stehen und keine Founder-Jobs sind, werden gelöscht. Die Mitgliedszuordnungen fallen per Cascade weg (`:120-124`).
- `cleanPermissions` (`:160-232`):
  - nur gültige Enum-Werte,
  - Kind-Rechte entfallen, wenn das Elternrecht gesetzt ist,
  - sind **alle** Kinder von SUCCESSOR bzw. DIPLOMATIC gesetzt, werden sie durch das Elternrecht ersetzt,
  - Deduplizierung.
  FOUNDER (1) wird **nicht** herausgefiltert (§11).
- Info „Die Allianz-Rollen wurden gespeichert“.

Hinweis: Die Rollen-UI liegt in der Edit-Ansicht (EA), Speichern erfordert aber MJ.

### 4.9 Befördern `B_PROMOTE_USER` (`PromotePlayer.php`)
Parameter `type` (job id) und `uid`. Bedingungen: MJ; der Job gehört zur Allianz; der Spieler ist in der Allianz; sonst AV (`:41-57`).
- Ist der Zieljob der Founder-Job, muss der Handelnde FOUNDER haben (sonst AV). Alle bisherigen Founder-User werden aus dem Founder-Job entfernt; ist der Handelnde darunter, verliert er die Gründerrechte (`:59-73`).
- Der Beförderte wird aus **allen** Jobs der Allianz entfernt und dem Zieljob zugewiesen (`:75-76`). Ein User hat danach also genau einen Job.
- View: Verliert der Handelnde die Gründerrechte → Allianz-Default, sonst SHOW_MANAGEMENT (`:78-82`).
- PM **vom Handelnden**: „Du wurdest zum {jobTitle} der Allianz {name} ernannt“. Info „Das Mitglied wurde befördert“ (`:84-92`).
- Selbstbeförderung ist serverseitig nicht verboten.
- In der UI werden nur Jobs mit `sort >= minimalem sort des Handelnden` angeboten (`View/Management/Management.php:30-43, 93-106`). Jobs mit sort=null erscheinen nie. Der Server prüft diese Hierarchie **nicht**.

Gründer-Nachfolge (Founder-Übergabe): Der Präsident befördert jemanden in den Founder-Job; das ist der einzige manuelle Weg. Automatische Nachfolge gibt es nur beim Löschen des Spielers (§4.12).

### 4.10 Degradieren `B_DEMOTE_USER` (`DemotePlayer.php`)
Parameter `uid`. Bedingungen: MJ; das Ziel existiert, ist ≠ der Handelnde und in der eigenen Allianz; sonst AV (`:45-57`). Das Ziel wird aus allen Jobs entfernt. PM vom Handelnden: „Du wurdest von Deinem Posten in der Allianz {name} entbunden“. Info „Das Mitglied wurde von seinem Posten enthoben“ (`:59-72`). Der Präsident ist nicht geschützt. Die UI zeigt den Button nicht beim Präsidenten (`alliancemanagement.twig:66-81`) und nur bei Mitgliedern mit Job (`ManagementListItem.php:84-88`).

### 4.11 Löschen/Auflösen `B_DELETE_ALLIANCE` (`DeleteAlliance.php`)
Ohne Allianz → RuntimeException. Ohne FOUNDER und ohne SUCCESSOR → AV (`:31-43`). Danach `AllianceActionManager::delete(alliance)` (`src/Module/Alliance/Lib/AllianceActionManager.php:43-88`):
1. Alle Relationen mit der Allianz als Quelle oder Ziel werden gelöscht, samt Permissions. Das gilt für Allianz- **und** User-Relationen (`:45`).
2. Docking-Privilegien vom Typ ALLIANCE mit target=allianceId werden gelöscht (`:46-49`).
3. Alle Allianz-Stationen bekommen `alliance = null` (`:51-54`).
4. Jedes Mitglied bekommt eine PM von `USER_NOONE` „Die Allianz {name} wurde aufgelöst“ (wenn `sendMessage` true ist, Default) und `alliance = null` (`:56-66`).
5. Die Avatar-Datei wird gelöscht. Schlägt das fehl → RuntimeException (`:68-81`).
6. Alle Jobs werden gelöscht (Cascade auf Permissions und Zuordnungen), danach die Allianz selbst (`:83-87`). Boards, Topics, Posts, Bewerbungen und Settings fallen per FK `ON DELETE CASCADE` weg (§2).
7. Danach in der Action: `user.alliance = null`, Info „Die Allianz wurde gelöscht“ (`DeleteAlliance.php:45-51`).

Nicht bereinigt werden Wurmloch-Restriktionen vom Typ ALLIANCE (§11). In der UI gibt es zur Bestätigung nur einen JS-Zwischenklick (`allianceEdit.twig:75-84`).

### 4.12 Automatische Auflösung / Nachfolge beim Spielerlöschen
`AllianceDeletionHandler::delete(user)` (`src/Component/Player/Deletion/Handler/AllianceDeletionHandler.php:23-54`). Er läuft im Rahmen von `PlayerDeletion` (Reihenfolge: nach `UserRelationDeletionHandler` und `ContactDeletionHandler`, `src/Component/Player/services.php:65-89`). Auslöser sind die Wartung `IdleUserDeletion` (`src/Module/Maintenance/IdleUserDeletion.php`) und das Admin-Script `src/admin/scripts/deleteUser.php`.
- Kein FOUNDER: Entfernen aus allen Jobs. Die Mitgliedschaft wird hier nicht explizit gelöst (`:51-53`).
- FOUNDER: Entfernen aus members, `alliance = null`. Neuer Gründer (`findNewFounder`, `:59-82`):
  1. User des ersten Successor-Jobs, davon der mit der höchsten `lastActionTimestamp`,
  2. sonst User des ersten Diplomat-Jobs,
  3. sonst das zuletzt aktive verbleibende Mitglied.
  - Ermittelt wird mit `> maxLastAction` (Startwert 0) (`:87-104`).
  - Kein Kandidat → `AllianceActionManager::delete(alliance)` mit PMs an die restlichen Mitglieder (`:41-45`).
  - Sonst: Founder-Job vom Alten auf den Neuen übertragen, nachdem der Neue aus allen Jobs entfernt wurde (`:47-50`).

### 4.13 Spiel-Reset
`AllianceReset::unsetUserAlliances()` setzt `UPDATE stu_user SET allys_id = null` (`src/Component/Admin/Reset/Alliance/AllianceReset.php:16-23`). Danach werden alle `TruncateOnGameReset`-Entities geleert (`src/Component/Admin/Reset/ResetManager.php:70-73`).

---

## 5. Diplomatie

### 5.1 Relationstypen
Siehe §2.11. Alle Relationen sind **gerichtet** gespeichert (Quelle → Ziel). Fachlich richtungsabhängig ist nur VASSAL: Die Quelle ist der Lehnsherr, das Ziel der Vasall (Text in `AcceptOffer.php:115-126`, `AllianceRelationWrapper.php:24-29`). Zustände: **pending** (date=0) und **aktiv** (date>0). Krieg wird ohne Angebot sofort aktiv.

### 5.2 Allianz↔Allianz: Aktionen und Zustandsmaschine

**Anlegen `B_NEW_RELATION`** (`CreateRelation.php:37-117`). Parameter `oid` (Gegenallianz), `type`, Permissions (`relation_permissions` als Bitmaske, plus `relation_permission_{1|2}` = Wert, beides wird ODER-verknüpft, `CreateRelationRequest.php:27-40`).
1. Mitglied mit CA, sonst AV.
2. Gegenallianz fehlt oder ist die eigene, oder der Typ ist ungültig → stilles return (`:60-64`). **PEACE ist hier serverseitig erlaubt**; die UI bietet nur WAR, FRIENDS, ALLIED, TRADE und VASSAL an (`View/Relations/Relations.php:70-76`).
3. Permissions per `sanitize` für den Typ bereinigen.
4. Gibt es zwischen den beiden Allianzen (richtungsunabhängig) ≥ 2 pending Relationen → Info „Es gibt bereits ein Angebot für diese Allianz“ (`:67-71`).
5. Existiert zwischen den Allianzen (beliebige Richtung, pending oder aktiv) eine Relation **desselben Typs** (`:73-95`):
   - pending → stilles return;
   - gleiche aktive Rechte → stilles return;
   - sonst **Rechteänderung anbieten** über `UserRelationManager::proposePermissionChange`, bei Erfolg Info „Die Rechteänderung wurde angeboten“ (§5.6).
6. WAR → `WarDeclaredEvent`, Info „Der Allianz {name} wurde der Krieg erklärt“ (`:97-106`).
7. Andere Typen → `DiplomaticRelationProposedEvent`, Info „Das Abkommen wurde angeboten“ (`:107-116`).

Event-Listener, registriert in `src/Component/Game/services.php:23-40`:
- WarDeclared → `DiplomaticRelationProposalCreationSubscriber::onWarDeclaration` (`src/Component/Alliance/Event/Listener/DiplomaticRelationProposalCreationSubscriber.php:29-48`):
  - löscht **alle** Relationen zwischen den beiden Allianzen in beiden Richtungen, auch pending und auch laufende Verträge,
  - legt WAR mit date=time() und ohne Permissions an,
  - schickt ein Rundschreiben an alle Mitglieder der Gegenallianz: „Die Allianz {A} hat Deiner Allianz den Krieg erklärt“.
- WarDeclared → `HistoryEntrySubscriber::onWarDeclaration`: Historie „Die Allianz {A} hat der Allianz {B} den Krieg erklärt“, Quelle = erklärender User, Ziel = Allianz B (`src/Component/History/Event/HistoryEntrySubscriber.php:20-32`).
- DiplomaticRelationProposed → `onRelationProposal`: legt eine pending Relation (date 0) mit den bereinigten Permissions an (MUTUAL) und schickt ein Rundschreiben an die Gegenallianz: „Die Allianz {A} hat Deiner Allianz ein Abkommen angeboten“ (`Subscriber.php:53-92`).

Historieneinträge mit einem Allianzziel landen beim **ersten Präsidenten-User** der Zielallianz. Ist der Founder-Job unbesetzt, entsteht kein Eintrag (`src/Module/History/Lib/EntryCreator.php:32-39`).

**Vertragstyp wechseln**: Für eine aktive Nicht-Kriegsrelation zeigt die UI ein Select mit `getPossibleTypes()` (`src/html/alliance/alliancerelations.twig:103-118`). Das Absenden ist ein neues `B_NEW_RELATION`. Bei anderem Typ entsteht ein pending Angebot; bei Annahme wird die bestehende aktive Relation ersetzt (siehe AcceptOffer). `getPossibleTypes()` (`AllianceRelationTypeEnum.php:31-45`):
- ≠ FRIENDS → Freundschaft
- ≠ ALLIED → Bündnis
- ≠ TRADE → Handelsabkommen **und** Vasall

Also: Aus TRADE ist kein Wechsel zu VASSAL möglich, und bei VASSAL steht Vasall doppelt in der Liste (§11).

**Annehmen `B_ACCEPT_OFFER`** (`AcceptOffer.php:32-135`), Parameter `al`:
- Existiert die Relation und ist **nicht pending** → Pfad Rechteänderung annehmen: `UserRelationManager::acceptPermissionChange`. Die Info lautet je nach Ergebnis „Die Rechteänderung wurde angenommen“ oder „… kann nicht angenommen werden“ (`:46-54`). Dieser Pfad läuft **vor** der Job-Rechteprüfung der Action, ist aber über den AccessChecker abgesichert (§5.6).
- Sonst: D/EDD/CA erforderlich, sonst AV (`:56-74`). Die Relation muss existieren, als Ziel die eigene Allianz haben und pending sein; sonst stilles return (`:76-82`).
- Eine bestehende **aktive** Relation zwischen dem Paar wird gelöscht (`getActiveByAlliancePair`) (`:84-90`). Ein Friedensangebot ersetzt so den Krieg.
- date=time().
- Historie, Ziel = Gegenpartei (die annehmende Allianz):
  - Nicht-VASSAL: „Die Allianzen {Quelle} und {Ziel} sind ein {Typ} eingegangen“
  - VASSAL: „Die Allianz {Ziel} ist nun Vasall der Allianz {Quelle}“ (`:102-126`)
- Rundschreiben an die andere Allianz: „{Typ} abgeschlossen!\nDie Allianz {eigene} hat hat das Angebot angenommen“ (doppeltes „hat“ im Original) (`:96-132`).
- Info „Das Angebot wurden angenommen“ (sic).

**Ablehnen `B_DECLINE_OFFER`** (`DeclineOffer.php:29-79`), Parameter `al` per `request::getIntFatal`:
- **CA erforderlich, vor allem anderen** (`:40-46`).
- Nicht pending → `declinePermissionChange` (Info „Die Rechteänderung wurde abgelehnt“ bzw. „… kann nicht abgelehnt werden“).
- Pending, Ziel = eigene Allianz → löschen. Rundschreiben an die Quelle: „{Typ} wurde von der Allianz {eigene} abgelehnt“. Info „Das Angebot wurden abgelehnt“.

**Zurückziehen `B_CANCEL_OFFER`** (`CancelOffer.php:30-101`):
- Nicht pending → `cancelPermissionChange` (Info „Die Rechteänderung wurde zurückgezogen“ bzw. „… kann nicht zurückgezogen werden“). Das läuft vor der Job-Rechteprüfung.
- Sonst D/EDD/CA erforderlich. Die Relation muss als **Quelle** die eigene Allianz haben und pending sein; sonst stilles return.
- Löschen. PM von `USER_NOONE` „Die Allianz {eigene} hat das Angebot zurückgezogen“ **nur** an den ersten User des Founder-Jobs und den ersten User des Diplomat-Jobs der Gegenallianz, nicht als Rundschreiben (`:83-98`).
- Info „Das Angebot wurde zurückgezogen“.

**Vertrag lösen `B_CANCEL_CONTRACT`** (`CancelContract.php:30-119`):
- D/EDD/CA erforderlich.
- Die Relation muss die eigene Allianz in beliebiger Rolle betreffen, darf **nicht WAR** und **nicht pending** sein; sonst stilles return.
- Löschen. Rundschreiben an die andere Allianz: „Die Allianz {eigene} hat das {Typ} aufgelöst“.
- Historie: Nicht-VASSAL „Das {Typ} zwischen den Allianzen {Q} und {Z} wurde aufgelöst“; VASSAL „Die Allianz {Z} ist nicht mehr Vasall der Allianz {Q}“.
- Info „Das Abkommen wurde aufgelöst“.
- Ein aktiver PEACE kann so gelöst werden (zurück zu „keine Relation“).

**Frieden vorschlagen `B_SUGGEST_PEACE`** (`SuggestPeace.php:28-100`), Parameter `al`:
- Die Relation fehlt oder CA fehlt → AV.
- Die Gegenseite wird aus der Relation bestimmt. Existiert eine **aktive** PEACE-Relation (date>0) zwischen dem Paar → Info „Der Allianz wird bereits ein Friedensabkommen angeboten“ (`:50-62`). Die Prüfung findet keine pending Angebote (§11).
- Die Relation muss die eigene Allianz betreffen und vom Typ WAR sein; sonst stilles return.
- Neue PEACE-Relation, pending (date 0), Quelle = eigene Allianz, ohne Permissions (`:75-86`).
- Rundschreiben an die Gegenseite: „Die Allianz {eigene} hat Deiner Allianz ein Friedensabkommen angeboten“. Info „Der Frieden wurde angeboten“.
- Es gibt keine Pending-Obergrenze. Wiederholtes Vorschlagen erzeugt mehrere PEACE-Angebote.
- Die Annahme läuft über `B_ACCEPT_OFFER` und löscht den Krieg (s. o.).

**Zustandsdiagramm Allianz↔Allianz (Paar A, B)**

```
keine ──B_NEW_RELATION(T≠WAR)──► pending(T, A→B) ──B_ACCEPT_OFFER(B)──► aktiv(T)  [ersetzt vorherige aktive Relation]
                                     │──B_DECLINE_OFFER(B)──► gelöscht
                                     └──B_CANCEL_OFFER(A)───► gelöscht
beliebig ──B_NEW_RELATION(WAR)──► aktiv(WAR)  [löscht ALLE Relationen des Paars, beide Richtungen]
aktiv(WAR) ──B_SUGGEST_PEACE──► + pending(PEACE) ──ACCEPT──► aktiv(PEACE)  [WAR gelöscht]
aktiv(T≠WAR) ──B_CANCEL_CONTRACT (A oder B)──► gelöscht
aktiv(T) ──B_NEW_RELATION(T, andere Rechte)──► aktiv(T)+pending Rechteänderung (§5.6)
aktiv(T) ──B_NEW_RELATION(T'≠T)──► aktiv(T) + pending(T')  [max. 2 pending pro Paar]
aktiv(WAR) kann nicht per CANCEL_CONTRACT beendet werden (nur Frieden).
```

Zeitliche Regeln: Es gibt **keine** Cooldowns, Mindestlaufzeiten oder Ablaufzeiten für Angebote oder Verträge. `date` wird nur angezeigt („seit …“).

### 5.3 Vertragstexte
- Bearbeiten `B_EDIT_RELATION_TEXT` (`src/Module/Alliance/Action/EditRelationText/EditRelationText.php:37-83`):
  - EDD erforderlich, sonst AV.
  - `relationid` (Default 0) und `text` (tidyString, keine Längengrenze) (`EditRelationTextRequest.php`).
  - Relation fehlt → return. Betrifft sie die eigene Allianz nicht (Objektidentität) → AV.
  - Gilt auch für pending und WAR.
  - text und last_edited=time() setzen.
  - PM von `USER_NOONE` im Ordner SPECIAL_SYSTEM: „Der Vertragstext für das {Typ} zwischen [b]{A}[/b] und [b]{B}[/b] wurde von [b]{Editor}[/b] ({id}) bearbeitet.“ an alle User des Founder-Jobs, des ersten Successor-Jobs und des ersten Diplomat-Jobs **beider** Allianzen (`:85-137`).
  - Info „Der Vertragstext wurde erfolgreich bearbeitet“.
- Anzeigen `SHOW_RELATION_TEXT`: ohne jede Berechtigungsprüfung, Popup mit BBCode und nl2br (`View/ShowRelationText/ShowRelationText.php:21-37`, `src/html/alliance/showRelationText.twig`). Verlinkt wird auf der öffentlichen Detailseite bei aktiven Relationen mit Text (`src/html/view/alliance.twig:105-110`).

### 5.4 Benachrichtigungen (Übersicht)

| Ereignis | Empfänger | Absender | Text | Zitat |
|---|---|---|---|---|
| Kriegserklärung | alle Mitglieder Ziel | NOONE | „Die Allianz %s hat Deiner Allianz den Krieg erklärt“ | `Subscriber.php:44-47` |
| Angebot | alle Mitglieder Ziel | NOONE | „Die Allianz %s hat Deiner Allianz ein Abkommen angeboten“ | `Subscriber.php:67-73` |
| Annahme | alle Mitglieder der anderen | NOONE | „%s abgeschlossen!\nDie Allianz %s hat hat das Angebot angenommen“ | `AcceptOffer.php:96-132` |
| Ablehnung | alle Mitglieder Quelle | NOONE | „%s wurde von der Allianz %s abgelehnt“ | `DeclineOffer.php:70-76` |
| Rückzug | Founder-User[0] und Diplomat-User[0] Ziel | NOONE | „Die Allianz %s hat das Angebot zurückgezogen“ | `CancelOffer.php:83-98` |
| Vertrag gelöst | alle Mitglieder der anderen | NOONE | „Die Allianz %s hat das %s aufgelöst“ | `CancelContract.php:80-90` |
| Friedensangebot | alle Mitglieder der anderen | NOONE | „Die Allianz %s hat Deiner Allianz ein Friedensabkommen angeboten“ | `SuggestPeace.php:88-97` |
| Vertragstext | Founder/Successor/Diplomat-Jobs beider | NOONE | s. §5.3 | `EditRelationText.php:95-136` |

### 5.5 Allianz↔Siedler- und Siedler↔Siedler-Abkommen (`UserRelation`)
Gemeinsame Logik in `src/Component/Player/Relation/*`.

**Vertretungsrechte** (`UserRelationAccessChecker.php`):
- `getRepresentedParty(user)`: ohne Allianz der User selbst; mit Allianz die Allianz, falls CA, sonst null (`:16-24`).
- `canManageRelations`: ohne Allianz true; sonst CA oder D oder EDD (`:26-31, 77-90`).
- `canCreateForParty`: User-Partei = man selbst und allianzlos; Allianz-Partei = die eigene Allianz und CA (`:33-41`).
- `canRepresentParty`: wie oben, aber mit Manage-Recht (CA, D oder EDD) (`:43-51`).
- `hasValidParties`:
  - User↔User: verschieden, beide allianzlos.
  - Allianz→User: Der User ist allianzlos.
  - User→Allianz: Der User ist allianzlos.
  - Allianz↔Allianz ist hier **nicht** erlaubt (`:53-66`; auch `UserRelationCreator.php:55-57` wirft).

**Einstiegspunkte**:
- Allianzseite `B_MANAGE_USER_RELATION` (`ManageUserRelation.php`). Parameter `ura` ∈ {create, accept, cancel, decline, peace, update, accept_permissions, decline_permissions, cancel_permissions}, `ur` (Relation-ID), `uid`, `type`, `relation_permissions` (`ManageUserRelationRequest.php`). Ohne Allianz → AV (`:34-37`). Ungültige Aktion → Info „Ungültige Aktion“ (`:49`).
  - `create` (`:59-98`): Die vertretene Partei muss die eigene Allianz sein (also CA). Der Empfänger muss existieren, `isContactable()` und allianzlos sein. Typ gültig und ≠ PEACE. Sonst Info „Das Abkommen kann nicht erstellt werden“. Liefert der Manager null → „Das Abkommen kann nicht erstellt werden oder ist bereits vorhanden“. Erfolg → „Der Krieg wurde erklärt“ bzw. „Das Abkommen wurde angeboten“.
- Nachrichtenmodul für allianzlose Spieler: `CreateUserRelation` (`src/Module/Message/Action/CreateUserRelation/CreateUserRelation.php:28-102`). Zieltyp 1 = User (contactable, allianzlos), 2 = Allianz (nur wenn die Quelle keine Allianz ist). Meldungen: „Du hast keine Berechtigung, Abkommen für Deine Allianz zu erstellen“, „Ungültiger Abkommenstyp“, „Die gewählte Vertragspartei existiert nicht oder kann kein Abkommen schließen“. Die Kontaktliste zeigt User-Relationen nur allianzlosen Spielern (`src/Module/Message/View/ShowContactList/ShowContactList.php:32, 48`).

**OfferManager::create** (`UserRelationOfferManager.php:25-138`):
- `mayCreate` (Erstellrecht, gültige Parteien, Typ ≠ PEACE).
- Duplikat: Existiert eine Relation desselben Typs, die pending ist oder dieselben Rechte hat → null.
- WAR: alle Relationen des Paars löschen, aktive WAR anlegen (Permissions per sanitize → 0). PM an die Gegenpartei „{Partei} hat {Partei} den Krieg erklärt“. Historie Typ ALLIANCE, Ziel = beteiligter User (`UserRelationHistory.php:15-28`).
- Sonst: ≥ 2 pending → null. Pending anlegen, PM „{Q} hat {Z} ein {Typ} angeboten“.
- Parteibeschreibung: „Die Allianz X“ bzw. „Der Siedler Y“. An eine Allianz geht ein Rundschreiben, an einen User eine PM von NOONE (`UserRelationMessenger.php:20-35`).

**LifecycleManager** (`UserRelationLifecycleManager.php`):
- `accept`: Die Relation ist pending und der Akteur vertritt das Ziel. Alle anderen **aktiven** Relationen des Paars werden gelöscht, date=time(). PM an die Quelle mit dem Abschlusstext („{Z} ist nun Vasall von {Q}“ bzw. „{Q} und {Z} sind ein {Typ} eingegangen“) und Historie (`:23-38, 142-161`).
- `cancel`: WAR → false. Pending → nur die Quelle darf zurückziehen, PM an das Ziel „{Q} hat das Angebot für ein {Typ} zurückgezogen“. Aktiv → jede Seite darf beenden, PM an die Gegenseite „{X} hat das {Typ} aufgelöst“, Historie „Das {Typ} zwischen {Q} und {Z} wurde aufgelöst“ (`:40-140`).
- `decline`: pending, Akteur vertritt das Ziel; löschen, PM an die Quelle „{Z} hat das Angebot für ein {Typ} abgelehnt“ (`:55-72`).

**PeaceManager::suggest** (`UserRelationPeaceManager.php:20-62`): aktive WAR; der Akteur vertritt eine Seite; der Akteur wird zur Quelle. Existiert **irgendeine** PEACE-Relation des Paars (auch pending) → false. Sonst pending PEACE und PM „{Q} hat {Z} ein Friedensabkommen angeboten“. Die Duplikatprüfung ist hier strenger als bei Allianz↔Allianz.

Beitritt eines Spielers zu einer Allianz (Gründung oder Annahme) → alle seine User-Relationen entfallen, mit PMs (§4.1, §4.3).

### 5.6 Relation-Permissions und Rechteänderungen
- Bei Neuanlage: `replaceForRelation` löscht alle Permission-Zeilen und legt für jedes gesetzte, verfügbare Bit eine Zeile an (MUTUAL, pending=false, granted=true) (`src/Orm/Repository/RelationPermissionRepository.php:43-65`).
- Vorschlag (`UserRelationPermissionManager::propose`, `:19-46`):
  - nicht möglich bei pending Relation, WAR oder bereits ausstehender Änderung;
  - der Akteur vertritt eine Seite;
  - `proposeForRelation` (`Repo:96-122`) bereinigt per sanitize; sind die Rechte gleich → false; sonst werden alte pending Zeilen gelöscht und pro **abweichendem** Recht eine pending Zeile mit `granted` = Zielzustand und `offeredBySource` angelegt;
  - PM an die Gegenseite „{X} hat eine Rechteänderung für das {Typ} angeboten“.
- Annehmen (`:48-60`):
  - nur die nicht anbietende Seite (`mayRespondToChange`: nicht pending, Änderung vorhanden, nicht vom Akteur angeboten; `:90-95`) und Vertretungsrecht der eigenen Seite;
  - `acceptPendingForRelation` (`Repo:124-157`): Bei granted=false werden die aktive und die pending Zeile entfernt. Bei granted=true und ohne aktive Zeile wird die pending Zeile aktiv. Sonst wird die Richtung übernommen und die pending Zeile entfernt;
  - PM „{X} hat die Rechteänderung für das {Typ} angenommen“.
- Ablehnen (`:62-74`): wie Annehmen, aber Vertretung irgendeiner Seite genügt; alle pending Zeilen verwerfen; PM „… abgelehnt“.
- Zurückziehen (`:76-88`): nur die anbietende Seite; verwerfen; **keine** PM.
- Während eine Änderung aussteht, gelten weiter die bisherigen aktiven Rechte (`RelationPermissionTrait::hasPermission/hasPermissionFor` ignorieren pending, `src/Component/Alliance/Relations/Trait/RelationPermissionTrait.php:72-101`).
- Bei Allianz↔Allianz laufen diese Pfade über `B_NEW_RELATION` (gleicher Typ, andere Rechte), `B_ACCEPT_OFFER`, `B_DECLINE_OFFER` und `B_CANCEL_OFFER` mit einer nicht-pending Relation-ID (§5.2). Die UI zeigt „Rechteänderung ausstehend“ und die passenden Buttons (`alliancerelations.twig:94-96, 145-151`).

### 5.7 Semantik der Relation-Permissions (Wirkung)
- FRIENDLY → `FriendDeterminator` liefert ALLY, wenn eine **aktive** Relation beliebigen Typs zwischen den Parteien (Allianz des Users bzw. der User selbst) existiert und FRIENDLY für den User gewährt ist (`src/Component/Player/Relation/FriendDeterminator.php:20-44`). **Ohne FRIENDLY ist auch ein Bündnis kein „Freund“** im Kampfsinne.
- SHARE_LIVE_MAP_POSITIONS (nur ALLIED) → Schiffe der Gegenseite erscheinen auf der Live-Karte (§8.4).
- WAR → `EnemyDeterminator` liefert ALLY-Level-Feindschaft (`EnemyDeterminator.php:19-47`).

---

## 6. Forum

Struktur: Board (Forum) → Topic (Thema) → Post (Beitrag). Alle Objekte sind allianzgebunden; der Zugriff wird über `board.alliance.id === user.alliance.id` bzw. topic oder post geprüft.

| Aktion | Regeln / Validierung | Meldungen | Zitat |
|---|---|---|---|
| Board anlegen `B_ADD_BOARD` (param `board`) | EA; `mb_strlen ≥ 5` | „Der Name muss mindestens 5 Zeichen lang sein“ / „Das Forum wurde erstellt“ | `AddBoard.php:28-57` |
| Board umbenennen `B_RENAME_BOARD` (`boardid`,`tname`) | Board in eigener Allianz, `≥ 1` Zeichen | „Es wurde kein Forumname eingegeben“ / „Das Forum wurde umbenannt“ | `RenameBoard.php:23-46` |
| Board löschen `B_DELETE_BOARD` | Board in eigener Allianz; Topics/Posts per FK-Cascade | „Das Forum wurde gelöscht“ | `DeleteBoard.php:20-34` |
| Thema erstellen `B_CREATE_TOPIC` (`boardid`,`tname`,`ttext`) | Name ≥ 1, Text ≥ 1 (sonst View SHOW_NEW_TOPIC). Board in eigener Allianz (sonst AV). Topic mit last_post_date=now, user, sticky=false; erster Post mit name = Topic-Name | „Es wurde kein Themenname eingegeben“ / „Es wurde kein Text eingegeben“ / „Das Thema wurde erstellt“ | `CreateTopic.php:27-80` |
| Beitrag erstellen `B_CREATE_POSTING` (`topicid`,`ttext`) | Text ≥ 1 (sonst View SHOW_NEW_POST). Topic in eigener Allianz. `topic.last_post_date = now`. Post ohne name | „Es wurde kein Text eingegeben“ / „Der Beitrag wurde erstellt“ | `CreatePost.php:26-60` |
| Thema umbenennen `B_RENAME_TOPIC` | ≥ 1 Zeichen | „Es wurde kein Themenname eingegeben“ / „Das Thema wurde umbenannt“ | `RenameTopic.php:23-45` |
| Thema löschen `B_DELETE_TOPIC` | Topic in eigener Allianz; Posts per Cascade | „Das Thema wurde gelöscht“ | `DeleteTopic.php:23-37` |
| Sticky setzen/entfernen `B_SET_STICKY`/`B_UNSET_STICKY` | Topic in eigener Allianz; kein sstr | „Das Thema wurde als wichtig markiert“ / „Die Markierung des Themas wurde entfernt“ | `SetTopicSticky.php:23-39`, `UnsetTopicSticky.php:23-39` |
| Beitrag editieren `B_EDIT_POSTING` (`pid` POST, `text` POST) | Post existiert (sonst return); Board der eigenen Allianz (sonst AV). **Kein Autorencheck.** Text roh über `postStringFatal`, also ohne strip_tags; lastedit=now | „Der Beitrag wurde editiert“ | `EditPost.php:21-42` |
| Beitrag löschen `B_DEL_POSTING` (`pid`) | wie Editieren. War es der letzte Post (postCount==1), wird auch das Topic gelöscht. `last_post_date` wird **nicht** zurückgesetzt | „Das Thema wurde gelöscht“ / „Der Beitrag wurde gelöscht“ | `DeletePost.php:26-55` |

UI-Gating (nur Anzeige):
- Board-Verwaltung, Board-Anlage-Formular, Topic-Settings-Dropdown und Löschbutton bei Posts: `hasAlliancePermission(7)` (`src/html/alliance/allianceboard.twig:9, 31, 46`; `allianceboardtopics.twig:8, 42`; `allianceboardtopic.twig:28`).
- Editierbutton nur für den Autor: `USERID == post.user.id` (`allianceboardtopic.twig:21`).

Anzeige:
- Board-Liste mit Topic-Anzahl, Post-Anzahl und letztem Post (`allianceboard.twig`). Board- und Topic-Namen werden mit `|raw` ausgegeben (`allianceboard.twig:17, 24`, `allianceboardtopics.twig:22`).
- Topic-Liste sortiert nach sticky DESC, last_post_date DESC; „Wichtig“-Icon; Seitenlinks bei mehr als 20 Posts (`Board.php:56-59`, `allianceboardtopics.twig:18-31`).
- Topic-Ansicht: 20 Posts pro Seite (`Topic.php:18`), Offset `mark` (muss ein Vielfaches von 20 und ≥ 0 sein, sonst 0, nur für die Navigation; `Topic.php:94-97`). Navigation `<<`, `<`, Seiten curpage−1 bis curpage+3, `>`, `>>` (`Topic.php:92-122`). Posts nach date ASC. Pro Post: Fraktionsicon, Name, ID, Datum, „zuletzt bearbeitet“, Avatar, Online-Status, Text als `nl2br|bbcode`, PM- und Profil-Buttons (`allianceboardtopic.twig:10-68`).
- Maindesk: die 3 zuletzt aktiven Topics der eigenen Allianz (`src/Module/Game/Lib/View/Provider/MaindeskProvider.php:110-118`, `src/html/maindesk/alliance.twig`).

---

## 7. Ansichten (Views)

Der Einstieg ist `alliance.php` (`src/Public/alliance.php`, Transaktion mit commit). Views (`src/Module/Alliance/services.php:207-227`):

1. **Default (AllianceProvider)** (`src/Module/Game/Lib/View/Provider/AllianceProvider.php:40-238`):
   - Mit `?id=` die fremde Allianz, sonst die eigene. Ist keine vorhanden oder `showlist` gesetzt → **Liste**.
   - **Liste** (öffentlich): Info-Box mit Link „Diplomatische Beziehungen“; „Allianz gründen“ nur ohne Allianz. „Offene Allianzen“ (accept_applications=true) und „Geschlossene Allianzen“, jeweils nach id ASC. Pro Eintrag: Fraktionsicon (wenn Fraktionsallianz), Name (bbcode), Avatare aller Mitglieder, Banner (`:211-237`, `src/html/alliance/allianceList.twig`).
   - **Detail** (öffentlich, `src/html/view/alliance.twig`):
     - Name;
     - Aktionsbuttons (§3.4);
     - Übersetzungsumschalter;
     - gerenderte Beschreibung (§9.3) oder „Keine Allianz-Beschreibung hinterlegt“;
     - „Leitung“: Jobs mit mindestens einem User und sort≠null, sortiert Founder, Successor, Diplomat, ALLIANCE_LEADERSHIP, innerhalb der Gruppe nach sort (`:134-164`). Ausgegeben werden Avatar, Name und Jobtitel;
     - „Mitglieder“: alle Mitglieder mit Avatar, Name, Jobtiteln (Jobs mit title≠null), PM-Button und Fraktionsicon. **Online-Status nur, wenn der Betrachter Mitglied ist** (`alliance.twig:86-90`);
     - „Diplomatische Beziehungen“: aktive Allianz↔Allianz-Relationen mit Bild, Beschreibung aus der Perspektive der Allianz („{Typ} mit {X}“, Vasall: „Hat die Allianz X als Vasall“ / „Ist Vasall der Allianz X“; `src/Module/Alliance/Lib/AllianceRelationWrapper.php:18-35`), „seit {Datum}“ und Vertragswerk-Link;
     - „Gegründet: {Datum}“.
2. **CREATE_ALLIANCE**: Formular mit Name, Beschreibung und Checkbox „Rassenallianz“ (`src/html/alliance/alliancecreate.twig`). Mit Allianz → AV.
3. **SHOW_APPLICATIONS** (MA): Bewerbungen nach date ASC mit Userbox, Annehmen und Ablehnen (`src/html/alliance/allianceapplications.twig`).
4. **EDIT_ALLIANCE** (EA):
   - Name, Homepage, Beschreibung, Territorialfarbe;
   - Rassenallianz-Checkbox, deaktiviert wenn `!CAN_EDIT_FACTION_MODE`;
   - Bewerbungen erlauben/verbieten;
   - Logo-Upload und -Löschen;
   - Löschen-Link;
   - Rollen-Editor: Jobs nach sort (null=999), der Founder-Job ist nicht verschiebbar und ohne Rechte-UI; Rechte gruppiert in „Diplomatische Rechte“ (Diplomat + 4, 5) und „Verwaltungsrechte“ (Vize + 6–14) (`View/Edit/Edit.php:21-70`, `src/html/alliance/allianceEdit.twig`).
5. **SHOW_MANAGEMENT** (siehe §3.4): Mitgliederliste nach id ASC (`UserRepository::getByAlliance`, `src/Orm/Repository/UserRepository.php:178-188`). Pro Mitglied:
   - Profil- und PM-Button, Fraktion, Name;
   - mit 11: zuletzt online, Crew auf Schiffen / globales Crewlimit;
   - mit 10: Kolonien (Klick → SHOW_MEMBER_COLONY_INFO);
   - mit 12: Schiffsrümpfe gruppiert (Klick → SHOW_MEMBER_RUMP_INFO);
   - mit 9: Befördern (Jobliste), Degradieren, Rauswerfen (§4.6, 4.9, 4.10);
   - mit 13: „Allianz-Depots“ mit Besitzer, Standort und Lagerinhalt (`src/html/alliance/alliancemanagement.twig`; `ManagementListItem.php`).
6. **SHOW_MEMBER_COLONY_INFO** (Ajax): Kolonieoberfläche mit Schild, EPS, Lager, Effekten, Sozialem und Koloniezeit. Fehlermeldungen: „Du bist in keiner Allianz“, „Die Kolonie existiert nicht“, „Die Kolonie ist nicht in deiner Allianz“, „Du hast keine Berechtigung, Kolonien anzusehen“ (`ShowMemberColonyInfo.php:31-89`).
7. **SHOW_MEMBER_RUMP_INFO** (Ajax): alle Stationen und Schiffe des Mitglieds mit dem Rumpf, als Wrapper (`ShowMemberRumpInfo.php:34-79`). Prüft nicht konkret VIEW_SHIPS, sondern eines von sieben Rechten.
8. **SHOW_RELATIONS** (D/EDD/CA):
   - Formular „Abkommen erstellen“ (nur mit CA) mit Ziel Allianz oder Siedler-ID, Typ und Rechte-Checkboxen (FRIENDLY für die Typen 3–6, SHARE nur für 4);
   - Tabelle aller Allianzrelationen inkl. pending: Gegenpartei, Typ, Zeitpunkt, Rechte, Aktionen, Vertragswerk;
   - Tabelle „Abkommen mit Siedlern“ (`View/Relations/Relations.php`, `src/html/alliance/alliancerelations.twig`).
   - `AllianceRelationItem`: `getOpponent` = die jeweils andere Allianz; `offerIsSend` = die eigene Allianz ist die Quelle (`src/Module/Alliance/Lib/AllianceRelationItem.php:25-38`).
9. **SHOW_DIPLOMATIC_RELATIONS** (öffentlich): GraphViz-SVG aller aktiven Allianz↔Allianz-Relationen (`View/Diplomatic/DiplomaticRelations.php`).
   - Knoten: Label = Name ohne BBCode und ohne `& < > " ' \ \n`.
   - Rahmenfarbe: Fraktionsfarbe, sonst rgb_code, sonst `#8b8b8b`.
   - Füllung: NPC `#2b2b2b`, sonst `#4b4b4b`.
   - Link auf `alliance.php?id=` (`src/Component/Alliance/Relations/Renderer/AllianceDataToGraphAttributeConverter.php`, `RelationItemVertexBuilder.php`).
   - Kanten: Farbe und Tooltip je Typ, penwidth 2, bgcolor `#121220`, scale 0.5 (`AllianceRelationRenderer.php:24-59`).
10. **EDIT_RELATION_TEXT / SHOW_RELATION_TEXT**: siehe §5.3.
11. **Forum-Views** SHOW_BOARDS, SHOW_BOARD, SHOW_TOPIC, SHOW_NEW_TOPIC, SHOW_NEW_POST, SHOW_EDIT_ALLY_POST, SHOW_TOPIC_SETTINGS, SHOW_BOARD_SETTINGS: siehe §6. ShowEditPost prüft nur die Allianzzugehörigkeit (`View/ShowEditPost/ShowEditPost.php:20-46`).

---

## 8. Auswirkungen auf andere Systeme

### 8.1 Freund/Feind-Bestimmung (zentral)
`PlayerRelationDeterminator` (`src/Component/Player/Relation/PlayerRelationDeterminator.php:20-57`):
- `isFriend(u, o)`:
  - null → false; gleicher User → true;
  - Friend-Level USER (persönlicher Kontakt „Freund“) → true;
  - Enemy-Level USER (Kontakt „Feind“) → false;
  - sonst Friend ≠ NONE.
- `isEnemy`: spiegelbildlich, Enemy USER dominant, Friend USER dominant.
- Dominanz: nur USER-Level (persönliche Kontaktliste) ist dominant (`PlayerRelationTypeEnum.php:13-20`). **Die persönliche Kontaktliste überstimmt Allianzdiplomatie.**
- `FriendDeterminator`: gleiche Allianz (bzw. gleicher allianzloser User) → ALLY; aktive Relation mit FRIENDLY für den User → ALLY; Kontakt FRIEND → USER (`FriendDeterminator.php:20-44`).
- `EnemyDeterminator`: gleiche Partei → NONE; aktive WAR → ALLY; Kontakt ENEMY → USER (`EnemyDeterminator.php:19-47`).
- Die Partei ist immer die Allianz des Users, falls vorhanden. Ein Allianzmitglied „erbt“ damit Kriege und Freundschaften der Allianz und kann keine eigenen User-Relationen haben (§5.5).

Verwendungen:
- Alarm Gelb feuert nur auf Feinde; Rot verschont Freunde; „Trojanisches Pferd“: Ein Freund schleppt einen Nicht-Freund herein (`src/Module/Spacecraft/Lib/Battle/AlertDetection/SkipDetection.php:37-64`).
- Bedrohungsreaktion: Freunde lösen keine Gegenreaktion aus (`src/Module/Spacecraft/Lib/Interaction/ThreatReaction.php:42-44`).
- Transfer: `TransferInformation.isFriend` (`src/Lib/Transfer/TransferInformationFactory.php:31`) gibt den Torpedotransfer nur bei Freunden frei (`src/html/transfer/transferTypeSelection.twig:26`). Laden von einer Nicht-Freund-Kolonie in einer Admin-Region wird geloggt (`src/Module/Game/Action/Transfer/Transfer.php:114-120`).
- Warpkern/Batterie fremder Schiffe aufladen: Bei aktiven Schilden nur für Freunde (`src/Lib/SpacecraftManagement/Manager/ManageReactor.php:43-48`, `ManageBattery.php:47-52`).
- Notrufdetails sichtbar für Freunde (`src/Module/Spacecraft/Lib/EmergencyWrapper.php:20-29`).
- Crew-Erfahrung (XP) nur bei Aktionen gegen Nicht-Freunde: Kolonieangriff (`src/Module/Spacecraft/Action/AttackBuilding/AttackBuilding.php:266`), Scan (`src/Module/Spacecraft/View/ShowScan/ShowScan.php:98`), Kolonie-Scan (`ShowColonyScan.php:119`), Tachyon (`DoTachyonScan.php:86`), Subraumanalyse (`DoSubspaceAnalysis.php:91`), Quick-PM (`src/Module/Message/Lib/QuickPmCrewExperience.php:49`).

### 8.2 Docking, Wurmlöcher, Handelsposten
- Dockrechte Typ ALLIANCE greifen für Mitglieder der Zielallianz; DENY wirft (`src/Component/Station/Dock/DockPrivilegeUtility.php:27-48`). Die Rechte werden bei der Auflösung gelöscht (§4.11). UI-Liste aller Allianzen (`src/Module/Station/View/ShowDockingControl/ShowDockingControl.php:36`).
- Wurmloch-Restriktion Typ ALLIANCE (`src/Component/Ship/Wormhole/WormholeEntryPrivilegeUtility.php:27-53`; Anlegen in `src/Module/Spacecraft/Action/AddWormholeRestriction/AddWormholeRestriction.php:58`; Anzeige „Unbekannte Allianz“, wenn gelöscht: `src/Module/Spacecraft/Lib/WormholeRestrictionItem.php:67-71`).
- Nächster erreichbarer Handelsposten: Allow-Privileg (User, Allianz oder Fraktion) und kein Deny (`src/Orm/Repository/TradePostRepository.php:142-190`).

### 8.3 Allianz-Depots (Stationen)
- Nur Stationen mit der Rumpfrolle DEPOT_SMALL oder DEPOT_LARGE lassen sich der Allianz zuordnen bzw. davon lösen (`src/Module/Station/Action/AddToAlliance/AddToAlliance.php:38-49`, `DeleteFromAlliance/DeleteFromAlliance.php:38-49`). Der Button erscheint nur bei eigenen Depots, wenn der User in einer Allianz ist (`src/Module/Spacecraft/View/ShowSpacecraftDetails/ShowSpacecraftDetails.php:51-63`). Achtung: Die Info-Meldung erscheint auch bei Nicht-Depots, obwohl nichts gespeichert wird.
- Beim Abwracken wird die Zuordnung gelöst (`src/Component/Station/StationUtility.php:229-233`). Austritt, Kick und Auflösung lösen die Depots des Users bzw. alle Depots (§4).
- Sichtbar in der Verwaltung mit VIEW_ALLIANCE_STORAGE (§7).

### 8.4 Sternenkarte und Sichtbarkeit
- Territorialfarbe: Allianz-`rgb_code` vor der User-Farbe, für Einflussgebiete von Stationen (`src/Orm/Repository/MapRepository.php:232-239, 331-342, 358-359`; `src/Module/Starmap/Lib/ExplorableStarMapItem.php:216-235`; Admin `src/Module/Admin/View/Map/ShowMapInfluenceAreas.php:87-91`). Gebietstitel „Gebiet: {Allianz} ({User})“ (`src/Module/Starmap/Lib/ExplorableStarMapItemTitleTrait.php:49-57`; `ShowUserStarmapData.php:243-253`). Die Schiffsansicht zeigt „Einflussbereich/Territorium der Allianz …“ (`src/html/spacecraft/control/control_mid.twig:561-573`).
- Mit VIEW_SHIPS sieht der User auf der eigenen Sternenkarte alle Schiffe und Stationen der Allianzmitglieder mit Details (`ShowUserStarmapData.php:85-98`; Query `src/Orm/Repository/SpacecraftRepository.php:541-569`; `hasDetails` `ShowUserStarmapData.php:457`).
- Freund/Feind-Markierung auf der Karte: Eigene Allianz ist freundlich; aktive Allianz- und User-Relationen mit FRIENDLY → freundlich; WAR → feindlich; Kontaktliste FRIEND/ENEMY (`ShowUserStarmapData.php:346-458`; `ShowUserStarmapRealtime.php:580-712`).
- Live-Karte: SHARE_LIVE_MAP_POSITIONS (ALLIED) bzw. Kontaktfreigabe → Schiffe der Gegenseite werden auch außerhalb der eigenen Sensorreichweite angezeigt (`ShowUserStarmapRealtime.php:115-141, 412-438, 590-660`; `SpacecraftRepository.php:772-816`). Das Realtime-Token enthält allianceId, canSeeAllianceShips sowie friendly-, enemy- und shared-IDs (`:557-570`). Der Movement-Publisher sendet die allianceId mit (`src/Component/Realtime/SpacecraftMovementPublisher.php:94-106, 228-244`).
- Admin-Signaturpanel und Kartenebenen „nur Allianz“ (Schiffsanzahl, Subraumspuren nach `u.allys_id`) (`src/Module/Admin/View/ShowSignatures/SignaturePanel.php:55-56`; `MapRepository.php:675-712, 1255-1295`; `FlightSignatureRepository.php:165-171`).

### 8.5 Scans, Profil, Datenbank
- Kolonie-Scans werden innerhalb der Allianz geteilt: Profil- und Datenbankansicht nutzen die Scans aller Allianzmitglieder (`src/Module/Game/Lib/View/Provider/UserProfileProvider.php:108-123`; `src/Module/Database/View/DatabaseEntry/ShowDatabaseEntry.php:337-352`).
- Profil „Freunde“: Kontakte, die den User als Freund führen, **plus alle Mitglieder seiner Allianz** (`UserRepository.php:241-257`; `UserProfileProvider.php:79-85`). User-Relationen im Profil nur bei allianzlosen Spielern und nur aktive (`:86-94`).
- Spielerlisten sind nach Allianz sortierbar (`allys_id`) (`src/Module/Database/View/UserList/UserList.php:21`, `NPCList.php:21`). Allianzlinks gibt es in Listen und Profil (`src/html/macros.twig:43-44`, `src/html/view/userprofile.twig:50-54`).

### 8.6 Piratenrunde (Prestige)
Am Rundenende erhält jeder Spieler 30 % des Prestiges jedes Top-3-Spielers **seiner Allianz** außer sich selbst. Der Text nennt „Siedler deiner Allianz“ (`src/Module/Tick/Process/EndPirateRound.php:267-286, 358-374`).

### 8.7 Historie und Nachrichten
- History-Typ ALLIANCE („Diplomatie“) für Krieg, Vertragsschluss und Vertragsauflösung (§5). Es gibt keine Historie für Gründung, Beitritt oder Auflösung.
- Alle Allianzbenachrichtigungen sind PMs (Ordner SPECIAL_SYSTEM). Es gibt **kein** KN- oder News-Posting.

### 8.8 Spielerlöschung und Reset
Siehe §4.12 und §4.13. `UserRelationDeletionHandler` löscht die User-Relationen des Spielers (`src/Component/Player/Deletion/Handler/UserRelationDeletionHandler.php:17-20`).

---

## 9. Einstellungen, Validierungen & Grenzwerte

### 9.1 Magische Zahlen / Grenzen
| Regel | Wert | Zitat |
|---|---|---|
| Allianzname min. (Gründung) | `mb_strlen ≥ 5` (roh, nach strip_tags/trim) | `CreateAlliance.php:43` |
| Allianzname min. (Edit) | ≥ 5 Zeichen des BBCode-freien, getrimmten Texts | `EditDetails.php:106` |
| Allianzname max. (Edit) | 255 inkl. BBCode | `EditDetails.php:66` |
| Board-Name min. (Anlage) | 5 | `AddBoard.php:19, 45` |
| Board-/Topic-Name min. (Umbenennen, Topic-Anlage) | 1 | `RenameBoard.php:36`, `RenameTopic.php:36`, `CreateTopic.php:35` |
| Post-Text min. | 1 | `CreatePost.php:33`, `CreateTopic.php:41` |
| Posts pro Seite | 20 | `Topic.php:18` |
| Recent Topics (Maindesk) | 3 | `AllianceBoardTopicRepository.php:40` |
| Jobtitel min. | 3 Byte (`strlen`) | `SaveJobs.php:74`, `EditDetails.php:149` |
| Pending-Angebote pro Paar | < 2 | `CreateRelation.php:68`, `UserRelationOfferManager.php:115-118` |
| RGB-Code | genau 7 Zeichen, Regex `^#?(([a-f0-9]{3}){1,2})$`i | `EditDetails.php:116-125, 163` |
| Homepage | leer oder beginnt mit „http“ | `EditDetails.php:111` |
| Avatar | MIME `image/png` (Client-Angabe), Größe ≤ 200000 B und > 0, gültiges PNG, Breite ≤ 600 px, Höhe ≤ 150 px | `ChangeAvatar.php:40-78` |
| Avatar-Dateiname | `md5(allianceId . "_" . time())`, Re-Encode per GD als Truecolor-PNG nach `{webroot}/{alliance_avatar_path}/{name}.png` | `ChangeAvatar.php:56, 80-110` |
| Relationsgraph | Übersicht 800×700, Beschreibung 600×700 (Parameter werden im Renderer ignoriert, §11) | `DiplomaticRelations.php:17-19`, `AllianceDescriptionRenderer.php:18-20` |
| Gründer-Job-Sort | immer 1 | `CreateAlliance.php:65`, `SaveJobs.php:103-106` |

Avatar-Meldungen: „Es können nur Bilder im PNG-Format hochgeladen werden“, „Die maximale Dateigröße liegt bei 200 Kilobyte“, „Die Datei ist leer“, „Fehler: Das Bild konnte nicht als PNG geladen werden!“, „Das Bild darf maximal 600 Pixel breit sein“, „Das Bild darf maximal 150 Pixel hoch sein“, „Das Bild wurde erfolgreich hochgeladen“, „Das Bild wurde gelöscht“ (`ChangeAvatar.php`, `DeleteAvatar.php:59`). Kann das alte Bild nicht gelöscht werden → RuntimeException (`ChangeAvatar.php:85-98`).

### 9.2 AllianceSettingsEnum
`founder_description`, `successor_description`, `diplomatic_description` (§2.6). Sie werden nur gelesen, als Default-Texte für Template-Variablen (`AllianceProvider.php:166-209`). Es gibt keinen Schreibpfad, und die Variablen werden in keinem Template verwendet.

### 9.3 Beschreibung: Rendering
`AllianceDescriptionRenderer::render` (`src/Component/Alliance/AllianceDescriptionRenderer.php:30-89`):
1. Ersetzt `$ALLIANCE_[^\s]+`-Platzhalter:
   - `$ALLIANCE_HOMEPAGE_LINK` → `<a href="{homepage}" target="_blank">Zur Allianz-Homepage</a>`
   - `$ALLIANCE_BANNER` → `<img src="{alliance_avatar_path}/{avatar}.png" />` oder ''
   - `$ALLIANCE_PRESIDENT` → Name des ersten Founder-Users oder „Unbesetzt“ (wirft, wenn kein Founder-Job existiert)
   - `$ALLIANCE_VICEPRESIDENT` → Successor-User[0] oder „Unbesetzt“
   - `$ALLIANCE_FOREIGNMINISTER` → Diplomat-User[0] oder „Unbesetzt“
   - `$ALLIANCE_DIPLOMATIC_RELATIONS` → GraphViz-SVG der aktiven Relationen dieser Allianz
   - unbekannte `$ALLIANCE_*` → '' (entfernt).
2. Anschließend BBCode mit Bildern (`ParserWithImage`) zu HTML; im Template `nl2br`, autoescape aus (`src/html/view/alliance.twig:38-42`).
3. Übersetzungsblöcke `[translate]…[/translate]` schalten den Übersetzungsumschalter frei (`Alliance.php:301-305`, `alliance.twig:25`).
4. Beim Speichern entfernt `strip_tags` HTML aus der Beschreibung (tidyString). Rohes HTML ist also nicht möglich, nur BBCode und Platzhalter.

### 9.4 Namen
Namen dürfen BBCode enthalten. Ausgabe meist mit `|bbcode`, im Select mit `|bbcode2txt`. Admin-Aktion „ClearFaultyBBCodes“ bereinigt Allianznamen (`src/Module/Admin/Action/ClearFaultyBBCodes.php:93-106`).

---

## 10. Hintergrundprozesse

- **Kein** allianzspezifischer Tick oder Cronjob: keine Ablaufzeiten von Angeboten, keine Inaktivitätsauflösung, keine Kosten.
- `IdleUserDeletion` (Maintenance, `src/Module/Maintenance/IdleUserDeletion.php:10-17`, registriert `src/Module/Maintenance/services.php:18, 33`) → `PlayerDeletion::handleDeleteable()` → `AllianceDeletionHandler` (Gründernachfolge bzw. Auflösung, §4.12) und `UserRelationDeletionHandler`.
- Tick `EndPirateRound` (Allianz-Prestigeanteil, §8.6).
- Spiel-Reset (§4.13).

---

## 11. Offene Fragen / Unklarheiten / mögliche Bugs

1. **KickPlayer prüft FOUNDER am falschen User**: `hasUserPermission($user /*Handelnder*/, …FOUNDER)` (`KickPlayer.php:54`). Ist der Handelnde Präsident, ist der Block wirkungslos. Ein MJ-Nicht-Präsident kann serverseitig den Präsidenten kicken; der Founder-Job ist danach unbesetzt.
2. **Präsident kann austreten** (`Leave.php`, keine Prüfung; nur die UI blendet aus). Auch **Degradieren** des Präsidenten ist möglich (`DemotePlayer.php`). Danach hat die Allianz einen leeren Founder-Job: „Unbesetzt“, Historieneinträge entfallen (`EntryCreator.php:37-39`), es kommen keine PMs an den Präsidenten. Für Löschen und Editieren bleibt Successor nötig.
3. **Keine automatische Auflösung bei 0 Mitgliedern** außer über das Löschen des Präsidenten-Accounts (§4.12).
4. **`getLastOnlineUser` mit `>`**: Haben alle Kandidaten `lastActionTimestamp` 0, ist das Ergebnis null, und die Allianz wird trotz Mitgliedern gelöscht (`AllianceDeletionHandler.php:87-104`). Bei Gleichstand gewinnt der erste.
5. **SaveJobs filtert FOUNDER nicht**: Ein MJ-Inhaber (z. B. ein Vize) kann einem Nicht-Founder-Job die Permission 1 geben und erhält damit volle Präsidentenrechte (`SaveJobs.php:160-232`). Ein zweiter Founder-Job wäre dann möglich; `getFounder()` liefert den ersten.
6. **SaveJobs: `str_starts_with($jobId, 'new_')`** bei strict_types. Sendet ein Client eine numerische ID als JSON-Integer, folgt ein TypeError. Das Frontend sendet Strings. Partielle Saves bei Validierungsfehlern (§4.8).
7. **EditDetails** persistiert Fraktions- und Bewerbungsänderungen auch bei späterem Validierungsabbruch (§4.7). Der RGB-Code ist nicht löschbar. `job_id_*`-Felder sind tot. Ein zu kurzer Jobtitel bricht nicht ab.
8. **CreateAlliance** prüft weder eine bestehende Mitgliedschaft noch Maximallänge, BBCode oder Unicode und löscht offene Bewerbungen nicht. AcceptApplication prüft nicht, ob der Bewerber inzwischen anderswo Mitglied ist; dessen alte Jobs blieben verwaist. Name > 255 führt zu einem DB-Fehler.
9. **Forum-Rechte nur in der UI**: Löschen und Umbenennen von Boards und Topics, Sticky sowie Editieren und Löschen **fremder** Posts kann jedes Mitglied per direktem Request (§3.4, §6). EditPost speichert Text ohne strip_tags; CreatePost/CreateTopic nutzen strip_tags. Board- und Topic-Namen werden mit `|raw` ausgegeben (strip_tags beim Speichern mildert das ab).
10. **SetTopicSticky/UnsetTopicSticky, AddBoard, ChangeAvatar, DeleteAvatar, CreateRelation** ohne sstr-Check (CSRF-anfällig, §3.3). Vor allem bei CreateRelation (Kriegserklärung) relevant.
11. **DeleteAvatar-Pfad** `'%s%s/%s.png'` (fehlender Slash) gegenüber `'%s/%s/%s.png'` in ChangeAvatar und AllianceActionManager (`DeleteAvatar.php:42`). Hängt von der Konfiguration ab, ob webroot mit „/“ endet. Bei Fehlschlag RuntimeException.
12. **SuggestPeace-Duplikatprüfung** sucht nur **aktive** PEACE (date>0) (`SuggestPeace.php:54-62`). Pending Friedensangebote werden nicht erkannt, Mehrfachangebote sind möglich, die Pending-Obergrenze 2 gilt hier nicht. Der User-Relation-Pfad prüft korrekt jede PEACE-Relation (`UserRelationPeaceManager.php:53-62`).
13. **PEACE per B_NEW_RELATION** ist serverseitig nicht ausgeschlossen (nur die UI), anders als bei User-Relationen (`UserRelationOfferManager.php:60`).
14. **`getPossibleTypes()`**: Von TRADE ist VASSAL nicht wählbar, bei VASSAL steht VASSAL doppelt (`AllianceRelationTypeEnum.php:40-43`). Vermutlich ein Klammerfehler.
15. **Inkonsistente Diplomatie-Rechte**: Annehmen, Zurückziehen und Lösen erlauben D, EDD oder CA; Ablehnen und Anbieten verlangen CA. Wer nur EDD hat, kann Verträge annehmen und lösen, aber nicht ablehnen. Die UI zeigt Aktionsbuttons teilweise ohne Rechteprüfung (`alliancerelations.twig:135-151`).
16. **CancelOffer** benachrichtigt nur Founder-User[0] und Diplomat-User[0], während andere Ereignisse ein Rundschreiben an alle Mitglieder schicken. Wirft eine Exception, wenn die Gegenallianz keinen Founder-Job hat.
17. **`getActiveByAlliancePair`** nutzt `getOneOrNullResult`. Bei mehreren aktiven Relationen eines Paars (theoretisch nach Datenfehlern) gibt es eine NonUniqueResultException.
18. **ShowRelationText ohne Berechtigung**: Jeder kann jeden Vertragstext per ID lesen, auch von pending oder User-Relationen.
19. **ShowMemberRumpInfo** prüft nicht VIEW_SHIPS, sondern eines von sieben Rechten (auch DIPLOMATIC); die Verwaltungsansicht ebenso (DIPLOMATIC ist enthalten, der Nav-Link verlangt [9..13]).
20. **`hasFounderPermission`** in `src/html/view/alliance.twig:53` existiert nicht auf `AllianceJob`. Der Präsident wird daher vermutlich nie mit der Klasse `alliancePresident` gerendert (abhängig von Twig `strict_variables`).
21. **Totcode**: `AllianceJobTypeEnum`, `VIEW_ALLIANCE_HISTORY` (keine Prüfung), `AllianceSettings` (kein Schreibpfad), `FOUNDER_DESCRIPTION`/`SUCCESSOR_DESCRIPTION`/`DIPLOMATIC_DESCRIPTION` (in keinem Template), `isEditable()`, `width/height` im `AllianceRelationRenderer` (nicht verwendet), `CreatePostRequest::getBoardId`.
22. **Wurmloch-Restriktionen vom Typ ALLIANCE** werden beim Auflösen nicht gelöscht (nur Docking-Privilegien, `AllianceActionManager.php:46-49`). Eine Wiederverwendung der Allianz-ID nach einem Reset könnte Rechte erben.
23. **`stu_relation_permissions`** hat kein TruncateOnGameReset und keinen FK-Cascade auf `stu_relations`. Wie das beim Reset-Truncate von `stu_relations` reagiert, ist unklar.
24. **AddToAlliance/DeleteFromAlliance** melden Erfolg auch bei Nicht-Depot-Stationen (§8.3).
25. **Leave** sendet die PM vom Austretenden an die Founder. Ist der Austretende selbst Founder-User, wurde er vorher aus dem Job entfernt; Selbst-PMs werden ohnehin unterdrückt.
26. **AcceptOffer** schreibt die Historie mit Ziel = opponent (die annehmende Allianz); Quelle = annehmender User. Ob auch die anbietende Allianz einen Eintrag bekommen soll, ist unklar.
27. **Faction-Mode**: Ist die Allianzfraktion null, darf jeder EA-Inhaber auf die eigene Fraktion umstellen, auch wenn Mitglieder anderer Fraktionen in der Allianz sind (`AllianceActionManager.php:105-118`).
