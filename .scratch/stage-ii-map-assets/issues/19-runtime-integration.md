# Forschungsstufe-II-Assets anbinden

Status: resolved
Label: ready-for-agent
Type: task

## Auftrag

Nach vollständiger Produktion genau 138 IDs aus assets/generated/swu-stage-ii-v1/plan.json auf die Dateinamen ihrer Manifeste in GENERATED_BUILDING_FILES setzen. Siehe ../spec.md.

## Ownership

Coding Agent besitzt ausschließlich apps/frontend/src/lib/assets.ts. Nicht allein im Codebestand; Änderungen anderer erhalten. Alle anderen IDs und Resolvercode unverändert. Keine Tickets, Assets, game-data, Gameplay oder FieldCell ändern, kein Commit.

## Akzeptanzkriterien

- [x] Genau 138 IDs nach Manifest angebunden, alle übrigen Zuordnungen und Resolver unverändert.
- [x] Prettier und git diff --check bestanden.
- [x] Parent hat separate Daten-/Resolver-/HTTP-/dev-browser-Prüfung durchgeführt.
- [x] Scoped Corecommit und Abschluss dokumentiert.

## Comments

- 2026-11-23: bounded integration delegated to ticket-coder GPT-6 Luna high; ownership exclusively assets.ts. Parent completes independent raster/integration verification.

- 2026-11-23: umgesetzt, Prüfung ausstehend; 138 Zuordnungen (58 ersetzt / 80 ergänzt), alle übrigen IDs und Resolver unverändert. Prettier und Diffcheck bestanden; unabhängige Daten-/Resolver-/HTTP-Prüfung bestanden, dev-browser noch offen. Kein Commit durch Coding Agent.

## Answer

Vollständig umgesetzt und separat verifiziert. 76 Bilder / 138 IDs insgesamt; Datensatz, Alpha, Master, Resolver und HTTP geprüft. dev-browser: 138 Varianten, 576 Bilder, 112 Zustände, 76 Menübilder; keine Fehler/Überläufe. Implementierungscommit ae52e302; Assetproduktion 86ea6905eb. Rasterkorrekturen: fünf Schnittkanten, sechs eingeschlossene Thermal-Zwischenräume und zwei deckende Raumhafen-Decks dokumentiert. Parent im verfügbaren Modell; Integration GPT-6 Luna high. Keine gemessenen Tokenzahlen verfügbar.

Kontext: ../spec.md, ../../../assets/generated/swu-stage-ii-v1/README.md und ../map.md.
