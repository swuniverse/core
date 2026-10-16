# 02: Entkopple Systembetreten von Datenbankentdeckung

**What to build:** Das Betreten eines Sternensystems bleibt eine Bewegungs- und Feldexplorationsaktion, verschafft dem Spieler aber keinen Datenbank-Systemeintrag. Eine persönliche Systementdeckung wird eindeutig als die spätere Berechtigung für einen Systemeintrag vorbereitet und kann nicht durch bestehende Bewegungs- oder Scanpfade ungewollt entstehen.

**Blocked by:** 01: Dokumentiere Systementdeckung und Scanwissen.

**Status:** ready-for-agent

- [ ] Das bloße Betreten eines Sternensystems erzeugt oder aktualisiert keine persönliche Systementdeckung für die Datenbank.
- [ ] Die vorhandene persönliche Systementdeckung bleibt pro Spieler und Sternensystem idempotent und speichert Herkunft sowie Entdeckungszeit für einen späteren Astrometrieabschluss.
- [ ] Feldexploration, Systemtypentdeckung und Himmelskörperklassenerkennung bleiben von der konkreten Systementdeckung getrennt und funktionieren weiterhin.
- [ ] Bestehende Bewegungs- und Scanwege können keine Datenbankberechtigung für ein nicht astrometrisch entdecktes System erzeugen.
- [ ] Verhaltenstests decken insbesondere das Betreten eines Systems ohne Datenbankentdeckung sowie die idempotente persönliche Entdeckung ab.
