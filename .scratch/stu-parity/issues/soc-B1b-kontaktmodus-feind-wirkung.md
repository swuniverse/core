# Kontaktmodus „Feind“: Spielwirkung

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** soc-B1a

## Ziel

In STU wirkt ein Kontakt im Modus Feind im `EnemyDeterminator` (u. a. Kartenfarbe und Alarm-Reaktionen). In SWU sind Feinde laut `CONTEXT.md` ausschließlich Spieler der anderen Fraktion. Dieses Issue legt fest und setzt um, ob und wie der persönliche Feind-Kontakt wirkt.

## STU-Quellen

- `src/Component/Player/Relation/EnemyDeterminator.php`
- `src/Module/Starmap/View/ShowUserStarmapRealtime.php:580ff` (Kartenfarbe)
- `src/Module/Message/Lib/ContactListModeEnum.php`

## SWU-Pfade

- `apps/backend/src/modules/alliance/relationship-resolver.service.ts`
- `CONTEXT.md` (Feind, Haltung)
- `apps/backend/src/modules/spacecraft/starmap-visibility.service.ts`
- Alarmreaktion: sc-WP-COMBAT-1

## Akzeptanzkriterien

- [ ] Der Relationship-Resolver liefert für (a, b) die Haltung Feind, wenn a einen Kontakt zu b im Modus Feind hat und beide nicht derselben Allianz angehören; gebündelt aufgelöst (keine N+1-Abfragen) über den Kontakt-Port aus soc-B1a.
- [ ] `CONTEXT.md` (Feind, Haltung, Neutral) wird angepasst: Feind ist ein Spieler der anderen Fraktion **oder** ein Spieler derselben Fraktion, den ein persönlicher Kontakt als Feind markiert (nicht bei derselben Allianz).
- [ ] Alle Verbraucher der Haltung (u. a. Alarmreaktion sc-WP-COMBAT-1, Kartenfarbe, Kolonieangriff sc-WP-UI-3b) wirken dadurch ohne eigene Sonderlogik.
- [ ] Resolver-Tests: Feind-Kontakt in derselben Fraktion, Vorrang derselben Allianz, Einseitigkeit, andere Fraktion unverändert.

## Entscheidung

Vorgabe: Variante (b), wie STU `EnemyDeterminator`. Ein Kontakt im Modus Feind macht den Kontakt für den Markierenden zur Haltung **Feind**, auch innerhalb derselben Fraktion. Die Wirkung ist einseitig (nur aus Sicht des Markierenden) und wird zentral im Relationship-Resolver aufgelöst. Vorrang: dieselbe Allianz geht vor dem persönlichen Feind-Kontakt (wie STU: gleiche Partei → keine Feindschaft); Feind der anderen Fraktion bleibt unverändert.

## Comments

- 2026-10-21 Product Owner: Option b – Ein persönlicher Kontakt im Modus Feind ergibt eine echte Haltung Feind auch innerhalb derselben Fraktion (wirkt u. a. auf automatische Reaktionen wie Alarm); `CONTEXT.md` wird angepasst.
