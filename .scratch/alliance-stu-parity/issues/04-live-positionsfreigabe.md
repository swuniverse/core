# 04: Live-Positionsfreigabe

**What to build:** Die aktive Beziehungsfreigabe „Live-Kartenpositionen teilen“ wird an den vorhandenen Sichtbarkeitspfad angebunden. Berechtigte Live-Positionen werden sichtbar; ausstehende, ungültige oder beendete Freigaben sowie Cross-Faction-Parteien erhalten keinen Zugriff. Die Freigabe aktiviert keine gemeinsame Scanberechtigung.

**Blocked by:** 01: Zentrale Beziehungsauflösung

**Status:** resolved

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/issues/04-live-positionsfreigabe.md`)

- [x] Eine aktive gültige Freigabe macht die vorgesehenen Live-Positionen sichtbar.
- [x] Ausstehende, ungültige oder beendete Freigaben machen keine Positionen sichtbar.
- [x] Cross-Faction-Parteien erhalten keine Positionsteilung.
- [x] Die Freigabe wird serverseitig geprüft und nicht nur durch die UI gesteuert.
- [x] Live-Positionsfreigabe aktiviert nicht automatisch gemeinsame Scans.
- [x] Verhaltenstests decken fehlende, aktive, ausstehende und beendete Freigaben ab.

## Answer

Der vorhandene Sichtbarkeitspfad ist jetzt serverseitig an die aktive Beziehungsfreigabe `shareLivePositions` angebunden. `LivePositionVisibilityService` lädt nicht zerstörte Schiffe mit ihrer aktuellen Position, löst die Beziehung des Betrachters zum Besitzer zentral auf und gibt nur bei `mayShareLivePosition` die Position zurück. Aktive Freigaben wirken damit auch bei neutralem Beziehungsstatus; Freundschaft, historische Scans und Live-Positionen bleiben getrennte Fähigkeiten. Ausstehende Vorschläge, beendete Beziehungen, fehlende oder inkonsistente Parteien, Cross-Faction-Beziehungen und Resolver-Fehler fallen sicher auf keine Sichtbarkeit zurück. Die neue authentifizierte Route lautet `GET /api/spacecraft/shared-live-positions`.

Verhaltenstests prüfen aktive Freigaben für Galaxy- und Systempositionen, fehlende, ausstehende und beendete Freigaben, Cross-Faction-Parteien, das Ausblenden eigener Schiffe und den sicheren Fehlerfall. Der Scanpfad wird nicht verändert und durch die Live-Freigabe nicht aktiviert.
