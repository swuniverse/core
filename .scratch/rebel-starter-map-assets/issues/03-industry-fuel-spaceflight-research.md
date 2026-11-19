# Rebellen-Ausbau: Durastahl, Hypermaterie, Landeplattform und Forschung
Status: resolved
Label: ready-for-agent
Type: task
Dependency: 02-early-production-chain.md (resolved)

## Auftrag

Nutzer hat die vorgeschlagene Viererserie freigegeben. Vier neue Star-Wars-Gebäude im bisherigen Grundstücksstil erzeugen und anbinden. game-data-Stand: 8cda53525946df8fb8e998194acd1a06737630bc.
Quellen: game-data/data/buildings/stu-buildings.yaml, game-data/data/research/rebels.yaml; Stil-/Exportreferenz: assets/generated/swu-rebel-starter-map-v1/README.md und assets/generated/swu-rebel-production-chain-map-v1/.
Domain: docs/agents/domain.md, docs/adr/0005-forschungsqueue-weicht-von-stu-ab.md.

| Familie | Rebellen-IDs | Neue PNG unter assets/buildings/generated/ | Forschung / Voraussetzung |
| --- | --- | --- | --- |
| Durastahl-Schmiede | 63110100, 63110199 | 63110100-rebel-durastahl-schmiede-map-v1.png | 252001 / 252101 |
| Hypermaterie-Synthesizer | 61020100, 61020111, 61020199 | 61020100-rebel-hypermaterie-synthesizer-map-v1.png | 253001 / 254101 |
| Landeplattform | 81110100, 81110199 | 81110100-rebel-landeplattform-map-v1.png | 270101 / 253001 |
| Forschungszentrum Stufe I | 72010100, 72010199 | 72010100-rebel-forschungszentrum-i-map-v1.png | 200101 / keine direkte Technologievoraussetzung |

Forschungszentrum-Forschung wird mit Durastahl (21) finanziert, hat aber keine Technologievoraussetzung; keinen Forge-Prerequisite erfinden. Die Durastahl-Schmiede verarbeitet Phrik (20) zu Durastahl-Legierung (21); Synthesizer gewinnt Hypermaterie (5) aus Vorkommen (1505), auf Wasser/Eis.
Hypermaterie-Geländealternative 90640100 ist eine andere Gebäudefamilie, bleibt unverändert.

## Ownership und Invarianten

ticket-coder besitzt ausschließlich apps/frontend/src/lib/assets.ts. Genau neun IDs aus obiger Tabelle in GENERATED_BUILDING_FILES umstellen, hidden Varianten ergänzen. Alle übrigen IDs, imperiale/shared Varianten, bisherige 30 IDs, 90640100, buildingImage-Signatur/Fallback unverändert.
Parent besitzt neue Quellen/Manifest/Export/Vorschauen unter assets/generated/swu-rebel-expansion-map-v1/ sowie die vier Produktions-PNGs.
Nicht allein im Codebestand: andere Änderungen erhalten. Kein FieldCell-, Status-, Spielregel-, API-, game-data- oder Ticket-Edit durch Coding Agent. Kein eigener Commit. Keine neuen Abstraktionen oder spiegelnden Tests.

## Akzeptanzkriterien

- [x] Vier transparente 256x256-PNGs, 512px-Master, Quelle und Prompt gespeichert.
- [x] Neun korrekte Rebellen-IDs angebunden; alle anderen Zuordnungen erhalten.
- [x] Namen, Forschungsbezüge, Voraussetzungen und Aufwand gegen game-data geprüft.
- [x] Quelle und 40/68px visuell geprüft; Synthesizer auf Wasser und Eis, übrige Gebäude auf Land.
- [x] PNG/Alpha und HTTP-Auslieferung geprüft; tatsächlicher buildingImage-Resolver liefert korrekte Pfade.
- [x] Separate Diff-Prüfung, gezielter Format-/Whitespacecheck, lokale Commits und dokumentierter Abschluss.

## Checks

Coding Agent: gezielter Prettier-Check und git diff --check -- apps/frontend/src/lib/assets.ts. Keine breiten Tests/Builds, Browserprüfungen oder Commits.
Parent: vollständige Tabelle gegen vorherigen HEAD, neun IDs und Tech-Daten gegen YAML, Quellen und Geländeprüfungen, tatsächlicher Resolver und bytegleiche HTTP-Auslieferung.
Unveränderte FieldCell-/Statusdarstellung ist aus Serie 1 geprüft; keine wiederholten breiten Browser-/Regressionschecks ohne neuen konkreten Grund.

## Comments

- Planung/Review im verfügbaren aktuellen Sitzungsmodell; aktive Modellumschaltung auf gpt-6.1-sol nicht verfügbar. Begrenzte Anbindung über callable ticket-coder, GPT-6 Luna high.

- Umsetzung und separate fokussierte Prüfung abgeschlossen. Assets-Commit: 090a2201a6; Core-Commit: eindeutiger Betreff "feat: integrate Rebel industry fuel flight and research assets".
- Vier 256x256-RGBA-PNGs, 512px-Master, Quellblatt, vollständiger Prompt und Manifest gespeichert. Quelle und 40/68px visuell geprüft. Synthesizer-Vorschauen auf tatsächlich erlaubtem Flachwasser A430 und Packeis A530, übrige Gebäude auf standard-freigegebenem C119/C640/D819.
- Neun ausgewählte Namen-/ID-Zuordnungen, Forschungsvoraussetzungen und Aufwand gegen YAML validiert; Forschungszentrum 200101 ohne Technologievoraussetzung, Finanzierungsware 21 bestätigt. Alle Vorschau-Codes gegen die SWU-Bebaubarkeitskategorien geprüft. Alle anderen Zuordnungen einschließlich voriger Serien, imperialer/shared Varianten und 90640100 erhalten.
- Tatsächlichen buildingImage-Resolver aus der TypeScript-Quelle ausgeführt: neun Pfade korrekt. Vier PNGs über Vite unter /assets geladen, HTTP-Erfolg, image/png und bytegleicher Inhalt (421474 Bytes). Gezielter Prettier- sowie Code-/Assets-Whitespacecheck bestanden.
- Keine verbleibenden Akzeptanzkriterien. FieldCell-/Statusdarstellung unverändert, aus Serie 1 geprüft; keine erneute breite Browser-/Regressionsserie nötig.
- Routing: Parent im verfügbaren Sitzungsmodell für Planung, Erzeugung, Export, Review und Verifikation; ticket-coder GPT-6 Luna high nur für assets.ts. Aktive Parent-Modellumschaltung nicht verfügbar. Keine Code-Nacharbeit nötig.
