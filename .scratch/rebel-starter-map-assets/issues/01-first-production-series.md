# Erste Rebellen-Gebäudeserie im freigegebenen Star-Wars-Grundstücksstil
Status: resolved
Label: ready-for-agent
Type: task

## Auftrag

Nutzerentscheidung: Die höhere Draufsicht und die als bebaute Grundstücke gestalteten Star-Wars-Entwürfe sind freigegeben. Die erste Produktionsserie soll anhand game-data und des frühen Rebellen-Forschungswegs ausgewählt, als transparente Einzelassets erstellt und ins Spiel eingebunden werden.

## Auswahl und Quellen

Maßgeblich: game-data/data/buildings/stu-buildings.yaml und game-data/data/research/rebels.yaml.
Grundlagenforschung der Allianz (1001) eröffnet die fünf regulären Grundgebäude. Die Kommandozentrale ist das tatsächliche Startgebäude laut apps/backend/src/modules/faction/faction.service.ts (REBEL_ALLIANCE.startBuildingId=82010100); ihr game-data-Eintrag hat allowedFieldTypes leer und ist kein normaler Baumenüeintrag.
Aqua-Zuchtfarm (220101, Aufwand 5) und Chemische Fabrik (254001, Aufwand 10) hängen direkt von 1001 ab. Letztere schaltet im aktuellen Datensatz den Tibanna-Extraktor frei. Diese bestehenden Namen/Zuordnungen werden nicht verändert.
Forschungslabor 71010100 ist visible=false und gehört zu researchId 201001; Phrik-Mine 61110100 liegt hinter 254101; Landeplattform 81110100 hinter 253001. Sie werden später bearbeitet.

| Familie | IDs dieser Rebellen-Serie | PNG unter assets/buildings/generated/ |
| --- | --- | --- |
| Kommandozentrale | 82010100, 82010199 | 82010100-rebel-kommandozentrale-map-v1.png |
| Wohnkomplex | 11010100, 11010103, 11010199 | 11010100-rebel-wohnkomplex-map-v1.png |
| Hydrokultur-Gewächshaus | 21010100, 21010101, 21010199 | 21010100-rebel-hydrokultur-map-v1.png |
| Ionensegel-Kollektor | 31010100, 31010131, 31010199 | 31010100-rebel-ionensegel-map-v1.png |
| Doonium-Schmelze | 61010100, 61010199 | 61010100-rebel-doonium-schmelze-map-v1.png |
| Versorgungslager | 81210100, 81210199 | 81210100-rebel-versorgungslager-map-v1.png |
| Aqua-Zuchtanlage | 21020100, 21020102, 21020199 | 21020100-rebel-aqua-zuchtanlage-map-v1.png |
| Tibanna-Extraktor | 61030100, 61030199 | 61030100-rebel-tibanna-extraktor-map-v1.png |

## Zuständigkeiten

Parent erstellt neue Rastergrafiken, Quellen, Manifest und Produktions-PNGs unter assets/generated/swu-rebel-starter-map-v1/ und assets/buildings/generated/.
ticket-coder besitzt ausschließlich apps/frontend/src/lib/assets.ts sowie eine dort unmittelbar nötige Hilfsdatei, falls das bestehende Muster sie verlangt. Bevorzugt die bestehende GENERATED_BUILDING_FILES-Tabelle direkt aktualisieren; kein neues Framework, kein neuer Resolver.
Das Ticket dient als Handoff; keine Architektur-, Rechte-, Balance- oder Datenbankänderungen.

## Invarianten

- Nur die oben aufgeführten 20 IDs auf die acht neuen Dateien umstellen. Andere IDs, besonders imperiale Varianten und bestehende Zuordnungen zu gemeinsam verwendeten Altdateien, erhalten exakt ihr bisheriges Verhalten.
- Auch nicht sichtbare terrainabhängige Rebellen-Alternativen bekommen dasselbe Familienasset, damit tatsächlich errichtete Gebäude nicht zurück auf Altgrafiken wechseln.
- buildingImage-Schnittstelle und Fallback bleiben erhalten.
- Rendering, Gebäudestatus, Forschungs-/Bauregeln und Terrain bleiben erhalten. Keine neue Leucht-/Shaderlogik.
- Neue versionierte Dateien; bestehende PNGs bleiben erhalten.
- Nicht zusammengehörige Änderungen im Arbeitsbaum nicht anfassen.

