# Forschungsbelohnung: Grant-Persistenz

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** col-D1

## Ziel

Ein dauerhafter Grant-Nachweis macht die Vergabe eines Forschungs-Belohnungsschiffs pro Spieler und Forschung idempotent.

## STU-Quellen

- `src/Module/Research/ResearchState.php::createRewardShip`
- `src/Orm/Entity/Research.php` (`reward_buildplan_id`)

## SWU-Pfade

- `apps/backend/src/modules/research/`
- `apps/backend/src/migrations/`

## Akzeptanzkriterien

- [x] Eine persistente Grant-Entity samt Migration speichert Spieler, Forschung, Status und Vergabezeitpunkt.
- [x] Spieler und Forschung bilden einen eindeutigen Schlüssel, der parallele oder wiederholte Vergaben verhindert.
- [x] Der Speicher bietet transaktional nutzbare Operationen zum Reservieren, Abschließen und sicheren Wiederaufnehmen eines Grants.
- [x] Ohne explizites Reward-Mapping wird kein Grant erzeugt.
- [x] Backend-Tests decken Wiederholung, Parallelität und fehlendes Mapping ab.

## Entscheidung

Der Grant-Nachweis ist die dauerhafte Idempotenzgrenze. Eine erfolgreiche Vergabe darf weder ein zweites Schiff noch eine zweite Nachricht erzeugen.

## Comments

Added `ResearchRewardGrant` entity + migration `20261030150000`, and `ResearchRewardGrantService` (`reserve`/`complete` on a caller-supplied EntityManager; unique (userId, techId); insert-or-ignore plus pessimistic lock, so resume of unfinished reservations is safe; no row without `shipReward` mapping). Tests mock the manager (no DB in test setup). Follow-up: col-D2a3/D2a4 wire spawn and completion.
