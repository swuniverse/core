# Forschungsqueue und Abbruchregeln festlegen

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

STU erlaubt eine aktive Forschung plus einen Warteslot und verwirft den Fortschritt beim Abbruch. SWU erlaubt zehn Slots mit automatischem Pfad zur Zielforschung und behält den Fortschritt. Die Abweichung ist nicht als ADR festgehalten (Leitplanke 1).

## STU-Quellen

- `src/Module/Research/Action/StartResearch/`, `src/Module/Research/Action/CancelResearch/`
- `src/html/game/component/researchComponent.twig` („+1 Warteslot“)

## SWU-Pfade

- `apps/backend/src/modules/research/research.service.ts` (`MAX_QUEUE_SIZE = 10`, `queueTarget`, `cancelResearch`)
- `apps/frontend/src/pages/research.tsx`, `apps/frontend/src/components/layout/header.tsx`
- `docs/adr/` (bei Variante a)

## Akzeptanzkriterien

- [x] ADR `docs/adr/<nächste freie Nummer>-forschungsqueue-weicht-von-stu-ab.md` im Format der bestehenden ADRs (vgl. `docs/adr/0001-allianzen-abweichungen-von-stu.md`): STU-Regel, SWU-Regel (10 Slots, Auto-Pfad, Fortschritt bleibt), Begründung (Komfortgewinn ohne Balance-Nachteil, Forschungsgeschwindigkeit unverändert).
- [x] `CONTEXT.md` nur ergänzen, falls dort ein Begriff zur Forschungsqueue geführt wird bzw. nötig ist (z. B. „Forschungsqueue“); sonst unverändert.
- [x] Kein Produktcode wird geändert.
- [x] Issue danach `resolved`.

## Entscheidung

Vorgabe: Variante (a). Die SWU-Forschungsqueue bleibt unverändert (`MAX_QUEUE_SIZE = 10`, `queueTarget`/Auto-Pfad, Fortschritt bleibt beim Abbruch). Es erfolgt **kein Umbau**; die Abweichung von STU (1 aktive Forschung + 1 Warteslot, Fortschrittsverlust beim Abbruch) wird als ADR festgehalten.

## Comments

- 2026-10-21 Product Owner: Option a – Das SWU-Modell der Forschungsqueue (10 Slots, Auto-Pfad zur Zielforschung, Fortschritt bleibt beim Abbruch) bleibt bestehen und wird als bewusste Abweichung von STU per ADR dokumentiert.
- 2026-10-22: ADR 0005 dokumentiert STU- und SWU-Regel, Komfort- und Balancebegründung sowie die Folgen für Queue und Anzeigen. `CONTEXT.md` und Produktcode bleiben unverändert.
