# Traktorstrahl auf fremde Schiffe und Entkommen

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** sc-WP-TRACT-1a

## Ziel

STU erlaubt den Traktorstrahl auf fremde Schiffe (mit Schildprüfung und Urlaubsschutz); das Opfer kann mit `EscapeTractorBeam` entkommen. SWU hat Haltungsregeln (`CONTEXT.md`), deren Anwendung auf den Traktor festgelegt werden muss.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/ActivateTractorBeam` (Ziel ungeschildet, kein Urlaub, kein NPC)
- `Module/Ship/Action/EscapeTractorBeam` (Erfolgschance, Schaden bei Fehlschlag)
- `Component/Crew/Skill/SkillEnhancementEnum.php` (`ESCAPE_TRACTOR_BEAM`)

## SWU-Pfade

- Traktor-Dienst aus sc-WP-TRACT-1a
- `apps/backend/src/modules/alliance/relationship-resolver.service.ts`
- Interaktions-Checks aus sc-WP-ENG-2

## Akzeptanzkriterien

- [ ] Fremde Ziele unabhängig von der Haltung erlaubt, sofern Zielschilde aus, Eigner kein wirksamer Urlauber und kein NPC; sonst Ablehnung mit Meldung.
- [ ] Das Opfer sieht den Zustand und kann „Entkommen“ versuchen (STU-Chance und -Folgen).
- [ ] Der Eigner des Ziels erhält eine Meldung.
- [ ] Backend-Tests für Freund/Neutral/Feind (alle erlaubt), geschildetes Ziel, Urlauber, NPC; Frontend-Test für „Entkommen“.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Vorgabe: Variante (a), wie STU. Jedes fremde ungeschildete Schiff, unabhängig von der Haltung, ausgenommen Urlauber und NPCs. Das Opfer kann mit STU-Chance und -Folgen entkommen.

## Comments

- 2026-10-21 Product Owner: Option a – Fremde Schiffe dürfen wie in STU unabhängig von der Haltung per Traktor gezogen werden, sofern das Ziel ungeschildet ist und kein Urlauber oder NPC ist.
