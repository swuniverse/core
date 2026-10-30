# Deflektor, Feldkosten und Feldschaden

**Status:** claimed
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
- [ ] Feldtypen besitzen `specialDamage` und `specialDamageSystem`; Migration beziehungsweise Seed übernimmt die zugeordneten STU-Feldtypdaten.
- [ ] Die Pipeline verarbeitet pro Feld zuerst Spezialschaden und danach die Deflektorfolge.
- [ ] Bei intaktem Deflektor und genügend EPS werden `energyCost` zusätzlich zu den Grundflugkosten abgezogen und kein normaler Feldschaden angewandt.
- [ ] Bei zu wenig EPS wird EPS auf 0 gesetzt und normaler Feldschaden angewandt; bei `DEFLECTOR.integrity <= 0` entsteht Feldschaden unabhängig vom EPS-Vorrat.
- [ ] Normaler Feldschaden trifft zuerst Schilde und danach Hülle. Hülle 0 verwendet den bestehenden Zerstörungsdienst und nennt Feldtyp sowie Sektor in der Meldung.
- [ ] Spezialschaden beschädigt das konfigurierte System beziehungsweise bei entsprechendem Feldtyp ein über injizierbaren RNG gewähltes System; Tests steuern den RNG deterministisch.
- [ ] Der Handlervertrag erlaubt `sc-WP-TRACT-1a`, Konsequenzen am gezogenen Schiff ohne doppelte Grund- oder Deflektorkosten anzuwenden; tatsächliche Traktorintegration gehört nicht in dieses Issue.
- [ ] Backend-Tests decken genug und zu wenig EPS, zerstörten Deflektor, Spezialschaden, Zufallsseam, Schilde-vor-Hülle, Zerstörung und Mehrfeldflug genau einmal je Feld ab.

## Entscheidung

Grundflugkosten und Feldtyp-`energyCost` sind getrennte Kosten je betretenem Feld. `DEFLECTOR` ist ein eigenes Laufzeitsystem; STU-Schadensreihenfolge wird übernommen.
