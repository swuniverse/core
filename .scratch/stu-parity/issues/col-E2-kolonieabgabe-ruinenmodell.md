# Kolonieabgabe: Ruinenmodell bestätigen und dokumentieren

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

SWU weicht bei der Kolonieabgabe von STU ab: Die Kolonie bleibt als Ruine mit Gebäuden und Lager bestehen (statt Reset an den Fallback-Nutzer), die Startkolonie ist gesperrt, die Bestätigung erfolgt über den vollen Namen, und der Spielerstatus fällt nicht auf UNCOLONIZED zurück. Diese Abweichungen sind nicht als ADR festgehalten (Leitplanke 1).

## STU-Quellen

- `src/Module/Colony/Action/GiveUp/`, `src/Module/Colony/View/ShowGiveUp/`, `src/html/colony/giveup.twig`
- `src/Module/Colony/Lib/ColonyResetter.php`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-abandonment.service.ts` (löscht Queues und Orbitzuweisungen)
- `apps/frontend/src/pages/colonies/components/PanelSettings.tsx`
- `docs/adr/`

## Akzeptanzkriterien

- [x] ADR `docs/adr/<nächste freie Nummer>-kolonieabgabe-ruinenmodell.md` im Format der bestehenden ADRs beschreibt Ruinenmodell, Startkolonien-Sperre, Namensbestätigung und fehlenden Statusrücksprung inkl. Begründung; sie nennt, dass die Kontolöschung (sh-AP-05d) denselben Pfad nutzt.
- [x] Die ADR hält die Folgen für Blockierer und Verteidiger im Orbit fest (heute: Orbitzuweisungen werden gelöscht); ein Backend-Test sichert dieses Verhalten ab.
- [x] `CONTEXT.md` führt den Begriff „Ruine“ (aufgegebene, wiederbesiedelbare Kolonie), falls noch nicht vorhanden.
- [x] Kein Umbau von Produktcode außer dem absichernden Test.

## Entscheidung

Vorgabe: Variante (a). Ruinenmodell, Startkolonien-Sperre, Namensbestätigung und fehlender Statusrücksprung bleiben. **Kein Umbau**; Dokumentation per ADR plus ein absichernder Backend-Test für das bestehende Verhalten.

## Comments

- 2026-10-21 Product Owner: Option a – Das SWU-Ruinenmodell der Kolonieabgabe bleibt und wird per ADR als bewusste Abweichung von STU festgeschrieben.
- 2026-10-28 Agent: Ruinenmodell, Sperr- und Bestätigungsregeln sowie Orbitfolgen in ADR-0007 dokumentiert, „Ruine“ in `CONTEXT.md` ergänzt und das Löschen aller Orbitzuweisungen im bestehenden Backend-Test abgesichert. `sh-AP-05d` bleibt der offene Folgepunkt für die gemeinsame Kontolöschungsnutzung.
