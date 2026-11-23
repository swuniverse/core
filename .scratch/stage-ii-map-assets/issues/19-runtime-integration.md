# Forschungsstufe-II-Assets anbinden

Status: claimed
Label: ready-for-agent
Type: task

## Auftrag

Nach vollständiger Produktion genau 138 IDs aus assets/generated/swu-stage-ii-v1/plan.json auf die Dateinamen ihrer Manifeste in GENERATED_BUILDING_FILES setzen. Siehe ../spec.md.

## Ownership

Coding Agent besitzt ausschließlich apps/frontend/src/lib/assets.ts. Nicht allein im Codebestand; Änderungen anderer erhalten. Alle anderen IDs und Resolvercode unverändert. Keine Tickets, Assets, game-data, Gameplay oder FieldCell ändern, kein Commit.

## Akzeptanzkriterien

- [x] Genau 138 IDs nach Manifest angebunden, alle übrigen Zuordnungen und Resolver unverändert.
- [x] Prettier und git diff --check bestanden.
- [ ] Parent hat separate Daten-/Resolver-/HTTP-/dev-browser-Prüfung durchgeführt.
- [ ] Scoped Corecommit und Abschluss dokumentiert.

## Comments

- 2026-11-23: bounded integration delegated to ticket-coder GPT-6 Luna high; ownership exclusively assets.ts. Parent completes independent raster/integration verification.

- 2026-11-23: umgesetzt, Prüfung ausstehend; 138 Zuordnungen (58 ersetzt / 80 ergänzt), alle übrigen IDs und Resolver unverändert. Prettier und Diffcheck bestanden; unabhängige Daten-/Resolver-/HTTP-Prüfung bestanden, dev-browser noch offen. Kein Commit durch Coding Agent.
