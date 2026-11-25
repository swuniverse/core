# Sternenkarte mit Nebelgebieten

## Decisions-so-far

- [Spezifikation](spec.md): echte, sanfte Nebelfelder auf Galaxie und Systemen; deterministische Erzeugung, Vorschau vor dem Anwenden.
- [01 Generator](issues/01-generator.md): auf geschützten Bestandsdaten atomar anwenden, veraltete Vorschau ablehnen; abgeschlossen.
- [02 Editor](issues/02-editor.md): realistische Vorschau mit Seed, Dichte, Kartenwahl und optionalen Änderungsmarkierungen; abgeschlossen.
- [03 Darstellung](issues/03-rendering.md): gemeinsame Terrainpolitik, weiche Nebelränder, kein Galaxie-Hintergrundblitz; abgeschlossen.
- [Verifikation](verification.md): alle erforderlichen Prüfungen erfolgreich.

- [04 Worktree-Start](issues/04-worktree-startup.md): lokale Konfiguration und ursprüngliche Entwicklungsdatenbank eingebunden; Backend ONLINE.

- [05 Vorschau-Schema](issues/05-preview-schema.md): Himmelskörper-Join korrigiert, echtes Anwendungsschema als Regressionstest, Vorschau auf Bestandskarte geprüft.

## Fog

Keine offenen Umsetzungskriterien. Die Bestandskarte wird erst durch eine angewendete Vorschau verändert.
