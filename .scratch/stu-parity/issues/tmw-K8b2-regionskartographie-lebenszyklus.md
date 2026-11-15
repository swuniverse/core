# Regionskartographie: Messpunkte, Abschluss und Entdeckung

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** tmw-K8b1, tmw-K3c

## Ziel

Schiffe auf Galaxiefeldern planen und vollenden eine Regionskartographie über den gemeinsamen Kartographie-Lebenszyklus. Der Abschluss erzeugt genau eine persönliche Regionsentdeckung und vergibt einmalig 5 Prestige.

## STU-Quellen

- `src/Module/Ship/Action/AstroMapping/PlanAstroMapping.php`
- `src/Module/Ship/Action/AstroMapping/StartAstroMapping.php`
- `src/Module/Spacecraft/Lib/Movement/Component/Consequence/Flight/AstroMappingConsequence.php`
- `src/Module/Tick/Spacecraft/Handler/FinishedAstroMappingHandler.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/cartography-plan.service.ts`
- Bewegungsankunft und Tick-Finalisierung in `apps/backend/src/modules/spacecraft/spacecraft.service.ts`
- `apps/backend/src/modules/starmap/entities/galaxy-field.entity.ts`
- `apps/backend/src/modules/prestige/prestige.constants.ts`
- Zielmodell und `RegionDiscovery` aus `tmw-K8b1`

## Akzeptanzkriterien

- [x] Eine Regionsplanung ist nur auf einem Galaxiefeld mit zugeordneter Region möglich; Betreten allein erzeugt keine Regionsentdeckung.
- [x] Messpunkte werden deterministisch aus passierbaren Feldern derselben Region gewählt, die außerhalb von Sternensystemen liegen, nicht das aktuelle Feld sind und kein `NO_MEASUREPOINT` tragen.
- [x] Ein Regionsplan verwendet höchstens fünf geeignete Messpunkte, analog zum bestehenden begrenzten SWU-Systemablauf; existieren weniger, werden alle verwendet. Das ist eine bewusste Abweichung von STUs 25-%-Regel.
- [x] Ankunft auf einem passenden Galaxiefeld beansprucht den Messpunkt genau einmal, vergibt die bestehenden Wegpunktfolgen und setzt den Plan nach dem letzten Punkt auf `MEASURED`.
- [x] Finalisierung verlangt dieselben Schiffs-, Orts-, EPS- und Zeitregeln wie Systemkartographie; Bewegung während der Finalisierung bricht sie entsprechend dem bestehenden Vertrag ab.
- [x] Der erfolgreiche Abschluss legt in einer Transaktion genau eine `RegionDiscovery` mit Herkunft `CARTOGRAPHY` an, vergibt einmalig `CARTOGRAPHY_REGION` (5) samt Prestigelog und sendet die passende Regionsnachricht.
- [x] Wiederholung, parallele Ticks oder erneute Finalisierung duplizieren weder Entdeckung noch Prestige oder Abschlussnachricht.
- [x] Bestehende Systemkartographie bleibt unverändert und vollständig grün.
- [x] Backend-Tests decken Auswahl und Ausschlüsse, maximal fünf Punkte, Ankunft, Abbruch, Abschluss, Transaktionsrollback, Parallelität sowie Idempotenz von Entdeckung, Prestige und Nachricht ab.

## Entscheidung

Regionsentdeckung entsteht ausschließlich beim erfolgreichen Abschluss. SWU bewahrt den etablierten begrenzten Kartographieablauf mit maximal fünf Messpunkten statt STUs potenziell großer 25-%-Route.

## Comments
- 2026-11-15: Maintainer-Entscheidung „wie STU“ für die Messpunkte. Statt höchstens fünf deterministischer Punkte wählt die Planung zufällig ceil(25 %) der passierbaren Felder der Region ohne `NO_MEASUREPOINT`, ohne das aktuelle Feld (`MapRepository::getRandomMapIdsForAstroMeasurement`, `REGION_MAP_PERCENTAGE`). Systemfelder auf der Galaxiekarte schließt STU nicht aus, daher auch hier nicht. Die Kriterien zu Auswahl und Höchstzahl gelten in dieser STU-Fassung als erfüllt.
- Umsetzung: Ziel ist im System das System, auf einem Galaxiefeld mit Region die Region (STU `PlanAstroMapping`). Planen, Finalisieren (15 EPS, Laborvoraussetzungen, Bereitschaft/untätig), Statusanzeige und Messpunktkoordinaten laufen über den gemeinsamen Zielvertrag. Der Galaxieflug beansprucht Regionsmesspunkte des Leaders genau einmal: 1 Prestige, Nachricht, nach dem letzten Punkt `MEASURED`. Galaxieflug und Systemeintritt brechen eine laufende Finalisierung ab, der Tick bricht ab, sobald das Schiff nicht mehr in der Planregion steht. Der dritte Tick legt in einer Transaktion genau eine `RegionDiscovery` an, bucht `CARTOGRAPHY_REGION` (5) samt Prestigelog und die Regionsnachricht (Benachrichtigung nach Commit). Ein Fehler rollt alles zurück; parallele oder wiederholte Ticks bleiben einmalig, eine zwischenzeitliche Entdeckung endet ohne Belohnung. Die Systemkartographie bleibt unverändert.
