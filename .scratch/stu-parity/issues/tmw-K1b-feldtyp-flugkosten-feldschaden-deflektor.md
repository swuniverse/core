# Feldtyp-Flugkosten, Feldschaden und Deflektor

**Status:** needs-info
**Priority:** P2
**Size:** M
**Blocked by:** tmw-K1a

## Ziel

Beim Einflug in ein Feld wirken die Energiekosten und der Schaden des Feldtyps wie in STU. Hat das Schiff genug Energie für den Deflektor, kostet der Einflug Energie. Fehlt die Energie oder ist der Deflektor zerstört, nimmt das Schiff Feldschaden (erst Schilde, dann Rumpf). Spezialschaden trifft ein Schiffssystem. Dieses Issue ist kanonischer Eigentümer und ersetzt `sc-WP-NAV-1`, also auch dessen Frage nach dem Deflektor-System.

## STU-Quellen

- `src/Module/Spacecraft/Lib/Movement/Component/Consequence/PostFlight/DeflectorConsequence.php`: Spezialschaden zuerst, dann `ecost` vom EPS. Bei zu wenig EPS wird EPS auf 0 gesetzt und Feldschaden angewendet. Bei zerstörtem Deflektor gibt es immer Feldschaden.
- `src/Module/Spacecraft/Lib/Movement/Component/Consequence/Flight/EpsConsequence.php`, `PreFlight/Condition/EnoughEpsCondition.php`: Die Grundkosten des Flugs sind `rump.flight_ecost` je Feld, zusätzlich gezogene Schiffe. Die Feldkosten des Deflektors kommen in STU also **zusätzlich** zu den Grundkosten.
- `src/Orm/Entity/MapFieldType.php` (`ecost`, `damage`, `x_damage`, `x_damage_system`, `x_damage_type`)
- `src/Lib/Damage/*`, `src/Module/Spacecraft/Lib/Damage/ApplyFieldDamage.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts`: `navigate` nutzt heute `distance × shipClass.flightEnergyCost` (~Z. 1773), `flyGalaxy` verbraucht den Hyperantrieb.
- `apps/backend/src/modules/starmap/entities/galaxy-field-type.entity.ts` (`energyCost`, `damage`; kein Spezialschaden), Seed `apps/backend/src/database/migrations/stu-field-types-seed.json`
- `apps/backend/src/modules/spacecraft/spacecraft-destruction.service.ts`, `spacecraft-runtime-state.service.ts`, `packages/shared/src/lib/spacecraft/index.ts` (`SPACECRAFT_RUNTIME_SYSTEM_KEYS`, ohne `DEFLECTOR`)
- Consequence-Registrierung aus tmw-K1a

## Akzeptanzkriterien

- [ ] Eine Deflektor-Consequence ist in der Pipeline aus tmw-K1a registriert: je durchflogenem Feld erst Spezialschaden, dann Abzug der Feldtyp-Kosten zusätzlich zu den Grundkosten; bei zu wenig EPS wird EPS auf 0 gesetzt und Feldschaden angewendet; bei zerstörtem `DEFLECTOR` immer Feldschaden.
- [ ] Neues Laufzeitsystem `DEFLECTOR` (Runtime-Key, Standardausstattung aller Rümpfe bzw. Modul nach STU-Daten), per Migration für Bestandsschiffe angelegt, mit Anzeige in der Systemliste.
- [ ] Feldschaden geht erst auf die Schilde, dann auf den Rumpf. Fällt der Rumpf auf 0, wird das Schiff über den bestehenden Zerstörungsdienst zerstört (mit Meldung „<Feldtyp> in Sektor x|y“).
- [ ] Spezialschaden (neue Felder `specialDamage`, `specialDamageSystem` am Feldtyp, per Migration aus den STU-Feldtypdaten befüllt) beschädigt das genannte System bzw. ein zufälliges System über `integrity`.
- [ ] Die Routen- bzw. Zielwarnung aus tmw-K1a zeigt Grund- plus Feldkosten und das Schadensrisiko je Feld der Route.
- [ ] Schiffe im Schlepp (sobald sc-WP-TRACT-1a existiert) werden nicht doppelt belastet (`skipWhenTractored`).
- [ ] Backend-Tests: genug Energie, zu wenig Energie, Deflektor zerstört, Spezialschaden, Zerstörung durch Feldschaden, Mehrfeldflug belastet jedes Feld genau einmal. Frontend-Test: Die Warnung zeigt Kosten und Schaden.

## Entscheidung

Vorgabe:
1. Energiemodell (a), STU: Grundkosten des Flugs bleiben (`flightEnergyCost` je Feld), zusätzlich kosten die Feldtyp-Kosten (`energyCost`) je Feld als Deflektorlast.
2. Deflektor (a): eigenes Schiffssystem `DEFLECTOR` (neuer Runtime-Key in `SPACECRAFT_RUNTIME_SYSTEM_KEYS`, Standardausstattung bzw. Modul). „Deflektor zerstört“ heißt `DEFLECTOR.integrity <= 0`.
3. Hyperraumsprung: Mit sc-WP-NAV-3 (Option b) entfällt der zeitbasierte Sprung; Reisen erfolgt feldweise. Feldkosten und -schaden gelten daher für **jedes durchflogene Feld** (Pipeline aus tmw-K1a, genau einmal je Feld). Solange der alte `warp` bis zum Rückbau existiert, wirkt die Consequence dort nur auf das Ankunftsfeld.

## Comments

- 2026-10-21 Product Owner: Option 1a, 2a – Flugenergie folgt dem STU-Modell (Grundkosten plus Feldtyp-Kosten je Feld als Deflektorlast, 1a), und der Deflektor wird ein eigenes Schiffssystem `DEFLECTOR` (2a). Teilfrage 3 ergibt sich aus sc-WP-NAV-3 (Option b): Feldkosten und -schaden gelten für jedes durchflogene Feld.
- 2026-10-28 Agent: Blockiert durch eine widersprüchliche Bewegungsgrundlage. `flyGalaxy` springt weiterhin in einem Aufruf direkt zum Zielfeld und lädt ausschließlich `warpdrive`, während Akzeptanzkriterium und ADR-0006 jede tatsächlich durchflogene Feldtransition mit Grund-EPS-Kosten plus Feld-Consequence verlangen. Soll tmw-K1b den Galaxieflug bereits auf schrittweise Feldtransitions samt EPS-Grundkosten umbauen (Scope-Erweiterung gegenüber dem Issue), oder soll es bis zum Rückbau des alten Flugpfads nach sc-WP-NAV-3 warten? Zusätzlich fehlt `sc-WP-TRACT-1a`, sodass `skipWhenTractored` noch nicht implementierbar oder testbar ist.
