# Kampfvorbereitung und -nachbereitung wie STU

**Status:** claimed
**Priority:** P1
**Size:** M
**Blocked by:** —

## Ziel

SWU setzt im Kampf nur Status und Alarmstufe (ROT, danach pauschal GELB) und schaltet keine Systeme. Deshalb gilt:
- Ein Verteidiger mit abgeschalteten Schilden bleibt ungeschützt.
- Angedockte Teilnehmer bleiben angedockt.
- Vorher rote Schiffe stehen nach dem Kampf auf Gelb.
- Ein Schildkollaps schaltet das Schildsystem nicht ab.

STU bereitet jedes Mitglied beider Parteien vor dem ersten Schuss vor (`FightLib::ready`):
- abdocken, Reparatur und Umrüstung abbrechen,
- Warp und Tarnung aus,
- Alarmreaktion: Grün wird Gelb; bei Gelb Schilde, NBS und Strahlenwaffe an, bei Rot zusätzlich Torpedos.

Bei einem Schildkollaps schaltet STU das Schildsystem ab und setzt den Regenerationstimer zurück.

## STU-Quellen

- `src/Module/Spacecraft/Lib/Battle/FightLib.php` (Z. ~60–102, `ready`)
- `src/Module/Spacecraft/Lib/Battle/AlertLevelBasedReaction.php` (Z. ~21–107)
- `src/Module/Spacecraft/Lib/Battle/SpacecraftAttackPreparation.php` (Z. ~25–41, Einweg nur Angreifer)
- `src/Module/Spacecraft/Action/AttackSpacecraft/AttackSpacecraft.php` (Z. ~91–93, Angreifer abdocken)
- `src/Module/Spacecraft/Lib/Damage/ApplyDamage.php` (Z. ~78–95, Schildkollaps, Timer-Reset)
- `src/Module/Spacecraft/Lib/Battle/AlertDetection/AlertReactionFacade.php` (Z. ~72–88, 124–128)

## SWU-Pfade

- `apps/backend/src/modules/combat/combat.engine.ts` (Z. ~104–133 Status/Alarm, Z. ~454–461 Schildschaden)
- `apps/backend/src/modules/combat/combat.service.ts` (Z. ~182–190 Tarnung nur beim Ziel)
- `apps/backend/src/modules/alert-reaction/alert-reaction.service.ts` (Z. ~89–172)
- `apps/backend/src/modules/spacecraft/spacecraft-alert.service.ts` (Z. ~24–78, STU-ähnliche Schaltung, bisher nur bei manuellem Alarmwechsel; Gelb schaltet nur NBS)
- `apps/backend/src/modules/spacecraft/spacecraft-docking.service.ts` (Abdocken ohne EPS-Prüfung im Kampf)

## Akzeptanzkriterien

- [x] Vor dem ersten Schuss durchläuft jedes Mitglied beider Parteien (bei Einweg-Ursache nur Angreifer) eine Vorbereitung wie `FightLib::ready`: abdocken, laufende Reparatur/Umrüstung abbrechen, Hyperantrieb und Tarnung aus.
- [x] Danach Alarmreaktion wie `AlertLevelBasedReaction`: Grün → Gelb; Gelb: Schilde, NBS, Strahlenwaffen an (wenn möglich, mit EPS-Kosten); Rot zusätzlich Torpedobank. Fehlschläge werden im Kampfbericht vermerkt.
- [x] `SpacecraftAlertService` und die Kampfvorbereitung teilen eine Implementierung; manueller Wechsel auf Gelb schaltet ebenfalls Schilde, NBS und Strahlenwaffen wie STU.
- [x] Fallen Schilde im Kampf auf 0, wird das Schildsystem abgeschaltet und der Schild-Regenerationstimer gesetzt (Schnittstelle zu sc-AUD-10).
- [x] Nach dem Kampf wird die Alarmstufe nicht pauschal auf Gelb gesetzt; Rot bleibt Rot, nur Grün wurde zuvor auf Gelb angehoben.
- [x] Backend-Tests für Abdocken, Warp/Tarnung aus, Alarmreaktion je Stufe, Schildkollaps, Alarmstufe nach Kampf; bestehende Kampftests angepasst.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitte B3, E („Kampfvorbereitung“), H („B3 Kampf“); [spacecraft.md](../audit-2026-11-17/spacecraft.md) große Abweichung 7 („Kampfvorbereitung“, „Abdocken des Angreifers“, „Schildkollaps“, „Alarmstufe nach dem Kampf“) und Unsicherheiten „Alarmreaktion vs. Battle-Resolver“.
- Resolved-Tickets mit abweichender Umsetzung: [sc-WP-COMBAT-1b](sc-WP-COMBAT-1b-interner-battle-resolver.md), [sc-WP-COMBAT-1c](sc-WP-COMBAT-1c-alarmreaktion-und-bewegungs-ui.md). PO-Linie „wie STU“ vom 2026-11-17.