## Akzeptanzkriterien

- [x] Auswahl und Forschungsbegründung mit echten IDs dokumentiert.
- [x] Acht transparente 256x256-Produktions-PNGs und große Quellen/Prompt gespeichert.
- [x] 20 aufgeführte IDs verwenden korrekte neue PNGs; imperiale und sonstige IDs unverändert.
- [x] Dateien und Auflösung validiert; Quellen sowie 40/68px-Vorschauen auf mehreren Böden visuell geprüft.
- [x] Code-Diff separat geprüft, kleinste passende Checks durchgeführt.
- [x] Lokal über /assets auslieferbar; Echtspiel-Rendering geprüft oder exakt als verbleibende separate Verifikation dokumentiert.

## Checks und Abschluss

Parent prüft die tatsächlichen Zuordnungen gegen Manifest und game-data, einschließlich unveränderter nicht ausgewählter IDs. Das ist ein gezielter Integrationscheck; keine neuen Tests, die nur die Tabelle nachbilden.
ticket-coder führt einen gezielten Formatcheck aus und berichtet geänderte Pfade sowie offene Fragen. Keine breiten Builds/Tests und kein eigener Commit.
Parent reviewt, übernimmt Assets, führt verbleibende fokussierte Prüfungen aus und committet nur Arbeit dieser Serie. Verbleibende Browser-/Regressionsprüfungen gegebenenfalls gemäß docs/agents/ticket-workflow.md separat dokumentieren.

## Comments

- Planung/Review: verfügbares aktuelles Sitzungsmodell; aktive Modellumschaltung auf gpt-6.1-sol ist in dieser Sitzung nicht vorhanden. Bounded Code-Anbindung über den callable ticket-coder (GPT-6 Luna, high).
- Quellenabgleich korrigiert die erste Familie: Kommandozentrale (82010100/82010199) ist das Fraktions-Startgebäude; Außenposten (81010100/81010199) bleibt in dieser Serie unverändert. Der neue Command-and-support-Entwurf mit großer Kommunikationsschüssel wird der Kommandozentrale zugeordnet.

- Umsetzung und gezielte separate Prüfung abgeschlossen. Assets-Commit: 06ae6f8b98 (feat(assets): add Rebel starter colony map buildings); Core-Commit dieser Arbeit: eindeutiger Betreff "feat: integrate first Rebel starter building asset series".
- Evidenz: acht 256x256-RGBA-PNGs, 512px-Master und vollständige Prompts gespeichert; 20 IDs gegen game-data und Fraktions-Startgebäude geprüft; alle übrigen Zuordnungen mit HEAD verglichen und unverändert. Acht Produktions-PNGs per HTTP mit image/png und bytegleichem Inhalt ausgeliefert.
- Visuelle Prüfung: Quellen, 40/68px sowie SWU-Wald/Bauland/Fels/Wüstenbaugrund/Wasser; tatsächliche FieldCell und buildingImage im Browser mit Kolonieansicht, 40/68/96px, inaktiv/beschädigt/im Bau und allen 20 Varianten. Keine Daten einer aktiven Kolonie verändert; die Browserprüfung verwendet eine isolierte Vorschau mit den tatsächlichen UI-Komponenten.
- Checks: gezielter Prettier-Check, git diff --check und Assets-Diff-Check bestanden. Keine breite Regression nötig für die reine Bild-/Zuordnungsänderung. Keine verbleibenden Akzeptanzkriterien.
- Routing: ticket-coder GPT-6 Luna high implementierte ausschließlich assets.ts. Parent übernahm Bildgenerierung, Export, Quellenabgleich, Review, Validierung und Commits im verfügbaren Sitzungsmodell. Materialrework: Quellenabgleich ersetzte den anfänglich angenommenen Außenposten durch die tatsächliche Start-Kommandozentrale vor dem Produktionsabschluss.
