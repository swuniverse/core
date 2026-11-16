# Signaturmaskierung für Flugsignaturen

**Status:** resolved
**Priority:** P3
**Size:** M
**Blocked by:** sc-WP-NAV-2a, tmw-D6b

## Ziel

Eine Signaturmaskierung bildet die falsche STU-Warpsignatur im feldweisen SWU-Galaxieflug ab. Ein Schiff kann gegen EPS für fünf Minuten das Signaturprofil eines dem Spieler bekannten Spacecraft-Rumpfs emittieren; währenddessen neu erzeugte Flugsignaturen zeigen Beobachtern diesen Rumpf statt des tatsächlichen.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Ship/Action/FakeWarpSignature/FakeWarpSignature.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/`
- `apps/backend/src/modules/starmap/`
- `apps/frontend/src/pages/spacecraft/`
- `packages/shared/`
- `game-data/data/modules/special.yaml`

## Akzeptanzkriterien

- [x] Ein geeignetes Schiff kann nur einen persönlich entdeckten, von seinem echten Rumpf verschiedenen Spacecraft-Rumpf wählen.
- [x] Aktivierung kostet `25 × Antriebsstufe` EPS und hält fünf Minuten; fehlende EPS oder ein defekter Antrieb verhindern sie.
- [x] Nur nach der Aktivierung erzeugte Flugsignaturen tragen den maskierten Rumpf; Eigentümer-, Zeit- und Richtungsdaten bleiben unverändert.
- [x] Nach Ablauf oder Deaktivierung werden wieder echte Rumpfdaten verwendet; bestehende Signaturen bleiben historische Snapshots.
- [x] Shared-DTOs und Schiff-UI zeigen Auswahl, Kosten und verbleibende Dauer.
- [x] Service- und Integrationstests decken Wissen, Kosten, Ablauf und Signaturdarstellung ab.

## Triage und Umsetzungsvertrag

`FlightSignatureService.createMovement` speichert bereits historische Rumpf-ID/-Namen; Maskierungszustand fehlt. Persönliche Schiffsrumpfkenntnis existiert in `ship_class_discoveries`/`ShipClassDiscoveryService`. Stationskenntnis liegt separat vor und ist kein gültiger Ersatz für Schiffsrumpfkenntnis.

Die STU-Quelle berechnet `25 × defaultLevel(WARPDRIVE)` des **imitierten Rumpfs**, nicht des eigenen eingebauten Antriebs. So ist die bisher ungenaue Formulierung „Antriebsstufe“ auszulegen. Fünf Minuten werden per Ablaufzeit geprüft. Nach ADR-0006 gibt es keinen zeitbasierten Warpflug mehr; qualifiziert ist ein mobiles Schiff mit intaktem aktivem Hyperantrieb im Galaxieraum. Kein neues separat herstellbares Maskierungsmodul erforderlich: STU bindet die Aktion an den Antrieb.

## Ergänzte Akzeptanzkriterien

- [x] Auswahl stammt aus persönlicher Schiffsrumpfentdeckung und enthält nur mobile Rümpfe mit vorhandenem positivem Standard-Antriebslevel; keine Stationen, unbekannten IDs, eigener Rumpf oder stiller Level-Fallback. Das Standardlevel wird über die zugeordnete STU-Rumpf-ID aus `game-data/data/ship-building/stu-rump-module-rules.yaml` (`HYPERDRIVE.level`) und `GameDataService` bezogen, nicht aus `warpdriveBase`. SWU-eigene Rümpfe ohne ausdrücklichen Regelwert stehen nicht zur Auswahl.
- [x] API liefert Vorschau der exakt aus dem Zielrumpf berechneten Kosten. Aktivierung prüft Eigentum, Ort, Antriebszustand und EPS unter Schiffssperre; Fehlschlag verändert weder EPS noch Maskierungszustand.
- [x] Zustand speichert Zielrumpf-ID und Ablaufzeit. Deaktivierung ist kostenlos; erneute Aktivierung berechnet erneut volle Kosten und ersetzt das Zeitfenster. Ein defekter/abgeschalteter Antrieb beendet die Maskierung; Reparatur aktiviert sie nicht von selbst.
- [x] Sämtliche Signatur-Erzeuger verwenden dieselbe Snapshot-Funktion (System-/Galaxieflug, Ein-/Austritt, Wurmloch, Sonderbewegungen soweit dort der Antrieb qualifiziert ist). Vor Erzeugung werden Ablauf und Antriebszustand geprüft. Alterung, Tarnungsredaktion, Besitzer und Richtungen bleiben erhalten.
- [x] Tests mit fester Uhr prüfen einen Zielrumpf mit anderer Antriebsstufe, Wissensschutz, EPS-Rollback, Ablaufgrenze, Deaktivierung, Defekt und unveränderte alte Snapshots; Frontend testet Kostenwahl und Aktivierung.

## SWU-Anker

`flight-signature.service.ts`, `entities/flight-signature.entity.ts`, `entities/ship-class-discovery.entity.ts`, `ship-class-discovery.service.ts`, `game-data.service.ts`, `spacecraft-runtime-state.service.ts` und `ShipQuickActions.tsx`.

## Answer

Signaturmaskierung ist als Aktion am vorhandenen Hyperantrieb umgesetzt. Die geschützte GET/POST/DELETE-API liefert persönlich entdeckte mobile Zielrümpfe, deren ausdrücklich zugeordnetes `HYPERDRIVE.level` die Kosten bestimmt: **25 × Standard-Antriebslevel des imitierten Rumpfs**. Eigener Rumpf, Stationen und fehlende Zuordnungen werden ausgeschlossen. Aktivierung verlangt Galaxieraum, aktiven intakten eingebauten Hyperantrieb und genügend EPS; Schiffssperre und Transaktion schützen konkurrierende Aktivierungen. Erneuerung bezahlt volle Kosten und ersetzt die fünf Minuten, Deaktivierung ist kostenlos.

Der gemeinsame `FlightSignatureService` erstellt historische Snapshots mit maskierter Rumpf-ID und Namen. Besitzer, Schiffsname, Zeit, Richtungen, Alterung und Tarnungsregeln bleiben erhalten. Separater Zustand in `spacecraft_signature_masks` und Datenbanktrigger beenden die Maskierung bei Abschaltung, Defekt oder Ausbau dauerhaft, auch wenn vor der nächsten Signatur repariert oder reaktiviert wird. Veraltete Schiffssaves können die Maskierung nicht wiederherstellen. Bestehende Bewegungstransaktionen werden weiterverwendet.

Die Schiffsschnellaktionen öffnen die Rumpfauswahl mit EPS-Vorschau, Aktivierung, kostenloser Deaktivierung und Restdauer. Keine neuen Fertigungsmodule oder Spieldaten nötig.

## Validation

- `npx nx affected -t lint typecheck test --base=HEAD --parallel=2`: grün; Backend **241 Suites / 2.337 Tests**, Frontend **126 Dateien / 859 Tests**, einschließlich vier neuer UI-Tests. Lint ohne Fehler; vorhandene Warnungen bleiben.
- `npx nx run backend:test-integration --testPathPatterns='signature-mask|movement-concurrency|fleet-leadership|ion-storm-effects|navicomputer|wormhole'`: **7 Suites / 183 PostgreSQL-Tests bestanden**. Die 18 Maskierungsfälle prüfen Kostenbasis, persönliche Kenntnis, Eigentum, EPS-Konkurrenz/Rollback, Ablaufgrenze, Historie, Antriebsausfall/-ausbau, gesperrte Zustände und Bewegungstransaktionen. Der Produktions-HTTP-Test prüft Anmeldung, Fremdeigentum und ungültige Rumpf-IDs.
- `npx nx run-many --targets=build`: alle drei Projekte grün. Anschließender erzwungener Backend-Deklarationsbuild grün.
- Migration `SignatureMasking1794873600000` über disposable PostgreSQL frisch geprüft und mit `npm run typeorm:migrate` in die lokale Dev-DB eingespielt.
- Breiter Lauf deckte fehlende echte Maskierungs-/Kampfberichtprovider in der Wurmloch-Fixture sowie fehlende `AllianceDepot`-Metadaten im Produktions-Datasource auf. Die sechs Allianzbereinigungsfehler wurden auch ohne SPEC-5 reproduziert; vorhandene Entity registriert und durch Produktions-HTTP-Test abgesichert. Danach ist der komplette breite Lauf grün.

## Comments

- 2026-11-16 – Triage: Kostenbasis anhand STU geklärt, vorhandene Wissens-/Snapshot-Infrastruktur identifiziert. Kein Produktentscheid oder neues Modul nötig; keine Feature-Fertigstellung behauptet. Siehe [Audit](../triage-2026-11-16.md).

- 2026-11-16 – SPEC-5 vollständig umgesetzt und validiert; Triagevertrag erfüllt. Nächstes unmittelbar ausführbares Ticket: SPEC-2. Die vier ausstehenden Produktentscheidungen bleiben offen.
