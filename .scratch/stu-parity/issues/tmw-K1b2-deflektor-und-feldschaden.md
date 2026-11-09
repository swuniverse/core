# Deflektor, Feldkosten und Feldschaden

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** tmw-K1b1

## Ziel

Jede Feldtransition wendet die zusätzlichen Deflektorkosten, normalen Feldschaden und Spezialschaden des Feldtyps nach STU-Regeln an.

## STU-Quellen

- `src/Module/Spacecraft/Lib/Movement/Component/Consequence/PostFlight/DeflectorConsequence.php`
- `src/Orm/Entity/MapFieldType.php`
- `src/Module/Spacecraft/Lib/Damage/ApplyFieldDamage.php`

## SWU-Pfade

- `apps/backend/src/modules/starmap/entities/galaxy-field-type.entity.ts`
- `apps/backend/src/database/migrations/stu-field-types-seed.json`
- `apps/backend/src/modules/spacecraft/spacecraft-runtime-state.service.ts`
- `apps/backend/src/modules/spacecraft/spacecraft-destruction.service.ts`
- `packages/shared/src/lib/spacecraft/index.ts`

## Akzeptanzkriterien

- [ ] Laufzeitsystem `DEFLECTOR` ist als gemeinsamer Runtime-Key vorhanden, wird per Migration für Bestandsschiffe angelegt und in der Systemliste angezeigt.
- [ ] Feldtypen besitzen `specialDamage`; Migration beziehungsweise Seed übernimmt `x_damage` aus der autoritativen STU-Feldtypquelle. Spezialschaden wird als absoluter Feldschaden auf das Schiff angewandt, entsprechend der STU-`DeflectorConsequence`/`ApplyFieldDamage`-Implementierung. `x_damage_system` und `x_damage_type` werden nicht als Systemtreffer-Zuordnung interpretiert.
- [ ] Die Pipeline verarbeitet pro Feld zuerst Spezialschaden und danach die Deflektorfolge.
- [ ] Bei intaktem Deflektor und genügend EPS werden `energyCost` zusätzlich zu den Grundflugkosten abgezogen und kein normaler Feldschaden angewandt.
- [ ] Bei zu wenig EPS wird EPS auf 0 gesetzt und normaler Feldschaden angewandt; bei `DEFLECTOR.integrity <= 0` entsteht Feldschaden unabhängig vom EPS-Vorrat.
- [ ] Normaler Feldschaden trifft zuerst Schilde und danach Hülle. Hülle 0 verwendet den bestehenden Zerstörungsdienst und nennt Feldtyp sowie Sektor in der Meldung.
- [ ] Spezialschaden wird vor der Deflektorfolge als absoluter Feldschaden auf das Schiff angewandt. Tests decken Reihenfolge, Schaden und Zerstörung ab; für Spezialschaden ist kein Systemziel-RNG erforderlich.
- [ ] Der Handlervertrag erlaubt `sc-WP-TRACT-1a`, Konsequenzen am gezogenen Schiff ohne doppelte Grund- oder Deflektorkosten anzuwenden; tatsächliche Traktorintegration gehört nicht in dieses Issue.
- [ ] Backend-Tests decken genug und zu wenig EPS, zerstörten Deflektor, Spezialschaden, Schilde-vor-Hülle, Zerstörung und Mehrfeldflug genau einmal je Feld ab.

## Entscheidung

Grundflugkosten und Feldtyp-`energyCost` sind getrennte Kosten je betretenem Feld. `DEFLECTOR` ist ein eigenes Laufzeitsystem; STU-Schadensreihenfolge wird übernommen.

## Offene Frage

Für Spezialschaden ist die Semantik durch die STU-Ausführung geklärt: `x_damage` wird als absoluter Feldschaden auf das Schiff angewandt. `x_damage_system` und `x_damage_type` werden dafür nicht als Systemziel-Zuordnung verwendet. Die autoritative STU-Produktionsquelle für Feldtypwerte bleibt vor der Migration/Seed-Änderung zu verifizieren; keine Testfixture- oder erfundenen Werte persistieren.

## Comments

2026-10-30: Runtime-/Pipeline-Implementierung test-first prototypisiert; fokussierte Tests (19) und alle Builds waren grün. Der vorgeschriebene Gesamtcheck blieb ausschließlich an bereits vorhandenen, fachfremden Typecheck-Fehlern in `wreck-decay.service.spec.ts` und `tutorial.service.spec.ts` rot. Produktcode gemäß Abbruchregel verworfen; zur korrekten Seed-/Migrationsumsetzung wird die oben genannte Datenquelle und System-ID-Abbildung benötigt.
- 2026-11-06: Maintainer bestätigt die belegte STU-Semantik: `x_damage` wird als absoluter Feldschaden auf das Schiff angewandt; `x_damage_system` und `x_damage_type` werden nicht als Systemtreffer-Mapping verwendet. Der Systemziel-RNG entfällt. Bei der Umsetzung muss die autoritative STU-Produktionsquelle für die Feldtypwerte verifiziert werden; keine Testfixture- oder erfundenen Werte persistieren. Blocker `tmw-K1b1` ist inzwischen erledigt; Status `ready-for-agent`.
- 2026-11-09: Die integrierte Baseline `14b86081`/`c8e14f1c` behebt die zuletzt genannten fachfremden Typecheck-/Testfixture-Blocker; reguläre Gates und vollständige Tests sind laut Baseline-Review grün. Die verworfene Implementierung ist neu zu erstellen und mit aktuellen Issue-Tests und Pflicht-Gates zu prüfen. Die oben festgehaltene Verifikation der autoritativen Feldtypquelle bleibt erforderlich; die Baseline beweist keine Produktdaten.
