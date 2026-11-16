# Ressourcen-Umwandlungssystem (Pendant zum STU-Aggregationssystem)

**Status:** resolved
**Priority:** P3
**Size:** M
**Blocked by:** sc-WP-RES-1

## Ziel

STU wandelt mit dem Aggregationssystem gesammelte Rohstoffe im Tick in Folgewaren um (auch als Stationsaktion `TransformResources`), sofern der Spieler die Zielware produzieren kann. Umsetzung des SW-Pendants (Name nach Leitplanke 2, in `map.md` dokumentiert) nach Entscheidung in sc-WP-RES-1.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Component/Spacecraft/System/Type/AggregationSystemShipSystem.php`, `Module/Tick/Spacecraft/Handler/AggregationSystemHandler.php`
- `Module/Station/Action/TransformResources` (Zielware nur, wenn produzierbar: `canProduceCommodity`)
- `Module/Spacecraft/View/ShowSystemSettings/*`, `html/ship/aggregationsystem.twig`

## SWU-Pfade

- Sammelsystem aus sc-WP-RES-1, `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`processTick`)
- `apps/backend/src/modules/game-data/game-data.service.ts` (Produzierbarkeit über Gebäude)
- `game-data/data/modules/` (Submodul)

## Akzeptanzkriterien

- [x] Modul, Laufzeitsystem und Einstellungsfenster (Quell-/Zielware) mit STU-Umwandlungstabelle.
- [x] Umwandlung im Tick nur für Waren, die der Spieler laut Gebäuden produzieren kann; sonst Meldung.
- [x] Gleiche Aktion an Stationen (sofern sc-WP-STAT-2 erledigt).
- [x] Backend-Tests, Frontend-Test.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments


## Answer

Das STU-Aggregationssystem heißt in SWU **Molekular-Raffinerie**: Ware 19012, fertigbares SPECIAL-Modul nach „Antriebsmodule Stufe I“ für beide Fraktionen und konkretes Laufzeitsystem `RESOURCE_CONVERTER`. Die gemeinsame Schiffskontrolle zeigt Quell- und Zielwaren mit vollständigen Chargengrößen, gruppiert nach Partikelkompressor und Sublimator, Forschungsfreigabe, Status sowie Start/Stop. Schiffe und Stationen verwenden denselben Eigentümer-geschützten Dienst und ihr normales Lager.

Alle zehn STU-Umwandlungen bleiben mit originalen Warenreferenzen und Mengen erhalten. Die bisher fehlenden Rohwaren 63–72 sind mit SW-Namen im Warenkatalog ergänzt; unveränderte Standard-Nebel bieten die Gas-/Energiepartikel, Standard-Asteroidenfelder die Metallpartikel mit jeweils 100 Einheiten/Tick. Die Datenmigration ergänzt nur die bisherigen exakten Standardkonfigurationen, bewahrt individuelle Einstellungen und lässt bestehende direkte Gas-/Erzförderung erhalten.

Produzierbarkeit folgt der tatsächlichen STU-Implementierung von `canProduceCommodity`: Eine positive Ausgabe eines durch abgeschlossene eigene Forschung freigeschalteten Gebäudetyps genügt, ein gebautes Koloniegebäude ist nicht erforderlich. Forschungsfreie Gebäude erlauben ihre positiven Ausgaben unmittelbar. Eingaben, Nullausgaben, fremde oder unvollständige Forschung geben keine Ware frei. Die Prüfung erfolgt vor Aktivierung und erneut bei jedem Tick.

Aktivierung kostet einmalig 15 EPS, aktive Ticks kosten 10 EPS über den gemeinsamen Energiefluss. Umschalten der Auswahl kostet bei bereits aktiver Raffinerie keine weiteren Aktivierungs-EPS. Fehlendes/zerstörtes Modul, Cooldown, unzureichende Besatzung, Standby oder nicht einsatzbereiter Zustand verhindern die Aktivierung; generisches Systemumschalten kann die Auswahlprüfung nicht umgehen.

Je Tick wird nach Energiefluss und Kollektor-Förderung genau eine vollständige Charge transaktional umgewandelt. Schiffs-, Modul-, Forschungs- und Frachtsperren mit NOWAIT verhindern konkurrierende Teiländerungen. Die Lagergrenze wird nach Abzug der Quelle und Hinzufügen des Ziels anhand tatsächlicher Fracht geprüft. Fehlende Rohstoffe oder Lagerplatz verursachen eine Meldung und erhalten die gesamte Charge. Energieabschaltung oder entfallene Produktionsfähigkeit beenden die Auswahl ohne Verbrauch; Nachrichten werden erst nach erfolgreichem Commit ausgeliefert. Ein Ferengi-Modulbonus wird mangels entsprechender SWU-Fraktion nicht eingeführt.

## Validation

- Vollständiges `nx affected -t lint typecheck test --base=HEAD --parallel=2`: grün; Backend 237 Suites / 2293 Tests, Frontend 117 Dateien / 821 Tests, Lint ohne Fehler.
- `nx run backend:test-integration --runInBand --testPathPatterns='resource-conversion|resource-collection'`: 48 PostgreSQL-Tests grün (28 Raffinerie, 20 Kollektor). Alle Chargen, Stationsaktion, Forschung vor Start und im Tick, positive Gebäudeausgaben, volle/zu kleine Lager, fehlende Teilcharge, Energieabschaltung, Fremdzugriff, NOWAIT, Nachrichten-Rollback, gemeinsame Förderung/Umwandlung und Migration mit geschützten individuellen Feldressourcen geprüft.
- API-Validierung und Authentifizierung sowie fehlende Phantom-Laufzeitsysteme durch Backend-Tests geprüft. Frontend prüft über `ShipControlCenter` Auswahl/Chargen, Start/Stop, Forschungs- und Energiesperren, fehlendes Modul und sichtbare API-Fehler.
- `nx run-many --targets=build`: alle drei Builds grün; Backend-Deklarationen anschließend erfolgreich regeneriert.
- Modul/Rezept/Ware, alle Umwandlungswaren und Forschung beider Fraktionen konsistent; jede Zielware besitzt positive Gebäudeproduktion. Zusätzlicher Game-Data-Validator meldet ausschließlich die bekannten 14 fehlenden Stations-Rumpfwerte; Moduldateien gültig.
- Datenmigration `SeedConversionMiningResources20261116150000` auf lokaler Dev-DB angewendet; Rohwaren an Nebel/Asteroidenfeld/-cluster nachgewiesen.

## Comments

- 2026-11-16: Molekular-Raffinerie mit originalen STU-Chargen, Forschungsfreigabe, Schiff-/Stationsaktion und sammelbaren Rohwaren vollständig umgesetzt und validiert.
