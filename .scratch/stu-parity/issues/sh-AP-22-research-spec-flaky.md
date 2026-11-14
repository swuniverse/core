# Flaky `research.spec.tsx` stabilisieren

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

`apps/frontend/src/pages/research.spec.tsx` ("shows research images, completion date, alternative follow-ups, hulls, and modules") schlägt intermittierend fehl (`Unable to find an accessible element with the role "button" and name /eine von/`), auch auf unverändertem Stand. Ursache finden (Timing/async Rendering) und deterministisch machen, ohne Assertions zu entfernen.

## Comments

- 2026-11-09: `14b86081` ersetzt die synchrone Abfrage durch eine abgewartete Accessible-Button-Assertion; drei fokussierte Baseline-Läufe bestanden, der spätere fokussierte Review bei `c8e14f1c` ebenfalls (15/15). Dies belegt die konkrete Async-Korrektur, aber nicht die vollständige Beseitigung aller intermittierenden Fehler. `needs-triage` bleibt zur Prüfung des verbleibenden Stabilisierungsumfangs.
- 2026-11-14: Triage durch Maintainer: geschlossen ohne weitere Codeänderung. Nachmessung auf `38945807`: `research.spec.tsx` einzeln 40/40 grün; der betroffene Test unter künstlicher Volllast (16 CPU-Lastprozesse auf 8 Kernen) 10/10 grün bei 0,4–1,4 s Laufzeit (unbelastet ~0,1 s); fünf vollständige Frontend-Suiten am selben Tag ohne Fehler in dieser Datei. Die Async-Korrektur aus `14b86081` gilt damit als wirksam. Restrisiko: Die abgewartete Button-Suche nutzt das Standard-Timeout von 1 s, das unter starker Last knapp werden kann. Tritt der Fehler erneut auf, Issue wieder öffnen und die Abfrage per `within` auf den Detailbereich eingrenzen bzw. das Timeout erhöhen.

