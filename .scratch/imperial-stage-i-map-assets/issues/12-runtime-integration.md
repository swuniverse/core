# Imperiale Stufe-I-Assets anbinden

Status: open
Label: ready-for-agent
Type: task

## Auftrag

Nach Export und Parent-Sichtprüfung aller 11 Manifeste aus assets/generated/swu-imperial-stage-i-v1/plan.json exakt deren 94 IDs in GENERATED_BUILDING_FILES auf die Manifest-Dateinamen umstellen. Bestehende Tabelle und buildingImage-Fallback erhalten. Spezifikation: ../spec.md.

## Ownership

Coding Agent besitzt ausschließlich apps/frontend/src/lib/assets.ts. Nicht allein im Codebestand: Änderungen anderer erhalten. Alle anderen IDs, insbesondere sämtliche Rebellen/shared Zuordnungen, erhalten. Keine Gameplay-, API-, FieldCell-, Ticket-, Asset- oder game-data-Edits. Keine Abstraktionen und kein Commit durch Coding Agent.

## Akzeptanzkriterien

- [ ] Exakt 94 Manifest-IDs angebunden und übrige Zuordnungen unverändert.
- [ ] Gezielter Prettier-Check und git diff --check bestanden.
- [ ] Parent prüft tatsächlichen Resolver und bytegleiche HTTP-Auslieferung aller 42 Bilder.
- [ ] Gemeinsame Browserfixture mit FieldCell, numerischen Feldern, Orbit und Zuständen bestanden.
- [ ] Scoped Corecommit, Dokumentation und Tickets geschlossen.

## Comments

- Parent plant/reviewt im verfügbaren Sitzungsmodell; aktive Umschaltung auf GPT-6.1 Sol nicht verfügbar. Integration delegiert an ticket-coder GPT-6 Luna high.
