# Plan: Gebäudewerte für Chemiefabrik und Transparistahl-Werk korrigieren

## Context

Bei den Gebäuden fallen zwei Fehler auf:

- `Chemiefabrik` zeigt/produziert aktuell `+12 Chemische Komponenten`, soll aber nur `+3` produzieren.
- Beim `Transparistahl-Werk` wird der Verbrauch von `Chemische Komponenten` als `+-3/Tick` angezeigt; korrekt soll `-3/Tick` sein.

Erste Code-Sichtung zeigt, dass beide Themen wahrscheinlich getrennte Ursachen haben: ein Datenwert in den Building-YAML-Daten und eine Formatierungslogik in der UI. Zusätzlich soll im Zuge der Änderung ein schneller Plausibilitätscheck über alle weiteren Gebäudewerte erfolgen, damit ähnliche Ausreißer oder Vorzeichenfehler direkt auffallen.

## Approach

- Den Produktionswert der `Chemiefabrik` direkt in den Gebäudedaten von `12` auf `3` korrigieren.
- In `apps/frontend/src/pages/colonies.tsx` einen kleinen lokalen Formatter für signed resource rates ergänzen, z. B. `formatSignedAmount(value)`, der nur für positive Werte `+` voranstellt und negative Werte unverändert als `-3` ausgibt.
- Die drei vorhandenen Anzeigen für Gebäude-/Kolonieproduktion auf diesen Formatter umstellen.
- Bestehende Datenlade- und UI-Patterns wiederverwenden; keine neue Ressourcenlogik einführen.
- Alle weiteren Gebäude in `game-data/data/buildings/buildings.yaml` gegen den STU-Dump prüfen, nicht nur per Bauchgefühl:
  - Quelle ist der lokale STU-Dump `/Users/TMUNDIN/git/github.com/st-universe/core/dist/db/stu.dump`.
  - `stu_buildings_commodity` ist die Referenz für Gebäudeproduktion/-verbrauch pro Tick (`buildings_id`, `commodity_id`, `count`).
  - `stu_buildings` ist die Referenz für Bauzeit, Lager/Energie/Bevölkerungswerte; relevante Spalten laut Schema sind u. a. `lager`, `eps_cost`, `eps`, `eps_proc`, `bev_pro`, `bev_use`, `buildtime`.
  - `stu_buildings_cost` bleibt Referenz für Baukosten, falls bei der Prüfung Kostenauffälligkeiten sichtbar werden.
  - negative `count`-Werte sind Verbrauch und müssen in der UI korrekt als negative Werte erscheinen.
  - eindeutige Abweichungen bei bereits gemappten SWU-Gebäuden korrigieren; unklare Balancing-Entscheidungen nicht erraten, sondern im Abschluss auflisten.

## Files to modify

- `game-data/data/buildings/buildings.yaml`
- `apps/frontend/src/pages/colonies.tsx`
- Optional `plans/building-resource-display-fix.md` oder eine kurze Notiz im Abschluss, um den STU-Dump-Abgleich der übrigen Gebäude zu dokumentieren.
- Keine Testdatei zwingend geplant; `apps/frontend/src/app/app.spec.tsx` existiert, aber keine spezifischen Tests für `colonies.tsx`/Building Cards gefunden.

## Reuse

- Bestehende Gebäudedatenstruktur in `game-data/data/buildings/buildings.yaml`:
  - `production`-Einträge können positive Produktion und negative Verbräuche enthalten.
  - `Chemiefabrik` nutzt `commodityId: 3` für `Chemische Komponenten`.
  - `Transparistahl-Werk` nutzt aktuell `commodityId: 3, amount: -3` und `commodityId: 4, amount: 4`.
  - Weitere negative Produktions-/Verbrauchswerte existieren bereits und müssen durch denselben UI-Fix korrekt dargestellt werden: `Forschungszentrum` (`-1`), `Werfthub` (`-1`), `Solarsatellit` (`-1`), `Iridium-Mine` (`-1`), `Durastahl-Verarbeitung` (`-6`).
