# 06: End-to-end Beziehungswirkungen verifizieren

**What to build:** Die vollständig integrierte Wirkungsschicht wird über die vorhandenen Spielpfade verifiziert. Änderungen an aktiven Beziehungen wirken dynamisch auf alle implementierten Verbraucher, sichere Fehlerfälle öffnen keine Privilegien, und der bestehende Diplomatie-Kern bleibt unverändert beobachtbar. Nicht vorhandene Verbraucher werden als spätere Integrationspunkte festgehalten.

**Blocked by:** 02: Alarm- und automatische Kampfreaktionen anbinden; 03: Freundbasierte Transfers und Schiffsversorgung; 04: Live-Positionsfreigabe; 05: Weitere vorhandene Zugangs- und Scanpfade anbinden

**Status:** resolved

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/beziehungswirkungen-issues/06-end-to-end-beziehungswirkungen.md`)

- [x] Annahme, Änderung und Beendigung einer aktiven Beziehung wirken ohne manuelle Synchronisierung auf die vorhandenen Verbraucher.
- [x] Eine ausstehende Beziehung oder Freigabe bleibt ohne Spielwirkung.
- [x] Sichere Fehlerfälle verhindern Transfer, Versorgung und Live-Positionsfreigabe.
- [x] Alarm, Kampf, Transfers, Versorgung, Sichtbarkeit und vorhandene Zugangs-/Scanpfade zeigen konsistentes Verhalten, soweit die Systeme im Repository existieren.
- [x] Bestehende öffentliche Diplomatieanzeige und Vertragswerk bleiben unverändert korrekt.
- [x] Regressionstests bestätigen, dass direkte Angriffe und nicht betroffene Spielregeln unverändert bleiben.
- [x] Fehlende eigenständige Systeme sind als spätere Integrationspunkte dokumentiert, nicht als neue Umsetzung enthalten.

## Answer

Die End-to-End-Prüfung findet keine weitere Integrationslücke im bestehenden Wirkungsbereich. `RelationshipResolverService.resolve` liest ausschließlich aktive Beziehungen und leitet daraus dynamisch die Fähigkeiten für automatische Reaktionen, sichere Transfers/geschützte Versorgung, Live-Positionsfreigabe und historische Scans ab. Vorschläge und beendete Beziehungen werden dadurch nicht berücksichtigt; unbekannte Spieler, Cross-Faction-Parteien und Resolver-Fehler fallen geschlossen auf Neutral ohne Freigaben zurück. Die Verbraucher verwenden diese Fähigkeiten unmittelbar: `TransferService` sperrt sichere Transfers und geschützte Versorgung, `LivePositionVisibilityService` filtert Positionen, und `SpacecraftScanService` schützt Listen- und Detailzugriff auf historische Koloniescans. Öffentliche Allianzdetails und Vertragswerk verwenden weiterhin den aktiven Beziehungsbestand.

Alarm-/automatische Kampfreaktionen besitzen keinen eigenständigen Triggerpfad im aktuellen SWU-Code. Direkte Angriffe bleiben außerhalb dieser Wirkungsschicht und damit unverändert. Docking, spielergesteuerte Wurmlochrechte und Handelsposten sind ebenfalls keine vorhandenen Verbraucher; sie bleiben gemäß Scope dokumentierte spätere Integrationspunkte.

Verifiziert mit den öffentlichen Service-Seams in den vorhandenen Resolver-, Transfer-, Live-Position- und Scan-Tests: 4 Suites, 31 Tests erfolgreich. Die Tests decken Freund-/Feind-/Neutralauflösung, sichere Fehlerfälle, dynamische aktive Beziehungseffekte sowie verweigerte Sichtbarkeit und Scan-/Transferzugriffe ab.

## Comments

- Baseline zunächst auf `origin/main` festgestellt; der Arbeitszweig enthielt danach den aktuellen `integration/beziehungswirkungen`-Stand per Merge-Commit `b750f0e`.
- Vollständiger Repository-Testlauf wurde mit einem nicht unterstützten `--runInBand`-Flag für Vitest gestartet und brach im Frontend ab; der Backend-Teil lief weiter. Der korrekte gezielte Jest-Lauf ist erfolgreich. Fehlende `apps/backend/game-data`-Fixtures erzeugen in breiteren Läufen Warnungen, sind für die gezielten Suites nicht relevant.
- Nachverifikation 2026-10-08: `50a158d` hatte das Teilen historischer Koloniescans innerhalb der Allianz entgegen der Entscheidung „Sternenkarte, Scans und Sichtbarkeit“ wieder entfernt. Der Scan-Teil dieses Commits wurde zurückgenommen; die Transferkorrektur bleibt bestehen. Vollständiger Lauf danach grün (Backend-, Frontend-, Postgres-Integrationstests und Lint).
