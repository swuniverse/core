# Systeme beim Bau ausgeschaltet, Scanner schaltbar, Subraumanalyse im UI

**Status:** claimed
**Priority:** P1
**Size:** M
**Blocked by:** —

## Ziel

SWU legt beim Bau alle Module mit `isActive: true` an. Dadurch laufen Hyperraumfeldscanner (Subraum, 15 EPS/Tick) und Gravitationswellenscanner (Tachyon, 3 EPS/Tick) ab Werft aktiv und ziehen unbemerkt EPS, ohne dass der Spieler sie im UI abschalten kann. STU legt jedes System mit `MODE_OFF` an; beim Startup werden nur Systeme mit eingeschaltetem Default-Modus aktiviert. Außerdem fehlt die Subraumanalyse im UI, obwohl das Backend die Signatur-ID schon liefert.

## STU-Quellen

- `src/Module/Spacecraft/Lib/Creation/SpacecraftSystemCreation.php` (Z. ~69–82, `MODE_OFF`)
- `src/Module/Spacecraft/Lib/Auxiliary/SpacecraftStartup.php` (Z. 28–35, nur `getDefaultMode()->isActivated()`)
- `src/Component/Spacecraft/System/Type/AbstractSpacecraftSystemType.php` (Z. 72–75, Default `MODE_OFF`); eigene Defaults nur in `ComputerShipSystem`, `FusionReactorShipSystem`, `LifeSupportShipSystem`, `WarpcoreShipSystem`, `ShuttleRampShipSystem`, `BeamBlockerShipSystem`, `WarpCoreTransferShipSystem`, `SingularityShipSystem`
- `src/html/spacecraft/system/subspaceScanner.twig`, `src/Module/Spacecraft/Action/DoSubspaceAnalysis/DoSubspaceAnalysis.php`
- `src/html/spacecraft/control/control_mid.twig` (Systemschalter)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/shipbuilding-core.service.ts` (Z. ~614–628, `isActive: true`)
- `apps/backend/src/modules/spacecraft/spacecraft-runtime-state.service.ts` (Z. ~138–160, Ausnahmeliste für Startzustand)
- `apps/backend/src/modules/spacecraft/spacecraft-resource-flow.service.ts` (Z. ~25–26, 170–186, Tick-Verbrauch und Fallback)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`toggleSystem`; parallel in Arbeit, Zeilen beziehen sich auf HEAD)
- `apps/backend/src/modules/spacecraft/flight-signature.service.ts` (Z. ~123, `id`), `spacecraft-scan.service.ts` (`sectorScan`, `analyzeSubspace`)
- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts` (`POST :id/subspace-analysis/:signatureId`)
- `apps/frontend/src/components/spacecraft/ShipControlCenter.tsx` (Schalter), `FieldContextPanel.tsx` (`SectorScanResult.signatures`, Z. ~48–57, Schlüssel Z. ~1084)

## Akzeptanzkriterien

- [ ] Neu gebaute, umgerüstete und per Shuttle/Station erzeugte Spacecraft legen Systeme ausgeschaltet an; nur Systeme mit STU-Default „an“ (Computer/Lebenserhaltung/Reaktor/Hyperantriebskern-Pendant, Shuttlerampe, Beamblocker, Transferkoppler soweit in SWU vorhanden) starten aktiv. Die Zuordnung steht als Tabelle im Ticket-Kommentar.
- [x] Hyperraumfeldscanner und Gravitationswellenscanner starten nicht mehr aktiv und verbrauchen ohne Einschalten kein EPS; Fallback ohne geladene Module ebenso.
- [ ] Bestandsschiffe: Migration bzw. einmaliger Abgleich schaltet beide Scanner bei bestehenden Schiffen aus (Entscheidung im Ticket festhalten).
- [x] `ShipControlCenter` bietet Ein/Aus für Hyperraumfeldscanner und Gravitationswellenscanner (30 EPS Aktivierung wie Backend), mit Fehlermeldung bei Tarnung/EPS-Mangel.
- [x] Der Frontend-Typ `SectorScanResult.signatures` übernimmt `id`; die Tabelle nutzt sie als Schlüssel. Je Signatur gibt es „Analysieren“ (100 EPS), das `subspace-analysis/:signatureId` aufruft und das Ergebnis wie STU-Subraum-Box (Analyse-Status, gewählte Signatur) anzeigt.
- [x] Backend-Tests: Bau legt Systeme aus an, Startup-Defaults, kein Tick-Verbrauch ausgeschalteter Scanner. Frontend-Tests: Schalter und Analyseknopf.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt A („Subraumanalyse; Hyperraumfeld-/Gravitationswellenscanner schalten“), D und H („Scanner“); [spacecraft.md](../audit-2026-11-17/spacecraft.md) große Abweichung 2 und „Unsicherheiten – nachgeprüft“ (Standard-Aktivzustand, Signatur-IDs).
- Resolved-Ticket mit nicht erfüllter Akzeptanz: [sc-WP-SENS-2a](sc-WP-SENS-2a-subraumanalyse-und-spurenebene.md) (Analyse und Scanner-Schaltung ohne Bedienung).

