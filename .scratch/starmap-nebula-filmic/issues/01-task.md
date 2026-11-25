# Generator und sichere Neugenerierung

Type: task
Status: claimed
Label: ready-for-agent

Spec: ../spec.md

## Acceptance criteria

- [x] Spezifiziertes Verhalten umgesetzt.
- [x] Gezielte Prüfung erfolgreich.
- [ ] Getrennte Verifikation erfolgreich.

## Comments

2026-11-25: Hauptagent nutzt Sitzungsmodell gemäß Verfügbarkeits-Fallback; Editor-UI an ticket-coder (Luna high), Architektur und Transaktionen direkt.

2026-11-25: umgesetzt, Prüfung ausstehend (Commit-Betreff: „feat(starmap): add continuous filmic galaxy nebulae“). Gezielte Backendtests (10), Integrationsfälle (11 inkl. Migration und manueller Rücknahme) und UI-/Cachetests (31) erfolgreich. Offene gesammelte Prüfung: abschließender Diff-Abgleich, Frontend-Build und Start-/Vorschauprüfung im verwalteten Workspace. Backend-Suite 2785 Tests, Frontend-Suite 1049 Tests bereits grün; zuletzt betroffene UI-Pfade erneut gezielt geprüft.
