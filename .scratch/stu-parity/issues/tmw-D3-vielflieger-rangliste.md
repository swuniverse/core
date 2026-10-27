# Rangliste „Die Top 10 der Vielflieger“ (anonym)

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** sc-WP-NAV-2a

## Ziel

Die Datenbank erhält unter „Schiffe (anonym)“ die Rangliste der Vielflieger: geflogene Felder je Spieler in einem gleitenden Zeitfenster, mit Fraktion und Anzahl beteiligter Schiffe, aber ohne Spielernamen. Die STU-Belohnung `TopFlightsReward` wird übernommen: Prestige für die Plätze 1–10 in der täglichen Wartung.

## STU-Quellen

- `src/Module/Database/View/FlightRanking/*`, `src/Module/Database/Lib/DatabaseTopListFlights.php`
- `src/Orm/Repository/FlightSignatureRepository.php#getFlightsTop10`: zählt Flugsignaturen mit `to_direction != 0` im Sichtbarkeitsfenster, je Spieler mit Fraktion und `count(distinct ship_id)`.
- `src/Module/Maintenance/TopFlightsReward.php` (`PRESTIGE_REWARDS = [20, 15, 10, 7, 6, 5, 4, 3, 2, 1]`)
- `src/html/database/highscores/topFlights.twig`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`navigate`, `flyGalaxy`, `warp` → `FLOWN_FIELDS_EVENT`)
- `apps/backend/src/modules/statistics/statistic-events.ts`, `statistic-metrics.ts` (heute nur aggregiert, nicht je Spieler)
- `apps/backend/src/modules/prestige/prestige.constants.ts` (`TOP_TEN_MIN`, `TOP_TEN_MAX` sind schon definiert), `prestige.service.ts`
- `apps/backend/src/modules/database/database.service.ts` (`rankings/:key`), `apps/frontend/src/pages/database.tsx`

## Akzeptanzkriterien

- [x] `GET database/rankings/flights` liefert die Top 10 anonym: Platz, Fraktion, geflogene Felder und Anzahl der Schiffe, ohne Spieler-ID oder Namen. NPC-Konten (tmw-W1) sind ausgeschlossen.
- [x] Gezählt werden die Flugsignaturen aus sc-WP-NAV-2a (wie STU `getFlightsTop10`: Signaturen mit Abflugrichtung im Sichtbarkeitsfenster, je Spieler mit Fraktion und Anzahl verschiedener Schiffe); kein eigener Zähler. Das Zeitfenster entspricht STU.
- [x] Ein täglicher Job vergibt Prestige nach der STU-Staffel und erzeugt einen Prestigelog-Eintrag „x Prestige erhalten für Platz n unter den Vielfliegern“. Der Job ist idempotent je Tag.
- [x] Der Hub-Eintrag „Die Top 10 der Vielflieger“ steht unter „Schiffe (anonym)“ (Gliederung aus tmw-D2).
- [x] Backend-Tests: Zählung (Hyperraumflug und Systemflug), Anonymisierung, Zeitfenster und Belohnungsstaffel. Frontend-Test: Die Tabelle rendert ohne Namen.

## Entscheidung

- Quelle: Flugsignaturen aus sc-WP-NAV-2a, kein eigener Zähler.
- Belohnung: (i) `TopFlightsReward` täglich wie STU (Prestige 20, 15, 10, 7, 6, 5, 4, 3, 2, 1 für Platz 1–10), über die vorhandenen Konstanten `TOP_TEN_*`. Einhängen in den Maintenance-Job (sh-AP-07a), falls vorhanden; sonst eigener täglicher Cron.

## Comments

- 2026-10-21 Product Owner: Option a – Die Rangliste wird wie in STU aus den Flugsignaturen von sc-WP-NAV-2a abgeleitet, ohne zweite Datenquelle. Die Teilfrage zur Belohnung ((i) oder (ii)) wurde nicht beantwortet; das Issue bleibt deshalb `needs-info`.
- 2026-10-21 Product Owner: Option (i) – Die Top 10 der Vielflieger erhalten täglich Prestige nach der STU-Staffel.

## Answer

Die anonyme Vielflieger-Rangliste zählt Abflugsignaturen aus dem 48-Stunden-Sichtbarkeitsfenster, schließt NPCs aus und zeigt Platz, Fraktion, Felder und verschiedene Schiffe. Die tägliche Maintenance vergibt idempotent über den vorhandenen Tageslauf die STU-Prestigestaffel 20…1 mit Prestigelog; der Datenbank-Hub rendert die Tabelle ohne Spieleridentität.
