# Traktorstrahl auf fremde Schiffe und Entkommen

**Status:** resolved
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

- [x] Fremde Ziele unabhängig von der Haltung erlaubt, sofern Zielschilde aus, Eigner kein wirksamer Urlauber und kein NPC; sonst Ablehnung mit Meldung.
- [x] Das Opfer sieht den Zustand und kann „Entkommen“ versuchen (STU-Chance und -Folgen).
- [x] Der Eigner des Ziels erhält eine Meldung.
- [x] Backend-Tests für Freund/Neutral/Feind (alle erlaubt), geschildetes Ziel, Urlauber, NPC; Frontend-Test für „Entkommen“.
- [x] `lint`, `typecheck`, `test` und `build` sind grün (fachbezogene Tests, Frontend-Typecheck und Builds grün; Gesamt-Backend-Typecheck bleibt durch den vorbestehenden Fehler in `tutorial.service.spec.ts:22` rot).

## Entscheidung

Vorgabe: Variante (a), wie STU. Jedes fremde ungeschildete Schiff, unabhängig von der Haltung, ausgenommen Urlauber und NPCs. Das Opfer kann mit STU-Chance und -Folgen entkommen.

## Comments

- 2026-10-21 Product Owner: Option a – Fremde Schiffe dürfen wie in STU unabhängig von der Haltung per Traktor gezogen werden, sofern das Ziel ungeschildet ist und kein Urlauber oder NPC ist.
- 2026-10-30: Fremdtraktor mit Zielschutz, Eigentümermeldung und Opferanzeige umgesetzt; Entkommen kostet 20 EPS und folgt STU-Erfolg, Schildschaden (5–25 %) oder Hüllenschaden (10–25 %). Der vorbestehende Backend-Typecheck-Fehler in `tutorial.service.spec.ts:22` bleibt fachfremd offen.
