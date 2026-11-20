# Imperiale Stufe-I-Assets anbinden

Status: resolved
Label: ready-for-agent
Type: task

## Auftrag

Nach Export und Parent-Sichtprüfung aller 11 Manifeste aus assets/generated/swu-imperial-stage-i-v1/plan.json exakt deren 94 IDs in GENERATED_BUILDING_FILES auf die Manifest-Dateinamen umstellen. Bestehende Tabelle und buildingImage-Fallback erhalten. Spezifikation: ../spec.md.

## Ownership

Coding Agent besitzt ausschließlich apps/frontend/src/lib/assets.ts. Nicht allein im Codebestand: Änderungen anderer erhalten. Alle anderen IDs, insbesondere sämtliche Rebellen/shared Zuordnungen, erhalten. Keine Gameplay-, API-, FieldCell-, Ticket-, Asset- oder game-data-Edits. Keine Abstraktionen und kein Commit durch Coding Agent.

## Akzeptanzkriterien

- [x] Exakt 94 Manifest-IDs angebunden und übrige Zuordnungen unverändert.
- [x] Gezielter Prettier-Check und git diff --check bestanden.
- [x] Parent prüft tatsächlichen Resolver und bytegleiche HTTP-Auslieferung aller 42 Bilder.
- [x] Gemeinsame Browserfixture mit FieldCell, numerischen Feldern, Orbit und Zuständen bestanden.
- [x] Scoped Corecommit, Dokumentation und Tickets geschlossen.

## Comments

- Parent plant/reviewt im verfügbaren Sitzungsmodell; aktive Umschaltung auf GPT-6.1 Sol nicht verfügbar. Integration delegiert an ticket-coder GPT-6 Luna high.

## Answer

Exakt die 94 imperialen IDs aus allen elf Manifesten angebunden. 42 Bilder, Resolver und HTTP-Auslieferung geprüft. Alle Rebellen/shared Zuordnungen und Resolvercode erhalten. FieldCell-Browserfixture: 94 Varianten, 302 Bilder, 36 Statusfälle und 42 Menübilder erfolgreich, keine Fehler oder Bildüberläufe. Prettier und Whitespaceprüfung bestanden; lokale Commit-Evidenz: eindeutiger Betreff "feat: complete verified Imperial stage-I building assets".

Parent-Sitzungsmodell für Planung/Review, ticket-coder GPT-6 Luna high für assets.ts. Coding Agent korrigierte einen im eigenen Audit gefundenen Indexfehler des ersten Ersetzungsskripts; die zuvor saubere Datei wurde aus seinem HEAD wiederhergestellt und ausschließlich anhand der 94 Manifest-IDs neu aufgebaut. Parent prüfte unabhängig die gesamte Tabelle und unveränderten Resolvercode gegen die ursprüngliche Baseline 5c31a4e97a7fe29f95a8276130f2f6b822879409. Keine geschätzten Modellnutzungswerte.