## Comments

- Unabhängig von sc-AUD-07a umsetzbar; wenn beide parallel laufen, an `combat.engine.ts` abstimmen.

### 2026-11-18 – umgesetzt, Prüfung ausstehend

Implementierungscommit (eindeutiger Betreff): `fix(combat): prepare participants and preserve alert levels (sc-AUD-08)`.
Status bleibt `claimed`; Abschluss erst im separaten Prüfpass.

**Umsetzung**

- `BattlePreparationService` ist ein verpflichtender Schritt des gemeinsamen `BattleResolverService` vor der Engine. Beide Parteien werden vorbereitet; bei `ACTIVATE_TRACTOR`/`BOARD_SHIP` nur die Angreifer. Tote Mitglieder werden übersprungen, doppelte Schiff-IDs nur einmal bearbeitet.
- Die Vorbereitung sperrt die aktuellen Schiffsdaten geordnet, prüft Besitzer und Kampfsektor und speichert ihre Änderungen in einer Transaktion. Schiffe docken ohne EPS-Gebühr ab; Eigen-/Stationsreparaturen werden über `SpacecraftRepairService.cancelTasks` abgebrochen und vorhandene Reparaturteile erstattet. Laufende/pausierte REPAIR-/RETROFIT-Werftaufträge werden beendet; Neubauten und bereits abgeschlossene Aufträge bleiben erhalten. Retrofit-Rückerstattungen verwenden die tatsächlich verbrauchten Modul-IDs und ihren Kolonie-/Stationsursprung und erfolgen nur einmal. Die vorhandene SWU-Rückerstattung der verbrauchten Module bleibt erhalten; STUs zeitabhängige Erstviertel-Rückgewinnung wurde durch dieses Ticket nicht neu eingeführt. Rückerstattungsspeicher folgen der direkten Reparatur-Rückerstattung ohne erneuten Verbrauch oder erfundene Module.
- Hyperantrieb und Tarnung werden deaktiviert. Autoritative Crewprüfung und ein betriebsbereiter Computer bestimmen, ob eine Alarmreaktion möglich ist; Fehlschläge erscheinen mit Schiff-ID im Bericht. Aufrufende Schiffszustände werden erst nach erfolgreichem Commit aktualisiert. NOWAIT-Sperren an beteiligten Daten verhindern wartende Gegen-Sperrfolgen; ein Konflikt bricht vor dem ersten Schuss ab.
- `SpacecraftAlertService` teilt die Systemschaltung für manuelle Alarmwechsel und Kampfvorbereitung. Gelb versucht Schilde, NBS und Strahlenwaffen; Rot zusätzlich die Torpedobank. Bereits laufende Systeme werden nicht erneut bezahlt. Neue Aktivierungen kosten je 1 EPS; Grün→Gelb kostet 1 EPS, ein Wechsel auf Rot 2 EPS, entsprechend STU `SpacecraftStateChanger` und den System-Defaults. Zerstörte Systeme, Cooldowns, Crew-/EPS-Mangel, erschöpfte Schilde, aktiver/gegenläufiger Traktorstrahl, Schildstörung, Ionensturm/Subraumellipse und NBS-Kolonievoraussetzung werden berücksichtigt. Der manuelle Adapter liefert die maßgeblichen Crew-/Kolonie-/Ortsbedingungen mit.
- Quellenpräzisierung für Grün: `AlertLevelBasedReaction::changeFromGreenToYellow` kehrt nach der Erhöhung sofort zurück. Daher werden bisher grüne Kampfteilnehmer in diesem Zyklus auf Gelb angehoben, ohne zusätzlich die Gelb-Systeme einzuschalten. Bereits gelbe/rote Mitglieder erhalten die Systemreaktion. Ein manueller Wechsel auf Gelb aktiviert dagegen die ausdrücklich im Ticket geforderten Systeme über dieselbe Implementierung.
- Die Engine verändert nur den Kampfstatus; sie setzt die Alarmstufe weder vor dem Kampf pauschal auf Rot noch danach pauschal auf Gelb. Rot bleibt Rot. Der Alarmadapter übergibt den zutreffenden Alarm-Kampfgrund an denselben Resolver.
- Jeder Schildtreffer im Kampf und im gemeinsamen Feld-/Anomalie-Schadenshelfer setzt `runtimeSystems.SHIELDS.regenerationStartedAt` (Epoch-Millisekunden). Ein Kollaps schaltet die Schilde wie im geteilten Schadensmodell aus. Das JSONB-Feld ist persistent, der gemeinsame DTO-Typ dokumentiert es; eine Schema-Migration ist dafür nicht erforderlich. sc-AUD-10 kann diesen Timer für den Regenerationslauf verwenden.
- Neue `PREPARATION`-Berichtszeilen enthalten Aktionen und Fehler mit dem richtigen Schiffsnamen. Die Dienstverdrahtung nutzt die vorhandenen Spacecraft-Services ohne neuen Modulzyklus.

