# Traktor-Symbol in der NBS-Liste und Aktivierungsmeldungen wie STU

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** sc-WP-TRACT-1c

## Ziel

STU zeigt das Traktor-Symbol in der NBS-Liste nach einer Zielregel und meldet Gründe der Quelle erst beim Klick, z. B. „Antares: System Traktorstrahl konnte nicht aktiviert werden, weil die Schilde aktiviert sind“. SWU blendete das Symbol bei eigenen Schilden, Urlaub, gehaltenen Schiffen und eigenem Hyperantrieb aus; der Spieler sah keinen Grund.

## STU-Quellen

- `src/html/shipmacros.twig` Z. 279 (`nbsItem.isTractorbeamPossible and not SPACECRAFT.isTractoring`)
- `src/Component/Spacecraft/System/Type/TractorBeamShipSystem.php` (`isTractorBeamPossible`: Ziel keine Station, nicht getarnt, nicht geschildet, nicht im Warp; `checkActivationConditions`: Quelle Tarnung, Schilde, angedockt, selbst gehalten)
- `src/Component/Spacecraft/System/Control/SystemActivation.php` Z. 66 (Meldungsformat)
- `src/Module/Spacecraft/Action/ActivateTractorBeam/ActivateTractorBeam.php`

## Akzeptanzkriterien

- [x] NBS-Flag `tractor`: Ziel ist Schiff, nicht getarnt, nicht geschildet, nicht im Hyperraum; Quelle zieht nichts und hat das System.
- [x] Aktivierung meldet Quellgründe im STU-Format `<Schiff>: System Traktorstrahl konnte nicht aktiviert werden, weil …` für Tarnung, Schilde, angedockt, selbst gehalten (neu: Tarnung und angedockt).
- [x] Unit-Tests für die vier Meldungen.

## Comments

### 2026-11-23 — umgesetzt, Prüfung ausstehend

Commit: `fix(spacecraft): STU tractor icon rule and activation messages (stu-parity sc-WP-TRACT-1d)`

- Abweichung von STU bewusst: Das Symbol erscheint nur, wenn die Quelle das System hat (Shuttles und Workbees haben keins).
- Urlaubs- und Zielmeldungen unverändert.
- Checks: Jest `spacecraft`, `combat`, `alert-reaction` (83 Suites, 927 Tests) ✓; PostgreSQL-Integrationstests mit Traktorbezug (10 Suites, 256 Tests) ✓; `nx typecheck backend` ✓.
- Modell: Claude Opus 5.5 direkt.
- Ausstehend: gesammelter Verifikationslauf.
