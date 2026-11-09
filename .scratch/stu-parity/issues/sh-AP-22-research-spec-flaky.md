# Flaky `research.spec.tsx` stabilisieren

**Status:** needs-triage
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

`apps/frontend/src/pages/research.spec.tsx` ("shows research images, completion date, alternative follow-ups, hulls, and modules") schlägt intermittierend fehl (`Unable to find an accessible element with the role "button" and name /eine von/`), auch auf unverändertem Stand. Ursache finden (Timing/async Rendering) und deterministisch machen, ohne Assertions zu entfernen.

## Comments

- 2026-11-09: `14b86081` ersetzt die synchrone Abfrage durch eine abgewartete Accessible-Button-Assertion; drei fokussierte Baseline-Läufe bestanden, der spätere fokussierte Review bei `c8e14f1c` ebenfalls (15/15). Dies belegt die konkrete Async-Korrektur, aber nicht die vollständige Beseitigung aller intermittierenden Fehler. `needs-triage` bleibt zur Prüfung des verbleibenden Stabilisierungsumfangs.
