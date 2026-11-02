# Regionskartographie: Messpunkte, Abschluss und Entdeckung

**Status:** ready-for-agent
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

- [ ] Eine Regionsplanung ist nur auf einem Galaxiefeld mit zugeordneter Region möglich; Betreten allein erzeugt keine Regionsentdeckung.
- [ ] Messpunkte werden deterministisch aus passierbaren Feldern derselben Region gewählt, die außerhalb von Sternensystemen liegen, nicht das aktuelle Feld sind und kein `NO_MEASUREPOINT` tragen.
- [ ] Ein Regionsplan verwendet höchstens fünf geeignete Messpunkte, analog zum bestehenden begrenzten SWU-Systemablauf; existieren weniger, werden alle verwendet. Das ist eine bewusste Abweichung von STUs 25-%-Regel.
- [ ] Ankunft auf einem passenden Galaxiefeld beansprucht den Messpunkt genau einmal, vergibt die bestehenden Wegpunktfolgen und setzt den Plan nach dem letzten Punkt auf `MEASURED`.
- [ ] Finalisierung verlangt dieselben Schiffs-, Orts-, EPS- und Zeitregeln wie Systemkartographie; Bewegung während der Finalisierung bricht sie entsprechend dem bestehenden Vertrag ab.
- [ ] Der erfolgreiche Abschluss legt in einer Transaktion genau eine `RegionDiscovery` mit Herkunft `CARTOGRAPHY` an, vergibt einmalig `CARTOGRAPHY_REGION` (5) samt Prestigelog und sendet die passende Regionsnachricht.
- [ ] Wiederholung, parallele Ticks oder erneute Finalisierung duplizieren weder Entdeckung noch Prestige oder Abschlussnachricht.
- [ ] Bestehende Systemkartographie bleibt unverändert und vollständig grün.
- [ ] Backend-Tests decken Auswahl und Ausschlüsse, maximal fünf Punkte, Ankunft, Abbruch, Abschluss, Transaktionsrollback, Parallelität sowie Idempotenz von Entdeckung, Prestige und Nachricht ab.

## Entscheidung

Regionsentdeckung entsteht ausschließlich beim erfolgreichen Abschluss. SWU bewahrt den etablierten begrenzten Kartographieablauf mit maximal fünf Messpunkten statt STUs potenziell großer 25-%-Route.
