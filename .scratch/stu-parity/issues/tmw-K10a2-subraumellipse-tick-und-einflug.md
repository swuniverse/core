# Anomalien: Subraumellipse, Tick- und Einflugwirkung

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Implementiert die Subraumellipse als ersten konkreten Anomalietyp auf Basis des Frameworks aus `tmw-K10a1`: Erzeugungsprüfung, Lebensdauer, Schildwirkung, Einflugfolgen und Benachrichtigungen.

## STU-Quellen

- `src/Component/Anomaly/Type/SubspaceEllipseHandler.php`
- `src/Orm/Repository/LocationRepository.php#getForSubspaceEllipseCreation`
- `src/Module/Spacecraft/Lib/Movement/Component/Consequence/PostFlight/AnomalyConsequence.php`

## SWU-Pfade

- Anomalie-Handler und Tick-Integration aus `tmw-K10a1`
- `apps/backend/src/modules/spacecraft/spacecraft-runtime-state.service.ts` (Schildintegrität)
- Flugfolgen-Pipeline `onEnterField` aus `tmw-K1a`
- Feldsperre `NO_ANOMALIES` aus `tmw-K3c`
- Nachrichten/Events für betroffene Schiffseigner

## Akzeptanzkriterien

- [ ] Schiffsklassen erhalten explizites Integerfeld `anomalyMass`. Eindeutig zugeordnete STU-Rümpfe übernehmen `tractor_mass`; SWU-eigene Klassen erhalten bewusst gepflegte Werte, nicht aus Kampfwerten abgeleitete Werte.
- [ ] Der Score folgt STU: mobile Schiffe zählen mit voller `anomalyMass`, Stationen mit `anomalyMass / 10`, hinzu kommen `Crewzahl × Anzahl aktiver Systeme × 100`. NPC-/Systemschiffe, Schiffe im Bau und Schiffe mit aktivem Hyperraumantrieb zählen nicht.
- [ ] Bei Score oberhalb `33_333_333` beträgt die Erzeugungschance pro Haupttick `clamp(5 + ceil(Überschuss / 1_000_000), 0, 100)` Prozent. `NO_ANOMALIES`-Felder erzeugen nie eine Anomalie.
- [ ] Der injizierbare RNG steuert die Chance mit der festgelegten inklusiven Probe `roll <= chance` sowie die Schildemitterschäden von 1–50; Tests kontrollieren beide Ergebnisse deterministisch.
- [ ] Die Lebensdauer beträgt einen Tick: Nach der Erzeugung wirkt die Ellipse im folgenden Haupttick auf alle Schiffe am Ort und verschwindet anschließend.
- [ ] Bei Wirkung werden Schilde abgeschaltet und auf 0 gesetzt; das Schildsystem nimmt 1–50 Schaden. Besitzer werden bei Erzeugung und Wirkung benachrichtigt.
- [ ] Einflugfolgen laufen über die `tmw-K1a`-Pipeline. Backend-Tests decken Scoregrenzen, Ausschlüsse, RNG, Schildwirkung, `NO_ANOMALIES`, Ablauf und Benachrichtigungen ab.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

`anomalyMass`, Scoreformel, Schwelle `33_333_333`, Erzeugungschance, RNG-Verhalten, inklusive Prozentprobe und Ein-Tick-Lebensdauer entsprechen den am 2026-10-30 dokumentierten Product-Owner-Entscheidungen in `tmw-K10a`. Keine fehlenden Schiffsklassenwerte erfinden; nicht eindeutig gemappte Werte bei der Umsetzung als fehlende autoritative Datenquelle behandeln.

## Comments

- 2026-11-06: Zweites geordnetes Child aus `tmw-K10a`; setzt `tmw-K10a1` voraus.
- 2026-11-11: Vorgänger `tmw-K10a1` ist nach Integration in `stu-parity` auf `resolved` gesetzt; dessen ursprüngliche Abhängigkeit ist damit erfüllt. Ticket wieder im `ready-for-agent`-Frontier.
- 2026-11-11: Von der Koordination für die Implementierung beansprucht (`claimed`).
