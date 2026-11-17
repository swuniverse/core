# RPG-Transponder mit Admin-Unsichtbarkeit

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** soc-E3a

## Ziel

Ein RPG-Transponder bildet das STU-RPG-Modul ab. Er kennzeichnet ein Spacecraft als Teil einer administrierten RPG-Szene; Administratoren können es für die Szenenvorbereitung vollständig aus Spieler-Sensorik und Kartenanzeige ausblenden und später wieder einblenden. Die Unsichtbarkeit ist kein spielerseitiges Tarnsystem und gewährt keine taktischen Vorteile.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/SetRpgModuleInvisibility/SetRpgModuleInvisibility.php`
- `Component/Spacecraft/System/Type/RPGShipSystem.php`
- `Component/Spacecraft/System/Data/RpgModuleSystemData.php`
- Sichtbarkeitsfilter in `Orm/Repository/MapRepository.php` und `Orm/Repository/ShipRepository.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/`
- `apps/backend/src/modules/starmap/`
- `apps/backend/src/modules/admin/`
- `apps/frontend/src/pages/admin.tsx`
- `packages/shared/`
- `game-data/data/modules/special.yaml`

## Akzeptanzkriterien

- [x] RPG-Transponder kann nur über administrierte RPG-Inhalte vergeben beziehungsweise verwendet werden.
- [x] Nur Administratoren können die RPG-Unsichtbarkeit umschalten.
- [x] Unsichtbare RPG-Spacecrafts fehlen in Spieler-Sensorik, Kartenbelegung und Echtzeitereignissen; Administratoren können sie weiterhin verwalten.
- [x] Beim Wiedereinblenden wird der aktuelle Zustand wieder veröffentlicht.
- [x] Das System beeinflusst keine Tarn-, Kampf- oder Haltungsregeln.
- [x] Service- und Integrationstests decken Rechte und sämtliche Sichtbarkeitspfade ab.

## Triage und Umsetzungsvertrag

RPG-Plots (`soc-E3a`) existieren, aber weder Transponderzustand noch Admin-Unsichtbarkeit sind implementiert. `isHiddenFromViewer` schützt heute nur fremde getarnte Schiffe; `FlightSignatureService.createMovement` speichert reale Bewegungen. Diese Pfade allein reichen für vollständige RPG-Unsichtbarkeit nicht aus.

STU `SetRpgModuleInvisibility` prüft Adminrolle, eigenes Schiff und eingebautes RPG-System und publiziert Removal/State. Übernehmen: nur Administratoren verwalten den Transponder ihrer eigenen Szenenschiffe; kein Spielerbau-/Fertigungsangebot und keine Vergabe durch Plot-Mitgliedschaft. Einen administrierten RPG-Bezug im Admin-Vertrag explizit erfassen; bestehende öffentliche Plots bekommen dadurch keine zusätzlichen Steuerrechte. Das System kostet 0 EPS und ist unabhängig von `CLOAK`.

## Ergänzte Akzeptanzkriterien

- [x] Admin-API vergibt/entfernt den Transponder und schaltet Unsichtbarkeit nur für eigene administrierte Szenenschiffe; Rollen-, Eigentums- und RPG-Bezug werden serverseitig geprüft. Entfernen beendet Unsichtbarkeit.
- [x] Ein separates persistiertes Merkmal und eine gemeinsame Sichtbarkeitsprüfung werden auch für Spieler-Eigentumslisten, direkte Detail-/Zielabfragen, NBS, LSS-Zählungen, Kolonie-/Orbit-Scan, geteilte Positionen, Kartenbelegung und Spieler-Echtzeitereignisse benutzt. Adminverwaltung behält Zugriff.
- [x] Ausblendung publiziert Entfernung nach Commit an bisherige Zuschauer, Einblendung veröffentlicht den aktuellen Zustand. Verdeckte Bewegung erzeugt keine für Spieler lesbaren neuen Flugsignaturen; vorhandene historische Signaturen werden nicht nachträglich umgeschrieben.
- [x] Unsichtbare Szenenschiffe nehmen nicht an automatisch ausgelösten Spieler-Kämpfen/Alarmreaktionen teil und erlauben keine Spieler-Fernaktionen als Quelle oder Ziel. Normale Tarnung/Haltung und Kampfregeln sichtbarer Schiffe bleiben erhalten.
- [x] HTTP-Rechtetests sowie Sichtbarkeits-/Websockettests decken Abwesenheit von IDs und Zählungen, Umschalten, Rollback und Wiederveröffentlichung ab; Frontend testet Adminaktion und unveränderte Spieleransicht.

## SWU-Anker

`spacecraft-cloak.ts`, `starmap-visibility.service.ts`, `nearby-interaction.ts`, `spacecraft.service.ts` (Scans/Listen), `flight-signature.service.ts`, `websocket/game.gateway.ts`, `rpg/rpg-plot.service.ts` und bestehende Admin-Guards. Kein eigener Tarnungsmechanismus.

## Answer

Persistierter RPG-Transponder mit eigener Adminseite `/admin/rpg-ships` und rollen-, eigentums- sowie plotgeschützter API. Nur tatsächliche Datenbank-Administratoren verwalten ihre eigenen Szenenschiffe mit eigenem aktivem Plot. Zuordnen/Entfernen und Aus-/Einblenden kosten 0 EPS; Entfernen beendet die Unsichtbarkeit. Einblenden/Entfernen bleibt nach Plot-Ende möglich. `CLOAK` bleibt unabhängig und unverändert.

Das separate RPG-Merkmal wird in Spielerlisten und Direktzugriffen, NBS, Galaxie-/System-LSS einschließlich Tachyon-Zählungen, Kolonie-/Orbitverwaltung, Handels-/Crew-Auswahl, Kartenkontakten, Positionsfreigaben, Peilsendern, Notrufen und schiffsbezogenen Websocketereignissen berücksichtigt. Die Adminverwaltung behält Zugriff. Sichtbarkeitswechsel publizieren Entfernung bzw. aktuellen Zustand nach Commit ausschließlich an berechtigte Zuschauer. Verdeckte Bewegung erzeugt auch bei stale Entities keine neuen Flugsignaturen; historische Signaturen bleiben erhalten.

Spieler-HTTP-Aktionen und die echte Kampfausführung halten gemeinsame PostgreSQL-Advisory-Sperren über ihre Ausführung. Adminänderungen werden bei laufender Verwendung mit 409 abgewiesen; Poolplätze für Handler bleiben reserviert, verschachtelte Kämpfe benutzen dieselbe Sperrverbindung. Automatische Kämpfe prüfen auch bereits geladene Teilnehmer gegen den aktuellen Datenbankzustand. Aktive Peilsender werden beim Verbergen bereinigt. Normale Entity-Saves können den Adminzustand nicht überschreiben; Plotentfernung und Eigentümerwechsel bereinigen ihn in der Datenbank.

Spieleransichten reagieren auf das Sichtbarkeitsereignis; ältere Schiffsliste-Antworten können eine bereits entfernte Szene nicht wieder einfügen. Die Migration wurde ohne Dev-DB-Reset lokal eingespielt.

## Comments

- 2026-11-16 – Triage: Technische Abgrenzung und Admin-/Sichtbarkeitsvertrag konkretisiert; Umsetzung offen, Voraussetzungen erfüllt. Beschränkt auf die schon geforderte administrative Szenenfunktion. Siehe [Audit](../triage-2026-11-16.md).
- 2026-11-17 – Umsetzung abgeschlossen und lokal migriert. Keine neue Spielerfertigung und keine zusätzlichen Plot-Mitgliedsrechte. Die vier offenen Produktentscheidungen werden durch diesen Auftrag nicht freigegeben.

## Validation

- Backend: `npx nx test backend --maxWorkers=2` – **241 Suites / 2.337 Tests bestanden**.
- Frontend: `npx nx test frontend --maxWorkers=2` – **127 Dateien / 865 Tests bestanden**; Adminverwaltung, Sichtbarkeitsereignis und verspätete Schiffsliste-Antwort geprüft.
- `npx nx affected -t lint typecheck --base=HEAD --parallel=2` – alle drei Projekte grün, bestehende Lintwarnungen ohne Fehler.
- `npx nx run-many --targets=build` – Shared, Backend und Frontend grün; anschließende erzwungene Backend-Deklarationserzeugung ebenfalls grün.
- PostgreSQL: Breite Auswahl `rpg-transponder|signature-mask|starmap-visibility|alert-reaction|movement-concurrency|wormhole|navicomputer|tachyon` prüfte **203 Fälle**. **197 bestanden**; die sechs Alarmfälle scheiterten ausschließlich an der alten leeren `LastCombatReportService`-Fixture. Diese verwendet jetzt den echten Dienst. Der abschließende Nachlauf `rpg-transponder|alert-reaction` besteht mit **19 Tests (13 RPG + 6 Alarm)**; damit sind alle 203 geprüften Fälle durch breite Auswahl und Nachlauf abgesichert.
- Die 13 neuen Produktions-HTTP/PostgreSQL-Fälle prüfen Rechte, Eigentum/Plot, eigene Listen/Details, Quelle/Zielaktionen, NBS/Tachyon/LSS, Systemorbit, echte Freigaben, Signaturen/stale Saves, Zuschauer und Ereignisse nach Commit, Rollback, laufende HTTP-Aktionen und Poolreserve, stale Kampfteilnehmer, CLOAK, Plot-Ende, Rollenentzug sowie Tracking/Notrufe.
- Lokale Dev-Migration `RpgTransponder1794877200000` erfolgreich angewendet; kein Reset. `git diff --check` grün.
