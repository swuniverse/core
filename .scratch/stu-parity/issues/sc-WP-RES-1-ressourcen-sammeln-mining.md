# Ressourcen am Feld sammeln (Mining mit Sammelsystem)

**Status:** resolved
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

STU sammelt Ressourcen an geeigneten Kartenfeldern (Nebel, Asteroiden) über den Bussard-Kollektor: Das Schiff wählt eine Ressource am Feld, sammelt im Tick (Zustand `GATHER_RESOURCES`) und bricht beim Flug ab. Ob SWU Mining will und welche Felder/Waren abbaubar sind, ist offen.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Ship/Action/Mining/GatherResources.php` (Bussard-Kollektor nötig, nicht im Warp, Ortswahl, Aktivierung)
- `Component/Ship/Mining/CancelMining.php`
- `Component/Spacecraft/System/Type/BussardCollectorShipSystem.php`, `Module/Tick/Spacecraft/Handler/BussardCollectorHandler.php`, `html/ship/bussardcollector.twig`

## SWU-Pfade

- `apps/backend/src/modules/starmap/entities/galaxy-field-type.entity.ts`, `galaxy-field.entity.ts` (Feldressourcen fehlen)
- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`processTick`, Flug), `packages/shared/src/lib/spacecraft/index.ts`
- `game-data/data/modules/` (Sammelsystem-Modul, Submodul)

## Akzeptanzkriterien

- [x] Feldtypen tragen abbaubare Waren und Raten (Nebel → Tibanna-Gas bzw. weitere Gase, Asteroidenfelder → Erze; Daten in `game-data` bzw. Admin-Editor).
- [x] Sammelsystem-Modul mit SW-Name (Leitplanke 2, in `map.md` dokumentiert) und Laufzeitsystem; Systemeinstellungsfenster zur Ressourcenwahl.
- [x] Sammeln im Tick bis Lager voll; Flug bricht ab (Meldung).
- [x] Backend-Tests, Frontend-Test.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Vorgabe: Variante (a), wie STU mit Star-Wars-Waren: Nebel liefern Gase (insbesondere Tibanna-Gas), Asteroidenfelder Erze; Sammeln per Spezialsystem (Pendant zum Bussard-Kollektor, Name nach Leitplanke 2). sc-WP-RES-2 bleibt damit im Scope.

## Comments

- 2026-10-21 Product Owner: Option a – SWU erhält Ressourcensammeln wie STU: Nebel liefern Gase (Tibanna-Gas), Asteroidenfelder Erze, gesammelt per Spezialsystem.
- 2026-11-06: Maintainer bestätigt die öffentlichen Test-Seams: (1) Backend-Service/API für Auswahl, Start, Tickfortschritt und Flugabbruch, (2) Admin-Feldtyp-API für abbaubare Waren und Raten, (3) `ShipControlCenter` als Frontend-Seam für Auswahl und Status. Produktumfang laut bestehender Entscheidung bleibt unverändert.


## Answer

`Ressourcen-Kollektor` als Star-Wars-Pendant zum Bussard-Kollektor umgesetzt: Spielerware 19011, Spezialsystem `RESOURCE_COLLECTOR` und Fertigung nach „Antriebsmodule Stufe I“ für beide Fraktionen. Die gewählte Ressource und das Sammelfeld bleiben im Laufzeitsystem gespeichert; die API meldet `GATHER_RESOURCES` bzw. `IDLE`.

Feldtypen tragen editierbare Waren und Förderraten (`miningResources`, JSONB). Die Migration initialisiert Nebel mit Tibanna-Gas und Asteroidenfelder/-cluster mit Phrik- und Cortosis-Erz (je 100 Einheiten/Tick). Der Karteneditor kann die Liste und Raten je Feldtyp konfigurieren; die API verlangt Karteneditorrechte und validiert bekannte beamfähige Waren, eindeutige Auswahlen und Raten von 1 bis 1000.

Die Schiffskontrolle bietet Ressourcenwahl, Start/Stop, Zustand, Förderraten, freien Lagerraum und konkrete Sperrgründe. Aktivierung kostet einmalig 15 EPS, der laufende Kollektor 10 EPS je Tick über die vorhandene Energieflusslogik. Es gelten STU-Regeln: intaktes Modul, Besatzung, aktive intakte NBS, keine Schilde/Tarnung/Hyperantrieb/Traktorbindung, kein Andocken, Standby, Kampf oder Alarm Rot. Generisches Systemumschalten kann die Aktivierungsprüfung nicht umgehen.

Der Tick fördert die gewählte Ware transaktional unter Schiffs-, Modul-, Feldtyp- und Frachtsperren, begrenzt durch den tatsächlichen freien Lagerraum. Volles Lager stoppt das Sammeln mit Meldung. Energieabschaltung, ungültige Voraussetzungen oder geänderte Feldressourcen beenden es ohne weitere Förderung. Der gemeinsame Einflug-Hook stoppt nach echter Bewegung, einschließlich Wurmloch- und Navicomputer-Sprüngen, mit Meldung; abgelehnte Bewegung lässt das Sammeln bestehen. Standortprüfung im Tick fängt externe Verlegungen ab.

## Validation

- `nx affected -t lint typecheck test --base=HEAD --parallel=2`: grün; Backend 236 Suites / 2285 Tests, Frontend 116 Dateien / 816 Tests; Lint ohne Fehler.
- `nx run backend:test-integration --runInBand --testPathPatterns=resource-collection`: 20 Tests grün mit PostgreSQL und echten Migrationen. Aktivierung/Umschalten/Stop, Förderung/Lagergrenzen, Brownout, Ablehnungen und Fremdzugriff, normale und Wurmlochbewegung, geänderte Feldressourcen, NOWAIT bei Frachtsperren und Rollback ohne Benachrichtigungen geprüft.
- Frontend prüft die öffentliche `ShipControlCenter`-Auswahl, Start/Stop, Sperrgrund, fehlendes Modul und API-Fehler sowie das Editieren von Feldtyp-Ressourcen.
- `nx run-many --targets=build`: alle drei Builds grün; Backend-Deklarationen danach regeneriert.
- Modul, Rezept, Ware und Forschungsnamen/-IDs beider Fraktionen konsistent. Zusätzlicher Game-Data-Validator meldet ausschließlich die bereits nachgewiesenen 14 fehlenden Stations-Rumpfwerte; Moduldateien gültig.
- Neue Migration `AddFieldMiningResources20261116140000` erfolgreich auf der lokalen Dev-DB angewendet und Vorgaben an Nebel/Asteroidenfeld/-cluster geprüft.

## Comments

- 2026-11-16: Implementierung mit Ressourcen-Kollektor, konfigurierbaren Feldtyp-Raten, atomarer Tickförderung und Flugabbruch abgeschlossen. sc-WP-RES-2 ist dadurch unblockiert; Umwandlung wird im eigenen Ticket umgesetzt.
