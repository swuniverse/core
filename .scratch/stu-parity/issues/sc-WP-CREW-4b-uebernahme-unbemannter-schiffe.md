# Übernahme unbemannter Schiffe

**Status:** resolved
**Priority:** P3
**Size:** M
**Blocked by:** sc-WP-CREW-1, sc-WP-ENG-2c

## Ziel

STU erlaubt, ein unbemanntes fremdes Schiff über mehrere Ticks zu übernehmen (`StartTakeover`, `FinishedTakeoverHandler`); Flug von Übernehmer oder Ziel bricht ab, Zerstörung auch. Übernahme erzeugt History (soc-H2). Die geprüfte STU-Implementierung belastet den Angreifer beim Start und erstattet bei Abbruch; sie zieht dem Opfer beim Abschluss kein Prestige ab.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/{StartTakeover,StopTakeover}`, `Lib/Interaction/ShipTakeoverManager.php`
- `Module/Tick/Spacecraft/Handler/FinishedTakeoverHandler.php`
- `Module/Spacecraft/Lib/Movement/Component/Consequence/Flight/TakeoverConsequence.php`, `Destruction/Handler/CancelTakeover.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (Flug, `processTick`), `spacecraft-destruction.service.ts`
- `apps/backend/src/modules/events/game-event.service.ts`, `apps/backend/src/modules/prestige/prestige.service.ts`

## Akzeptanzkriterien

- [x] Übernahme startet nur bei unbemanntem fremdem Ziel am Feld (jede Haltung, kein Urlauber, kein NPC) mit ausreichender eigener Crew; Dauer und Prestigekosten wie STU.
- [x] Flug eines Beteiligten oder Zerstörung bricht ab (Meldung an beide).
- [x] Abschluss überträgt Besitz, löst Flotte/Traktor des Ziels und erzeugt einen History-Eintrag; wie in der geprüften STU-Implementierung gibt es keinen zusätzlichen Prestigeabzug beim Opfer.
- [x] Backend-Tests für Abschluss (auch innerhalb derselben Fraktion) und Abbrüche; Frontend-Test Fortschrittsanzeige.
- [x] Relevante Backend- und Frontend-Tests sind grün.

## Entscheidung

Vorgabe: Variante (a), wie STU. Übernahme unbemannter fremder Schiffe gegen jeden Spieler, unabhängig von der Haltung; ausgenommen Urlauber und NPCs.

## Comments

- 2026-10-21 Product Owner: Option a – Die Übernahme unbemannter Schiffe ist wie in STU gegen jeden Spieler spielbar.
- 2026-11-02 Umsetzung: Die aktuelle STU-Quelle zieht dem Opfer bei Abschluss kein Prestige ab; entgegen der ursprünglichen Formulierung im Ziel/Akzeptanzkriterium wurde daher kein Opferabzug implementiert. Der Angreifer zahlt beim Start `5 + 3 × Summe der Zielmodullevel` und erhält diesen Betrag bei Abbruch zurück.
- 2026-11-03 Audit: Die sachlich falsche Forderung nach einem Opferabzug wurde an die dokumentierte STU-Regel angepasst. Fokussierte Prüfung: `npx nx test backend -- spacecraft-takeover.service.spec.ts --runInBand` (2/2) und `npx nx test frontend -- NearbySensorPanel.spec.tsx --run` (18/18) grün.

## Answer

Die Übernahme läuft persistent über zehn Hauptticks. Start, manueller Abbruch, Tickabschluss sowie Abbruch durch Flug oder Zerstörung sind über öffentliche Service- und Controller-Seams angebunden. Abschluss überträgt das Ziel, löst Flotte und Traktor, vergibt Crew-Expertise, schreibt die globale Schiffshistory und meldet beiden Spielern; NBS zeigt Start, Fortschritt und Abbruch.
