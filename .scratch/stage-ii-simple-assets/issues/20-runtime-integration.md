# Schlichte FZ2-Assets anbinden

Status: resolved
Label: ready-for-agent
Type: task

## Auftrag

Nach Produktion genau 138 IDs aus assets/generated/swu-stage-ii-simple-v2/plan.json und den 18 Manifesten in GENERATED_BUILDING_FILES auf item.file setzen.

## Ownership

Coding Agent ausschließlich apps/frontend/src/lib/assets.ts. Nicht allein im Codebestand: Änderungen anderer erhalten. Alle anderen IDs und Resolvercode unverändert. Keine Asset-, Ticket-, Gameplay-, FieldCell- oder game-data-Edits; kein Commit.

## Akzeptanzkriterien

- [x] Exakt 138 Zuordnungen, alle übrigen Werte und Code außerhalb der Tabelle unverändert.
- [x] Prettier und git diff --check bestanden.
- [x] Parent-Diffreview, unabhängige Daten-/Resolver-/HTTP- und dev-browser-Prüfung bestanden.
- [x] Scoped Corecommit und Abschluss dokumentiert.

## Comments

- 2026-11-24: Alle 76 Familien exportiert; begrenzte Zuordnungsänderung an ticket-coder (GPT-6 Luna, high) delegiert. Parent prüft und committed separat.

- 2026-11-24: Abgeschlossen nach separater gemeinsamer Prüfung. 76 Familien / 138 IDs; Assetcommit 27af3eb2adf89d6b7298e5ff0af08cd90769173d; Core-Integration im Commit „feat: use verified simple FZ2 building assets“.
- Originalquellen, exakte Prompts, Referenzen, 256px-RGBA-PNGs, 512px-Master und visuell geprüfte 40/68px-Montagen erhalten. Zwei freigegebene Muster bytegleich. Daten/Forschung/Feldvorschauen, PNG/Alpha, vollständiger Resolver und bytegleiche HTTP-Auslieferung bestanden: assets/generated/swu-stage-ii-simple-v2/full-verification.json.
- Finale FieldCell-Prüfung ohne Bildcache bestanden: 138 Varianten, 576 Bilder, 112 Zustandsfälle, 76 Menübilder, 68/40px; keine Ladefehler oder Überläufe. Nachweis: assets/generated/swu-stage-ii-simple-v2/browser-verification.json. Separate Alpha-Prüfung: 76 Dateien, sechs erhaltene technische Kernregionen, vier transparente Öffnungsproben. Prettier und git diff --check bestanden. Keine offenen Prüfungen.
- Routing: Parent-Produktion/Planung/Review im verfügbaren Sitzungsmodell; GPT-6.1 Sol nicht aktiv wählbar. Ausschließlich Zuordnungstabelle durch ticket-coder (GPT-6 Luna, high), Parent prüfte exakt 138 Änderungen und 308 unveränderte übrige Zuordnungen sowie Code außerhalb der Tabelle. Materialrework: Rasterseparatoren beim Zuschnitt ausgeschlossen, Magenta-Säume entfernt und emissive Plasma-/Phasenkerne aus der Originalquelle geschützt.
