# Flaky `research.spec.tsx` stabilisieren

**Status:** needs-triage
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

`apps/frontend/src/pages/research.spec.tsx` ("shows research images, completion date, alternative follow-ups, hulls, and modules") schlägt intermittierend fehl (`Unable to find an accessible element with the role "button" and name /eine von/`), auch auf unverändertem Stand. Ursache finden (Timing/async Rendering) und deterministisch machen, ohne Assertions zu entfernen.