## Comments

### 2026-11-18 – umgesetzt, Prüfung ausstehend

Implementierungscommit (eindeutiger Betreff): `fix(spacecraft): apply STU startup modes and expose scanner analysis (sc-AUD-02)`.
Status bleibt `claimed`; Abschluss und Abhängigkeiten warten auf den separaten Prüfpass.

**Startzustände und technische Zuordnung**

| STU-System / Default | SWU-Laufzeitsystem | Startzustand |
| --- | --- | --- |
| Computer / ALWAYS_ON | `COMPUTER` | an, wenn intakt/funktionsfähig installiert |
| Lebenserhaltung / ALWAYS_ON | `LIFE_SUPPORT` | an, universell |
| Fusionsreaktor, Singularität, Warpcore / ALWAYS_ON | `REACTOR` (Hypermaterie-Reaktor) | an; kein zusätzlicher Reservekern |
| EPS-Speicher | `EPS` (Energieverteiler) | passiver SWU-Speicher an; kein laufender EPS-Verbrauch |
| WarpCoreTransfer / ALWAYS_ON | `REACTOR_CHARGE_TRANSFER` | an |
| Beamblocker / ALWAYS_ON | `BEAM_BLOCKER` nur an Stationen | initial aus ohne Crew; bestehender Crew-Startup schaltet an |
| ShuttleRamp / ALWAYS_OFF | `SHUTTLE_RAMP` | passiv aus, funktionsfähig und ohne laufenden Verbrauch |
| Abstract-Default / OFF | Schilde, Antriebe, NBS/LSS, Waffen, Astrometrie, beide Scanner, Matrixsensoren und übrige Spezialfähigkeiten | aus; passive Funktionen prüfen Installation/Integrität |
| Uplink / OFF | `UPLINK` nur an Sensorstationen | aus |

Quellenkorrekturen gegenüber dem Ticket: `ShuttleRampShipSystem::getDefaultMode()` liefert ausdrücklich ALWAYS_OFF. `TachyonScannerShipSystem` erbt 1 EPS Aktivierung aus `AbstractSpacecraftSystemType`; nur `SubspaceSensorShipSystem` verlangt 30 EPS und verbietet aktive Tarnung. Entsprechend zeigt die UI 30/15 EPS für Hyperraumfeldscanner und 1/3 EPS für Gravitationswellenscanner (Aktivierung/Tick). Tachyon bleibt auch während Tarnung schaltbar; ein eigentlicher Tachyon-Scan kostet weiterhin 10 EPS.

SWU trennt installierte Module und Laufzeitschalter: `SpacecraftModule.isActive` entscheidet auch über Kapazitätsberechnung, passive Fähigkeiten und Reparaturbedarf. Das Installationsflag bleibt bei intakten neuen Modulen `true`; OFF wird im dafür vorgesehenen `runtimeSystems.active` gespeichert. Andernfalls würden etwa neue Hyperantriebe ihre Reservekapazität verlieren und intakte Module kostenpflichtig als beschädigt gelten. Damit ist die technische Umsetzung des ersten Kriteriums präzisiert, ohne Kapazitäten oder Reparaturregeln umzubauen.

`initializeSpacecraftRuntimeSystems` nutzt eine zentrale ON-Allowlist für Neubau aus Kolonie/Station, Shuttle-/Workbee-Erzeugung und fehlende Zustände. Ohne geladene Module werden keine Scanner erfunden. Gespeicherte, bewusst eingeschaltete Systeme bleiben bei späteren Reads erhalten. Retrofit verwirft den alten Laufzeitzustand ersetzter Module auch bei gleichem Systemschlüssel; unveränderte Installationen behalten ihren Zustand.

**Bestandsabgleich**

Einmalige TypeORM-Datenmigration `20261118130000-disable-spacecraft-scanners.ts`: vorhandene Scannerzustände erhalten `active:false`; Integrität, Cooldown, Scan-Metadaten und andere Systeme bleiben erhalten. Fehlende Zustände starten künftig aus, ohne Fähigkeiten auf Schiffen ohne Scanner anzulegen. Installationsgesundheit bleibt unverändert. `down` reaktiviert nichts, da alte Spielerentscheidungen nicht rekonstruierbar sind. Die Migration wurde noch nicht auf der laufenden Datenbank ausgeführt. Ein isolierter PostgreSQL-Test für Bestand, Null/Leerzustände, Metadatenerhalt, Wiederholung und sicheren Rollback liegt vor.

