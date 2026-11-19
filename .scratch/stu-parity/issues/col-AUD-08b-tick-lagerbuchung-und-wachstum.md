# Kolonie-Tick: Lagerbuchung nach `commodity.sort`, Wachstum und Wohnraum wie STU

**Status:** claimed
**Priority:** P1
**Size:** M
**Blocked by:** col-AUD-08a

## Ziel

STU bucht die Produktion in der Reihenfolge `stu_commodity.sort`. Bei knappem Lager füllt es die letzte Ware anteilig auf. SWU bucht in der Reihenfolge der Gebäudeproduktion, deshalb verfallen bei vollem Lager andere Waren.

Beim Wachstum ist die Formel gleich. SWU multipliziert danach aber mit einem Fraktionsfaktor (`colonyGrowthMultiplier`, Imperium 1,1) und rundet ab. STU kennt nur den Klingonen-Faktor 1,5, für den es in SWU kein Gegenstück gibt.

Außerdem nutzt SWU `max(Wohnraum, Bevölkerung)` als Wohnraum. Dadurch setzt die Auswanderung bei Überbelegung zu spät ein.

## STU-Quellen

- `src/Module/Tick/Colony/Component/ProceedStorage.php` (Z. 43–79)
- `src/Orm/Repository/BuildingCommodityRepository.php` (Z. 92, Sortierung nach `sort`)
- `src/Component/Colony/ColonyPopulationCalculator.php` (Z. 107–135)
- `src/Module/Tick/Colony/Component/ProceedMigration.php`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-tick-processor.service.ts` (Lagerbuchung Z. 489–509, Wachstum Z. 182–227 und 674–676, Auswanderung Z. 628–661)
- `apps/backend/src/modules/colony/colony-stats.service.ts` (`maxHousing` Z. 367–370)
- `apps/backend/src/modules/faction/faction.service.ts` (`colonyGrowthMultiplier` Z. 53), `faction/entities/faction-modifier.entity.ts`
- Waren-Stammdaten mit `sort` (`apps/backend/src/modules/game-data/game-data.service.ts`)

## Akzeptanzkriterien

- [x] Produktion wird in aufsteigender `sort`-Reihenfolge der Waren ins Lager gebucht. Reicht der freie Platz nicht, wird die betroffene Ware anteilig bis zur Grenze aufgefüllt, alle späteren verfallen (wie `ProceedStorage`).
- [x] Das Wachstum entspricht STU `getGrowth` ohne SWU-Fraktionsfaktor. `colonyGrowthMultiplier` wird aus dem Tick entfernt; Feld bzw. Modifier werden entfernt oder als ungenutzt markiert (Migration, falls DB-Spalte).
- [x] Wohnraum für Wachstum und Auswanderung ist der maximale Wohnraum aktiver Gebäude (plus Grundwohnraum), nicht `max(Wohnraum, Bevölkerung)`. Bei Überbelegung greift die Auswanderung im selben Tick wie in STU.
- [x] Kolonieliste und Koloniedetail zeigen dasselbe Wachstum wie der Tick (gemeinsame Funktion, siehe col-AUD-02a).
- [x] Backend-Tests in `colony-tick.spec.ts`: volles Lager mit zwei Waren unterschiedlicher `sort`-Werte, anteilige Auffüllung, Wachstum Imperium = Rebellen, Auswanderung bei Wohnraumverlust.
- [x] Fraktionsanzeige im Frontend (falls der Wachstumsbonus irgendwo genannt wird) ist entfernt; Test dazu.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt H „Kolonie“ (Tick: Lager nach `commodity.sort`, Fraktionsfaktor, `max(Wohnraum, Bevölkerung)`).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), kleine Abweichungen „Kolonie-Tick, Lagerbuchung“ und „Bevölkerungswachstum“, Unsicherheit Nr. 2.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt.
- 2026-11-19 Product Owner: Fraktionsbonus fürs Koloniewachstum entfällt wie STU („08b, Bonus weg“).
- 2026-11-19 – umgesetzt, Prüfung ausstehend (Opus 5.5 direkt; Spielregeln im Tick mit Migration). Commit „fix(colony): book storage by commodity sort and grow like STU (col-AUD-08b)“.
  - Lagerbuchung nach `commodity.sort` (Gleichstand: ID); die erste nicht mehr passende Ware wird bis zur Grenze aufgefüllt, danach Abbruch mit einer `STORAGE_FULL`-Meldung (STU `ProceedStorage`).
  - Neue gemeinsame Funktion `calculateColonyGrowth` (`colony-stats.service.ts`) für Tick und Koloniedetail (`colony-projection.service.ts`); Wohnraum = `changeable.maxPopulation` (STU `getMaxBev`). Auswanderung vergleicht ebenfalls mit `maxPopulation`, `summary.maxHousing` (Anzeigewert inkl. Bevölkerung) bleibt nur Anzeige.
  - `colonyGrowthMultiplier` entfernt: Tick, Entity/Migration-Entity, Fraktions-Seed, Registrierungsanzeige; Migration `20261119090000-drop-faction-colony-growth-multiplier` (down legt Spalte mit Default 1 wieder an). `FactionService`-Abhängigkeit des Tick-Prozessors entfällt.
  - Tests: Wachstum Rebellen = Imperium (141), Auswanderung bei Wohnraumverlust im selben Tick, Buchungsreihenfolge mit anteiliger Auffüllung, Registrierung ohne Koloniewachstum-Bonus. `jest colony` 415/415, Registrierung 3/3, PostgreSQL mit allen Migrationen (Tick-/Anomalie-/Migrationssuites) 74/74; `tsc` Backend und Frontend (app + spec) sauber, ESLint 0 Fehler.
  - Offen für den Prüfpass: Abschlussreview, gemeinsamer Build; Kolonieliste (col-AUD-02a) nutzt die gemeinsame Funktion, sobald sie Wachstum anzeigt.

