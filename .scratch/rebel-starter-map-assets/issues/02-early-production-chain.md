# Frühe Rebellen-Produktionskette: Gezeiten, Transparistahl und Phrik
Status: resolved
Label: ready-for-agent
Type: task
Dependency: 01-first-production-series.md (resolved)

## Auftrag und Daten

Nutzer hat die nächste Serie freigegeben: Gezeitenkraftwerk und Produktionskette zu Transparistahl/Phrik. Gleicher Star-Wars-Grundstücksstil und Produktionsvertrag wie Serie 1. Vier neue Familien, genau zehn Rebellen-IDs.
Quellen: game-data/data/buildings/stu-buildings.yaml; game-data/data/research/rebels.yaml; assets/generated/swu-rebel-starter-map-v1/README.md.
Domain: docs/agents/domain.md; docs/adr/0005-forschungsqueue-weicht-von-stu-ab.md. Keine Forschungs- oder Bauregeln ändern.

| Familie | IDs | Neue PNG unter assets/buildings/generated/ | Forschung / direkte Voraussetzung |
| --- | --- | --- | --- |
| Gezeitenkraftwerk | 31020100, 31020132, 31020199 | 31020100-rebel-gezeitenkraftwerk-map-v1.png | 230101 / 1001 |
| Transparistahl-Manufaktur | 62020100, 62020199 | 62020100-rebel-transparistahl-manufaktur-map-v1.png | 254101 / 254001 |
| Phrik-Mine | 61110100, 61110112, 61110199 | 61110100-rebel-phrik-mine-map-v1.png | 251001 / 254101 |
| Phrik-Raffinerie | 63100100, 63100199 | 63100100-rebel-phrik-raffinerie-map-v1.png | 252101 / 251001 |

Phrik-Raffinerie hat sort=148, ist aber unmittelbar nach der Mine verfügbar. Dateireihenfolge ist nicht der Forschungsweg.
Transparistahl-Manufaktur: Tibanna-Gas 3 -> Transparistahl 4; Mine: Vorkommen 1511 -> Phrik-Erz 11; Raffinerie: Erz 11 -> Phrik 20.
Die generische Asteroiden-Mine 90560100 ist eine alternative andere Gebäudefamilie und wird nicht umgestellt.
Alle nicht ausgewählten IDs, einschließlich imperialer Varianten, gemeinsam verwendeter Altdateien und der ersten 20 Rebellen-IDs, unverändert lassen.

## Zuständigkeiten

Parent besitzt Erzeugung, Export, Quellen, Vorschauen und Dokumentation unter assets/generated/swu-rebel-production-chain-map-v1/ sowie die vier neuen Produktions-PNGs.
ticket-coder besitzt ausschließlich apps/frontend/src/lib/assets.ts. Bestehende GENERATED_BUILDING_FILES-Tabelle verwenden, keine neue Abstraktion. Kein FieldCell-/Status-/API-/game-data-Edit. Nicht allein im Codebestand; andere Änderungen erhalten.
Parent prüft und committet beide Repositories. Kein eigener Commit durch ticket-coder.

## Akzeptanzkriterien

- [x] Vier transparente 256x256-PNGs, 512px-Master, Quellen und Prompt gespeichert.
- [x] Genau zehn ausgewählte IDs auf die richtigen neuen Dateien umgestellt; andere Zuordnungen unverändert.
- [x] Manifest mit IDs, Voraussetzungen und Produktionsbezug aus game-data geprüft.
- [x] Quellen und 40/68px-Vorschauen visuell geprüft: Gezeiten auf Wasser, Mine auf Fels, Verarbeitung auf Land.
- [x] Dateien über /assets auslieferbar und Zuordnungen im echten buildingImage-Resolver geprüft.
- [x] Separate Diff-Prüfung und gezielter Format-/Whitespacecheck; dokumentierter Abschluss und lokale Commits.

## Checks

ticket-coder: Prettier-Check der geänderten Datei, git diff --check; keine breiten Tests oder Builds, keine Tests, die nur die Tabelle spiegeln.
Parent: Manifest/IDs/Voraussetzungen gegen YAML, gesamte Tabelle gegen vorherigen HEAD, PNG/Alpha, tatsächliche HTTP-Auslieferung und fokussierte Ansicht.
Die gleiche unveränderte FieldCell und Statusdarstellung wurde in Serie 1 geprüft; keine Wiederholung breiter Browserprüfungen ohne neuen konkreten Grund. Gezielte visuelle Prüfung dieser vier Anlagen und ihrer neuen Formen bleibt notwendig.

## Comments

- Planung/Review im verfügbaren aktuellen Sitzungsmodell; keine aktive Umschaltung auf gpt-6.1-sol verfügbar. Begrenzte Code-Anbindung über callable ticket-coder, GPT-6 Luna high.

- Umsetzung und separate fokussierte Prüfung abgeschlossen. Assets-Commit: 47d31e1511; Core-Commit dieser Arbeit: eindeutiger Betreff "feat: integrate early Rebel production chain assets".
- Evidenz: vier echte transparente 256x256-RGBA-PNGs, 512px-Master, vollständiger Prompt, Quellblatt und Manifest gespeichert; Quellen und 40/68px auf Wasser/Fels/Land visuell geprüft.
- Alle zehn ausgewählten IDs, Namen, Forschungen, direkten Voraussetzungen und Aufwand gegen game-data validiert. Sämtliche nicht ausgewählten Zuordnungen einschließlich erster Serie, imperialer Varianten und 90560100 unverändert gegenüber vorherigem HEAD.
- Tatsächlicher buildingImage-Resolver aus der aktuellen TypeScript-Quelle ausgeführt: alle zehn Pfade korrekt. Vier PNGs über Vite unter /assets als image/png geladen, bytegleich mit Dateien (435208 Bytes). Gezielter Prettier-, Core-Diff- und Assets-Diff-Check bestanden.
- Keine verbleibenden Akzeptanzkriterien. FieldCell/Statusdarstellung unverändert und bereits in Serie 1 geprüft; keine wiederholte breite Browser-/Regressionsprüfung nötig.
- Routing: verfügbare Parent-Sitzung für Planung, Bildgenerierung, Review und Verifikation; ticket-coder GPT-6 Luna high für den begrenzten Edit von assets.ts. Keine Modellumschaltung der Parent-Sitzung verfügbar. Keine Code-Nacharbeit nötig.