**Bedienung**

Scanner-Schalter verwenden den bestehenden PATCH-Endpunkt und zeigen Backend-Fehler. Die Sektor-Tabelle verwendet Signatur-IDs statt Schiff-IDs und bietet die Analyse für 100 EPS mit aktivem intaktem Hyperraumfeldscanner und installierten intakten passiven Matrixsensoren. Anzeige von gewählter Signatur, laufender/erfolgreicher/fehlgeschlagener Analyse und verbleibenden EPS; redaktierte Namen bleiben `?`. Bereits analysierte Signatur und laufende Anfragen sperren Doppelbedienung. Schiff-/Feldwechsel verwerfen verspätete Ergebnisse. Erfolg aktualisiert die Schiffsdaten.

**Sofort geprüft**

- 86 Backend-Tests in sieben gezielten Dateien erfolgreich: Runtime-State, Resource-Flow, Shipbuilding-Workflow, Core-Controls, Scan-Service, Small-Craft-Launch und Colony-Shipyard-Startup. Abgedeckt: OFF-Defaults und Fallback, 18 EPS erst nach Einschalten beider Scanner, Kapazitätserhalt bei Shuttle/Workbee, Retrofit gleicher Systemschlüssel, Aktivierungskosten/Idempotenz/Tarnung/EPS-Mangel, exakte sichtbare Signatur und Fehler ohne Abbuchung.
- 56 Frontend-Tests in `ShipControlCenter.spec.tsx` und `FieldContextPanel.spec.tsx` erfolgreich: Schalter, API-Fehler, ID-Auswahl bei zwei Spuren desselben Schiffs, Voraussetzungen, 100-EPS-Analyse, redaktierter Name, Doppelbedienung und veraltete Antworten.
- Kurzer Diffreview und Whitespace-Prüfung; UI-Agent zusätzlich fokussiertes ESLint ohne Fehler (drei vorhandene Warnungen).

**Ausstehender separater Prüfpass**

1. Abschlussreview gegen präzisierte Kriterien, insbesondere Startup bei Stationsbau/Crewwechsel und passive Fähigkeiten; erstes Kriterium bleibt bis zum Integrationsnachweis offen.
2. `scanner-startup-migration.int-spec.ts` mit PostgreSQL und Migration gegen einen repräsentativen Bestand prüfen; Migration anschließend regulär über TypeORM ausrollen.
3. Betroffene Stationsbau-/Beamblocker-/Shuttle-/Retrofit-Integrationen sowie Sensor-, Tarnungs- und Navigationstests für die OFF-Defaults prüfen; bestehende Fixtures müssen aktive Systeme explizit speichern.
4. Browserprüfung: beide Scanner an/aus, EPS-/Tarnungsfehler, Scan und ausgewählte Analyse mit realen Daten, Schiff-/Feldwechsel und Layout.
5. Backend/Frontend/Shared-Lint und Typechecks sowie gemeinsamer Build im Sammelpass.

Modellrouting: UI an `ticket-coder` (GPT-6 Luna, high) delegiert, Backend/Migration und Kurzreview im verfügbaren Sitzungsmodell. Die laufende Sitzung kann nicht auf GPT-6.1 Sol wechseln; dokumentierter Workflow-Fallback genutzt. Ein lokaler UI-Korrekturdurchgang für Icons, redaktierten Namen und Analyse-Sperre; keine messbaren Tokenzahlen verfügbar.
- 2026-11-18 – Prüfpass (Opus 5.5): Diff-Review: Startmodi entsprechen STU (`AbstractSpacecraftSystemType::getDefaultMode` = OFF, Ausnahmen Computer/Reaktor/Lebenserhaltung/EPS); Deflektor startet daher ebenfalls aus. Migration setzt nur `active:false`, `down` bewusst leer; `scanner-startup-migration.int-spec.ts` grün. Folgefehler in Fixtures behoben (`bd2ea161`): 38 PostgreSQL- und 3 Unit-Tests gingen noch von aktiven Sensoren/Hyperantrieb/Scannern aus; Spielregel unverändert. Gesamtlauf auf `bd2ea161`: Backend-Unit 2599/2599, Frontend 917/917, PostgreSQL 902/1041 – die 139 Fehlschläge sind identisch mit dem Stand vor allen acht Prüfpass-Tickets (`26ff9e76~1`; überwiegend globale HTTP-403 und `lastReports`-Konstruktorverschiebung aus sc-WP-UI-4), also keine Regression. Build `backend frontend shared` und Lint 0 Fehler. Offen: Browserprüfung – beide Scanner an/aus, EPS-/Tarnungsfehler, Scan und Analyse mit realen Daten, Schiff-/Feldwechsel. Status bleibt `claimed`.
