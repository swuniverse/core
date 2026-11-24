# Editor-Vorschau

Type: task
Status: claimed
Label: ready-for-agent

Spec: ../spec.md

## Acceptance criteria

- [x] Verhalten gemäß Spezifikation umgesetzt.
- [x] Gezielte Tests und Diffprüfung erfolgreich.
- [ ] Separater Verifikationslauf erfolgreich.

## Comments

2026-11-24: Hauptagent verwendet Sitzungsmodell (kein Modellwechsel in laufender Sitzung). Bounded UI wird an ticket-coder (GPT-6 Luna, high) delegiert; Architektur und Transaktionen bleiben beim Hauptagenten.

2026-11-24: umgesetzt, Prüfung ausstehend. Commit-Subject: `feat(starmap): add deterministic nebula terrain and editor previews`. Gezielte Generator-/Berechtigungstests (6), PostgreSQL-Integration (6), Editor-UI (6), Terrain/Canvas/LSS/Datenbankraster erfolgreich; App-Typprüfung erfolgreich; ESLint ohne Fehler. Noch ausstehend: gemeinsamer Frontend-/Backend-Testlauf, betroffene bestehende Ressourcen-/Feldfolgen-Integration und Frontend-/Backend-Build. Optionaler Headless-Screenshot konnte wegen Browser-Startfehler nicht erstellt werden; kein manueller Nutzercheck erforderlich.
