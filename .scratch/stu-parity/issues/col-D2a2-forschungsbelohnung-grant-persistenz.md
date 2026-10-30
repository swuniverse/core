# Forschungsbelohnung: Grant-Persistenz

**Status:** claimed
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

- [ ] Eine persistente Grant-Entity samt Migration speichert Spieler, Forschung, Status und Vergabezeitpunkt.
- [ ] Spieler und Forschung bilden einen eindeutigen Schlüssel, der parallele oder wiederholte Vergaben verhindert.
- [ ] Der Speicher bietet transaktional nutzbare Operationen zum Reservieren, Abschließen und sicheren Wiederaufnehmen eines Grants.
- [ ] Ohne explizites Reward-Mapping wird kein Grant erzeugt.
- [ ] Backend-Tests decken Wiederholung, Parallelität und fehlendes Mapping ab.

## Entscheidung

Der Grant-Nachweis ist die dauerhafte Idempotenzgrenze. Eine erfolgreiche Vergabe darf weder ein zweites Schiff noch eine zweite Nachricht erzeugen.