STU gelesen: FightLib::ready, AlertLevelBasedReaction, SpacecraftAttackPreparation, SpacecraftWrapper/SpacecraftStateChanger, ShieldShipSystem, NearFieldScannerShipSystem, AbstractSpacecraftSystemType sowie CancelRepair/CancelRetrofit. ADR-0004 bleibt eingehalten: Schiffe und Stationen laufen durch den gemeinsamen Spacecraft-Kampfpfad.

**Sofort geprüft**

164 Backend-Tests in zehn gezielten Dateien erfolgreich:

- `battle-preparation.service.spec.ts`: beide Parteien, Grün-/Gelb-/Rot-Reaktion, Abdocken, Warp/Tarnung aus, Einweg-Ausnahmen, Eigenreparatur-Aufruf, Kolonie-/Stationsjobs, Rückerstattung und Wiederholung, Rollback ohne Snapshot-Mutation, Crew-/Computer-/EPS-/Anomalie-/Traktorfehler und verlassener Sektor.
- `spacecraft-alert.service.spec.ts`: gemeinsamer manueller Gelb-/Rot-Wechsel, Aktivierungskosten und Idempotenz, Grün-Semantik, EPS-Mangel, Schäden/Cooldowns, Crew, Traktor, Feld-/Anomaliesperre und NBS-Voraussetzungen.
- `battle-resolver.service.spec.ts`: Vorbereitung vor der Engine, Fehlerzeilen im Bericht, Ursachenweitergabe und bestehende Resolver-Ergebnisse.
- `combat.engine.spec.ts` und `spacecraft-damage.spec.ts`: Schildtreffer-/Kollaps-Timer, ausgeschaltete Schilde, unveränderte Alarmstufe sowie vorhandene Kampf-/Schadensregressionen.
- `spacecraft-core-controls.spec.ts`, `combat.service.spec.ts`, `alert-reaction.service.spec.ts`: bestehende Alarm-/Angriffs-/Reaktionsadapter.
- `spacecraft-repair.service.spec.ts`: vorhandener transaktionaler Reparaturabbruch und Rückerstattung.
- `app-module-graph.spec.ts`: Nest-Modulgraph ohne undefinierte Imports und verwendbare ORM-Metadaten ohne Datenbankverbindung.

Kurzer tatsächlicher Diffreview und Whitespace-Prüfung erfolgreich. Die direkte Resolver-Fixture im RPG-Integrationstest ist an den zusätzlichen Vorbereitungsdienst angepasst; dieser PostgreSQL-Test wurde noch nicht erneut ausgeführt.

**Separater Prüfpass ausstehend**

1. Abschlussreview gegen die präzisierten Kriterien und STU, insbesondere Grün-Frühreturn, unzureichende Crew/Computer, partiell mögliche Aktivierungen und Retrofit-Rückerstattungen.
2. PostgreSQL-/API-Fälle für Schiffssperren, Jobs, Rückerstattungen, Wiederholung, Rollback/Konflikte, Stations-/Eigenreparaturen und reale Kampfbericht-Persistenz; auch volle Lager und konkurrierender Werftabschluss prüfen.
3. `rpg-transponder.int-spec.ts` mit erweitertem Resolver-Konstruktor sowie manuelle Angriffe, Alarmkämpfe, Stationen, Einweg-Reaktionen und Bewegung nach der Vorbereitung integrieren.
4. Weitere Feld-/Anomalie-Schadensregressionen im Sammelpass. sc-AUD-10 ergänzt den eigenen Regenerationslauf und weitere direkte Schildverluste außerhalb des Schadenshelfers.
5. Backend/Frontend/Shared-Lint und Typechecks, gemeinsamer Build sowie Browserprüfung der Alarm-/EPS-Fehler und Vorbereitungszeilen im realen Kampfbericht.

Modellrouting: Spielregeln, Transaktionen und Kurzreview direkt im verfügbaren Sitzungsmodell umgesetzt; keine Codierdelegation. GPT-6.1 Sol ist in der laufenden Sitzung nicht umschaltbar, daher dokumentierter Workflow-Fallback. Keine messbaren Tokenzahlen verfügbar.
