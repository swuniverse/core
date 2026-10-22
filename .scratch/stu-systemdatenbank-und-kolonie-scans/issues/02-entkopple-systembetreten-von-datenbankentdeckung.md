# 02: Entkopple Systembetreten von Datenbankentdeckung

**What to build:** Das Betreten eines Sternensystems bleibt eine Bewegungs- und Feldexplorationsaktion, verschafft dem Spieler aber keinen Datenbank-Systemeintrag. Eine persönliche Systementdeckung wird eindeutig als die spätere Berechtigung für einen Systemeintrag vorbereitet und kann nicht durch bestehende Bewegungs- oder Scanpfade ungewollt entstehen.

**Blocked by:** 01: Dokumentiere Systementdeckung und Scanwissen.

**Status:** resolved

- [x] Das bloße Betreten eines Sternensystems erzeugt oder aktualisiert keine persönliche Systementdeckung für die Datenbank.
- [x] Die vorhandene persönliche Systementdeckung bleibt pro Spieler und Sternensystem idempotent und speichert Herkunft sowie Entdeckungszeit für einen späteren Astrometrieabschluss.
- [x] Feldexploration, Systemtypentdeckung und Himmelskörperklassenerkennung bleiben von der konkreten Systementdeckung getrennt und funktionieren weiterhin.
- [x] Bestehende Bewegungs- und Scanwege können keine Datenbankberechtigung für ein nicht astrometrisch entdecktes System erzeugen.
- [x] Verhaltenstests decken insbesondere das Betreten eines Systems ohne Datenbankentdeckung sowie die idempotente persönliche Entdeckung ab.

## Comments

Audit: Alle Akzeptanzkriterien sind erfüllt. Umsetzung: `apps/backend/src/modules/starmap/exploration.service.ts`, `entities/system-exploration.entity.ts`, `spacecraft.service.ts`, `spacecraft-scan.service.ts` und `starmap.controller.ts`; Tests: `exploration.service.spec.ts`, `spacecraft-movement-resources.spec.ts`, `spacecraft-scan.service.spec.ts`; maßgeblicher Commit: `2d4b583` (Merge `cc5080e`, frühere idempotente Persistenz `b901c34`).