- STU-Dump-Quellen und bereits gefundene Referenzwerte:
  - Dump-Datei: `/Users/TMUNDIN/git/github.com/st-universe/core/dist/db/stu.dump`.
  - Schema bestätigt per `pg_restore --schema-only`: `stu_buildings_commodity(buildings_id, commodity_id, count, id)`.
  - `61030100 Chemiefabrik` hat in `stu_buildings_commodity` `commodity_id=3, count=3`; das bestätigt die Korrektur `12 -> 3`.
  - `62020100 Aluminiumwerk` hat `commodity_id=3, count=-3` und `commodity_id=4, count=4`; das bestätigt die Daten des `Transparistahl-Werk`, nur die UI-Anzeige ist falsch.
  - Weitere direkt geprüfte STU-Referenzwerte: `61110100 Iridium-Mine` `11:+4, 1511:-1`; `63110100 Duraniumanlage` `20:-6, 21:+4`; `71010100 Forschungslabor` `1700:+1`; `72010100 Forschungszentrum (Level 1)` `1700:-1, 1701:+1`; `21020100 Algenfarm` `1300:+56`.
- Bestehende Anzeigeorte in `apps/frontend/src/pages/colonies.tsx`:
  - Feld-Detailbox um Zeile ~717: `Produziert: ... +${p.amount}`.
  - Gebäude-Baukarte um Zeile ~986: `+{p.amount}/Tick`.
  - Kolonie-Übersicht um Zeile ~810: `+{delta.amount}` für aggregierte Produktionsdeltas.
- Bestehende Backend-Berechnung in `apps/backend/src/modules/colony/colony.service.ts` gibt `productionDeltas` bereits mit signed `amount` aus; keine Backend-Logikänderung für das Vorzeichen nötig.

## Steps

- [x] Gebäudedaten für `Chemiefabrik` und `Transparistahl-Werk` in `game-data/data/buildings/buildings.yaml` lokalisieren.
- [x] Ursache 1 bestätigt: `Chemiefabrik.production[commodityId=3].amount` steht auf `12`.
- [x] Ursache 2 wahrscheinlich: `Transparistahl-Werk.production[commodityId=3].amount` ist bereits `-3`; die Anzeige `+-3/Tick` spricht für UI-Formatierung statt falscher Daten.
- [x] UI-Stellen für Gebäude-Ressourcenraten gefunden: `apps/frontend/src/pages/colonies.tsx`.
- [x] Kein zentraler signed-value-Formatter in der Datei gefunden; Plan ist, einen kleinen lokalen Helper zu ergänzen und die drei Anzeigeorte darauf umzustellen.
- [x] STU-Dump-Abgleich für alle aktuell in `buildings.yaml` vorhandenen/gemappten Gebäude durchführen und dokumentieren. Vorgehen: passende STU-`buildings_id`/Raw-Namen aus `stu-research-tree.yaml`/Dump heranziehen, dann `stu_buildings_commodity` gegen `production`, `stu_buildings.buildtime` gegen `costs.buildTime` und bei Bedarf `stu_buildings_cost` gegen `resourceCosts` vergleichen.
- [x] Bereits bestätigte Korrektur: `Chemiefabrik`-Wert von `12` auf STU-Dump-Wert `3` ändern.
- [x] Falls der STU-Dump bei weiteren gemappten Gebäuden eindeutige Abweichungen zeigt, diese ebenfalls ändern; falls ein SWU-Gebäude absichtlich abstrahiert ist oder keine eindeutige STU-Quelle hat, nicht blind ändern und im Abschluss nennen.
- [x] `formatSignedAmount(value: number): string` nahe `formatBuildTime` ergänzen.
- [x] Feld-Detailbox `Produziert: ...` von `+${p.amount}` auf Formatter umstellen.
- [x] Gebäude-Baukarte von `+{p.amount}/Tick` auf Formatter umstellen und optional negative Werte rot anzeigen.
- [x] Kolonie-Produktionsübersicht von `+{delta.amount}` auf Formatter umstellen und optional negative Werte rot anzeigen.
- [x] Falls im Zuge der Umsetzung sinnvoll, einen sehr kleinen Formatter-Test extrahieren/ergänzen; sonst über Typecheck und manuelle UI-Prüfung verifizieren.

## Verification

