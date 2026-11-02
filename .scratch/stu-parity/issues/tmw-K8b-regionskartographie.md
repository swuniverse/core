# Regionskartographie

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** tmw-K8a

## Ziel

Kartenregionen lassen sich wie Sternensysteme per Messpunkt-Kartographie kartieren (STU `AstronomicalEntry.region_id`). Der Abschluss vergibt `STU_PRESTIGE.CARTOGRAPHY_REGION` (5) und erzeugt den Regions-Datenbankeintrag. Die Spec `stu-messpunkt-systemkartographie` hat Regionen bisher ausdrücklich ausgeschlossen.

## STU-Quellen

- `src/Orm/Entity/AstronomicalEntry.php` (`region_id`), `src/Module/Spacecraft/Action/AstroMapping/*`
- `src/Module/Tick/Spacecraft/Handler/FinishedAstroMappingHandler.php` („der Region …“, Datenbankeintrag der Region)
- `src/Module/Spacecraft/Lib/Movement/Component/Consequence/Flight/AstroMappingConsequence.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/cartography-plan.service.ts`, `entities/cartography-plan.entity.ts`, `spacecraft.service.ts` (`createCartographyPlan`, `processCartographyArrival`, Messpunktauswahl)
- `docs/adr/0003-messpunktbasierte-systemkartographie.md`, `.scratch/stu-messpunkt-systemkartographie/spec.md`
- `apps/backend/src/modules/prestige/prestige.constants.ts` (`CARTOGRAPHY_REGION: 5`)
- Regionsentdeckung: wird in diesem Issue angelegt und von tmw-D4 gelesen

## Akzeptanzkriterien

- [ ] Eine neue ADR `docs/adr/<nächste freie Nummer>-regionskartographie.md` (Folge-ADR zu 0003, gleiches Format) beschreibt die Regionskartographie und die Regionsentdeckung als einziges Ergebnis; `CONTEXT.md` führt die Begriffe „Regionskartographie“ und „Regionsentdeckung“. Die Spec `stu-messpunkt-systemkartographie` erhält einen Nachtrag, dass Regionen nun eingeschlossen sind.
- [ ] Eine persönliche Regionsentdeckung (Spieler × Region, idempotent, mit Zeitpunkt und Herkunft `CARTOGRAPHY`) ist per Migration angelegt.
- [ ] Ein Kartographieplan kann statt eines Systems eine Region als Ziel haben. Die Messpunkte liegen auf Regionsfeldern außerhalb von Systemen, ohne `NO_MEASUREPOINT` (tmw-K3c). Die Finalisierung folgt denselben Regeln wie für Systeme.
- [ ] Der Abschluss vergibt einmalig `CARTOGRAPHY_REGION` Prestige (mit Prestigelog) und erzeugt die Regionsentdeckung.
- [ ] Die Schiffsoberfläche zeigt außerhalb von Systemen „Region kartographieren“ mit Fortschritt.
- [ ] Backend-Tests: Plan, Messpunkte, Abschluss, Idempotenz von Entdeckung und Prestige. Frontend-Test: Aktion und Fortschritt.

## Entscheidung

Vorgabe: Variante (a). Regionen lassen sich per Messpunkt-Kartographie kartieren (neue ADR als Folge zu ADR-0003). Weil tmw-D4 mit Option (b) entschieden ist, ist der Abschluss der Regionskartographie die **einzige** Quelle der persönlichen Regionsentdeckung; eine Entdeckung durch Betreten gibt es nicht. Dieses Issue legt deshalb das Entdeckungsmodell an; tmw-D4 baut die Datenbankkategorie darauf auf.

## Comments

- 2026-10-21 Product Owner: Option a – Die Regionskartographie wird mit neuer Folge-ADR zu ADR-0003 aufgenommen; ihr Abschluss ist die einzige Quelle der Regionsentdeckung, auf der tmw-D4 aufbaut.
- 2026-10-28 Agent: Abbruch nach zwei ernsthaften Implementierungs-/Testversuchen. Das bestehende Kartographiemodell ist vollständig auf `starSystemId` und `SystemField` festgelegt; eine sichere Erweiterung auf Regionen betrifft Entity-Indizes, transaktionale Idempotenz, Tick-Ergebnisse, Flugfolgen und beide bestehenden Systemkartographie-Verträge gleichzeitig und überschreitet damit Size M. Bitte entscheiden: Soll das Issue in getrennte Teilissues (Datenmodell/Migration, Backend-Flug+Tick, Frontend) zerlegt werden, oder darf es auf Size L erweitert werden?
- 2026-10-30 Product Owner: Option 1. Das Issue wird in `tmw-K8b1` typisiertes Kartographie-Zielmodell/Migration und Regionsentdeckung, `tmw-K8b2` Regions-Messpunkte/Bewegung/Abschluss sowie `tmw-K8b3` Frontend/ADR/Dokumentation geteilt; der Parent ist als Tracking-Split `resolved`. Das Modell wird gemeinsam für `SYSTEM | REGION` generalisiert, nicht dupliziert. Regionsentdeckung entsteht ausschließlich beim erfolgreichen Kartographieabschluss. SWU verwendet bewusst höchstens fünf geeignete Regionsmesspunkte wie im bestehenden begrenzten Systemablauf statt STUs 25 % aller Regionsfelder. `tmw-D4` wird nur noch durch den produktiven Regionslebenszyklus `tmw-K8b2` blockiert und muss nicht auf UI/Dokumentation warten.
