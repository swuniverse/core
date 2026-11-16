# Station demontieren

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** sc-WP-STAT-2

## Ziel

Wie in STU kann der Eigner eine unbemannte Station mit Bestätigungscode demontieren (`UNDER_SCRAPPING`); nach Ablauf erhält er einen Teil der Module ins Lager eines angedockten Schiffs bzw. die Station verschwindet. Allianzdepot-Zuordnungen werden gelöst.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Station/Action/Scrapping/Scrapping.php` (Code `substr(md5(name),0,6)`, unbemannt, Konstrukt sofort entfernt), `Module/Station/View/ShowScrapping`

## SWU-Pfade

- Stationsmodell, `apps/backend/src/modules/tick/tick.service.ts`
- `apps/frontend/src/components/spacecraft/SelfDestructPanel.tsx` (Code-Bestätigung als Vorbild)

## Akzeptanzkriterien

- [x] Demontage nur unbemannt und mit korrektem Code; Zustand und Restdauer sichtbar.
- [x] Abschluss im Tick: Rückgabe gemäß STU, Station gelöscht, angedockte Schiffe abgedockt, Allianzzuordnung gelöst (kaskadierender Löschvertrag für die noch ausstehende Depot-Entity aus sc-WP-STAT-6b).
- [x] Backend-Tests, Frontend-Test.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-10-29: Blockiert nach zwei ernsthaften Verifikationsläufen. Die fokussierten Backend- und Frontend-Tests sowie alle Builds sind grün, aber der vorgeschriebene affected-Lauf scheitert weiterhin an bereits vorhandenen, issue-fremden Frontend-Typecheck- und Backend-/Frontend-Testfehlern. Produktänderungen wurden gemäß Ralph-Abbruchregel verworfen.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (fachfremde Typecheck-/Testbaseline); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.

## Answer

- Eigentümergeschützte `GET/POST /spacecraft/:id/scrapping`-API und Demontagepanel in der Stationsansicht. Bestätigung über `substr(md5(name), 0, 6)` mit erneuter Prüfung des aktuellen Namens im gesperrten Datensatz. Der Spieler bestätigt die Folgen und gibt den Code ein; Status, Restdauer und fehlende Workbees bleiben nach Seitenwechsel sichtbar.
- Nur tatsächlich unbemannte Stationen dürfen starten; der Crew-Zähler ist nicht die Autoritätsquelle. Konstrukte werden sofort entfernt. Fertige oder im Ausbau befindliche Stationen wechseln nach `UNDER_SCRAPPING`; Systeme und Module werden entfernt, Schilde deaktiviert und 50 Dockplätze für Workbees bereitgestellt. Neue Crewzuweisung ist während der Demontage gesperrt.
- Eigenständige `StationScrapping`-Entity mit kaskadierender Stationsreferenz, Restticks und persistentem Modul-Snapshot. Dauer `ceil(Bauzeit / 2)`, mindestens ein Tick. Jeder Tick erfordert `ceil(rollenbezogene Workbees / 2)` angedockte, einsatzfähige und ausreichend bemannte Workbees. Mangel oder nachträglich vorhandene Crew pausiert den Fortschritt.
- STU-Recycling in zwei Phasen: Beim Start werden Module nach Waren-ID gruppiert und mit `ceil(50 × Integrität / 100)` Prozent vorgemerkt. Eine vorgemerkte Gruppe gibt beim Abschluss ein Modul zurück; sonst besteht 33 Prozent Totalausfallchance, andernfalls kommen zufällig 1 bis zur eingebauten Anzahl zurück. Der Start wird bei Wiederholung nicht neu ausgewürfelt.
- Beim letzten Tick gehen zurückgewonnene Module an das erste eigene, betriebsbereite angedockte Schiff nach ID. Tatsächliche Frachtbestände begrenzen die Rückgabe; ohne Empfänger oder freien Platz entfällt sie. Station, eigenes Lager und stationsgebundene Daten werden entfernt, sämtliche angedockten Schiffe unabhängig vom Eigentümer abgedockt. Stationsgebundene Handelsposten werden über den bestehenden Lebenszyklus bereits beim Start entfernt, inklusive Benachrichtigungen und Evakuierung dort wartender Crew.
- Alle Start-/Tickänderungen und Nachrichten erfolgen transaktional; Live-Nachrichten erst nach Commit. Schiff-/Stationssperren serialisieren parallele Starts. Ein überstandener Kampf erhält den Demontagestatus; normale Tickproduktion läuft während der Demontage nicht weiter.

### STU-Abgleich und Folgeintegration

STU `finishScrapping` wandelt die Station tatsächlich in ein Konstrukt um und legt Module in dessen Lager. Dieses Ticket verlangt ausdrücklich die Entfernung mit Modulrückgabe an ein angedocktes Schiff; SWU folgt dieser Vorgabe. Das Panel nennt den Verlust des Stationslagers und nicht zurückgegebener Module sowie das Abdocken. Auch die sofortige Konstruktentfernung verlangt gemäß Ticket eine unbemannte Station.

Allianzdepot-Zuordnungen existieren vor `sc-WP-STAT-6b` noch nicht. Die endgültige Stationslöschung ist der Integrationspunkt: Die neue Zuordnungs-Entity muss ihre Stationsreferenz mit `ON DELETE CASCADE` anbinden, sodass Demontage und andere Stationslöschungen die Zuordnung atomar entfernen. Keine zweite Depotimplementierung in diesem Ticket.

## Validation

- 2026-11-16: `npx nx affected -t lint typecheck test --base=HEAD --parallel=2` grün. Backend 239 Suites / 2308 Tests; Frontend 119 Dateien / 831 Tests. Bekannte Lint-Warnungen ohne Fehler.
- `npx nx run backend:test-integration --runInBand --testPathPatterns=station-scrapping`: 15 PostgreSQL-Tests grün. Eigentum, falscher/veralteter Code, tatsächliche Crew, persistenter/idempotenter Start, Workbee-Pause und Fortsetzung, Rückgabe/Lagergrenzen, fremde oder fehlende Empfänger, sofortige Konstruktentfernung, Nachrichten-Rollback an beiden Phasen, parallele Starts, echter Tick-Einstieg und Erhalt des Status bei Kampfüberleben.
- Drei Regeltests für MD5-Code und beide STU-Zufallsphasen; zusätzliche Tests für Andocken während der Demontage und Crewzuweisungssperre. Vier Frontend-Tests für Bestätigung, Fortschritt/Pause, Crewblockade, sofortige Entfernung und API-Fehler.
- `npx nx run-many --targets=build`: alle drei Projekte grün. Backend-Deklarationsausgaben nach Webpack separat wiederhergestellt.
- Migration `AddStationScrapping20261116170000` in der lokalen Dev-Datenbank (Port 5490) erfolgreich angewendet; Tabellenspalten und Migrationseintrag separat abgefragt. Keine Bestandsdaten zurückgesetzt.

## Abschlussnotiz

- 2026-11-16 Agent: Stationsdemontage mit eigener Fortschritts-Entity, API, Tickverarbeitung und Stationspanel umgesetzt. Depotzuordnungs-Cascade bleibt Bestandteil von sc-WP-STAT-6b; der Stationslöschpfad ist dafür vorbereitet. Vollständige Pflichtprüfungen und PostgreSQL-Fälle grün.