- `npx nx typecheck frontend` ausführen.
- Optional `npx nx test frontend` ausführen, falls die lokale Testlaufzeit akzeptabel ist.
- Optional `npx nx typecheck backend` ausführen, um sicherzustellen, dass die YAML-Datenstruktur weiterhin geladen werden kann.
- Manuell in der Gebäudeansicht prüfen:
  - `Chemiefabrik`: `Chemische Komponenten +3/Tick`.
  - `Transparistahl-Werk`: `Chemische Komponenten -3/Tick` und keine Anzeige `+-3/Tick`.
  - Positive Produktion des Transparistahl-Werks wird weiterhin mit `+` angezeigt.
  - Weitere Gebäude mit Verbrauchswerten (`Forschungszentrum`, `Werfthub`, `Solarsatellit`, `Iridium-Mine`, `Durastahl-Verarbeitung`) zeigen negative Werte ohne doppeltes Vorzeichen.
- Nach dem STU-Dump-Abgleich kurz zusammenfassen:
  - welche `buildings.yaml`-Werte gegen welche STU-`buildings_id` geprüft wurden,
  - ob neben der `Chemiefabrik` weitere Gebäudewerte geändert wurden,
  - welche Gebäude ggf. nicht eindeutig gegen STU gemappt werden konnten.

## STU-Dump-Abgleich (Ausführung)

Quelle: `/Users/TMUNDIN/git/github.com/st-universe/core/dist/db/stu.dump`, geprüft über `pg_restore` gegen `stu_buildings`, `stu_buildings_commodity` und `stu_buildings_cost`.

- `Baumaterialfabrik` -> STU `61010100` (`Baumaterialfabrik`): Produktion, Bauzeit und Baukosten OK.
- `Solarzellen` -> STU `31010100` (`Solarzellen`): Produktion, Bauzeit und Baukosten OK.
- `Farm` -> STU `21010100` (`Farm`): Produktion, Bauzeit und Baukosten OK.
- `Chemiefabrik` -> STU `61030100` (`Chemiefabrik`): Produktion abweichend; SWU `commodityId=3 amount=12`, STU `commodity_id=3 count=3`. Bauzeit und Baukosten OK.
- `Transparistahl-Werk` -> STU `62020100` (`Aluminiumwerk`): Produktion/Verbrauch `3:-3`, `4:+4`, Bauzeit und Baukosten OK.
- `Wohnhaeuser` -> STU `11010100` (`Häuser`): Produktion, Bauzeit und Baukosten OK.
- `Forschungslabor` -> STU `71010100` (`Forschungslabor`): Produktion, Bauzeit und Baukosten OK.
- `Forschungszentrum` -> STU `72010100` (`Forschungszentrum (Level 1)`): Produktion/Verbrauch, Bauzeit und Baukosten OK.
- `Werfthub` -> STU `85010100` (`Werfthub`): Produktion/Verbrauch, Bauzeit und Baukosten OK.
- `Torpedofabrik` -> STU `81990100` (`Torpedofabrik`): Produktion, Bauzeit und Baukosten OK.
- `Lager` -> STU `81210100` (`Lager`): Produktion, Bauzeit und Baukosten OK.
- `Raumbahnhof` -> STU `81120100` (`Raumbahnhof`): Produktion, Bauzeit und Baukosten OK.
- `Solarsatellit` -> STU `31910100` (`Solarsatellit`): Produktion/Verbrauch, Bauzeit und Baukosten OK.
- `Iridium-Mine` -> STU `61110100` (`Iridium-Mine`): Produktion/Verbrauch, Bauzeit und Baukosten OK.
- `Durastahl-Verarbeitung` -> STU `63110100` (`Duraniumanlage`): Produktion/Verbrauch, Bauzeit und Baukosten OK.
- `Koloniezentrale`, `Kaserne` und `Verteidigungsposten`: kein eindeutiges aktuelles SWU-zu-STU-Mapping in dieser Prüfung; nicht blind geändert.

Ergebnis: Eindeutige Abweichung nur bei `Chemiefabrik`; Korrektur auf STU-Wert `+3` ist erforderlich. Das `Transparistahl-Werk` ist datenmäßig korrekt; der Fehler ist reine UI-Vorzeichenformatierung.
