# Hyperraumflug-Modell klären (ADR)

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

SWU springt zwischen Systemen per Zeitflug (`IN_FLIGHT`, `arrivalAt`, Cooldown 3). STU kennt keinen Zeitflug, sondern feldweisen Galaxieflug. Die Abweichung ist nirgends dokumentiert. Nach der Entscheidung wird sie als ADR festgehalten und Fluganzeige bzw. Abbruch daran ausgerichtet.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/MoveShip`, `Module/Spacecraft/Lib/Movement/ShipMover.php`
- `Module/Ship/Action/Transwarp` (Langsprung als Spezialsystem)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`warp`, `processMovement`, `flyGalaxy`)
- `apps/backend/src/modules/starmap/entities/hyperspace-route*.entity.ts`
- `docs/adr/`, `CONTEXT.md`

## Akzeptanzkriterien

- [x] ADR `docs/adr/<nächste freie Nummer>-galaxieflug-statt-zeitbasiertem-hyperraumsprung.md` im Format der bestehenden ADRs dokumentiert: feldweiser STU-Galaxieflug als Modell, Wegfall des zeitbasierten Sprungs, Rolle der Hyperraumrouten und Verhältnis zu sc-WP-NAV-5b (Langstreckensprung).
- [x] `CONTEXT.md` führt den Begriff „Hyperraumsprung“ entsprechend (Galaxieflug feldweise; Langstreckensprung nur über das Pendant aus sc-WP-NAV-5b) bzw. nennt „zeitbasierter Hyperraumsprung“ unter _Avoid_.
- [x] Ein Folge-Issue `sc-WP-NAV-3b-rueckbau-zeitbasierter-hyperraumsprung.md` (Status `needs-triage`) beschreibt den Rückbau von `warp`, `IN_FLIGHT`/`arrivalAt`/`warpCooldown`, `checkWarpArrivals` und der zugehörigen UI inkl. Umgang mit Schiffen, die zum Migrationszeitpunkt im Flug sind.
- [x] Entscheidung unter „Entscheidungen“ in `map.md` (bereits eingetragen).

## Entscheidung

Vorgabe: Variante (b). Der zeitbasierte Sprung zwischen Systemen (`warp`, `IN_FLIGHT`, `arrivalAt`, Cooldown 3, Minuten-Cron `checkWarpArrivals`) ist **keine** bewusste SWU-Abweichung. Reisen zwischen Systemen erfolgt wie in STU feldweise über die Galaxiekarte (`flyGalaxy`, Systemein- und -austritt). Langstreckensprünge übernimmt ausschließlich das Transwarp-Pendant aus sc-WP-NAV-5b. Hyperraumrouten bleiben Kartendarstellung bzw. können vom Pendant genutzt werden; sie verkürzen keine Reisezeit mehr.

## Comments

- 2026-10-21 Product Owner: Option b – Der zeitbasierte Hyperraumsprung zwischen Systemen bleibt nicht: SWU kehrt zum feldweisen STU-Galaxieflug zurück, und der Zeitsprung entfällt bzw. geht im Transwarp-Pendant (sc-WP-NAV-5b) auf.
- 2026-10-22 Agent: ADR-0006 und die Navigationsbegriffe in `CONTEXT.md` dokumentiert; Rückbau samt sicherer Behandlung laufender Flüge als `sc-WP-NAV-3b` erfasst.
