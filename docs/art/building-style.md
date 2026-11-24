# Freigegebener Gebäudestil

Gültig ab Nutzerfreigabe vom 2026-11-23: „die neuen sind viel besser“, Stil für spätere Gebäude speichern und FZ2 damit überarbeiten. Diese Vorgabe gilt auch für kommende Forschungsstufen.

[Freigegebener Vergleich](../../assets/generated/swu-stage-ii-simple-v2/style/approved-comparison.png) · [Referenz-Kit](../../assets/generated/swu-stage-ii-simple-v2/style/manifest.json). Die rechte Spalte zeigt den verbindlichen schlichteren Stil. FZ1 bleibt die grundlegende Stilreferenz; das detaillierte erste FZ2-Set ist durch die neue Serie ersetzt.

## Form, Kamera und Detailgrad

- Hohe orthografische Draufsicht, etwa 80° über dem Boden: Dächer dominieren, Vorderwände sehr flach. Breite niedrige Koloniegrundstücke; keine Monumente oder Miniaturansicht mit tiefem Horizont.
- Große ruhige matte Dachflächen, klare geometrische Baukörper, breite sanfte Fasen oder Rundungen. Fünf bis acht gut lesbare Hauptformen pro Grundstück; höhere Gebäudestufen zeigen mehr Kapazität statt mehr Oberflächenkleinteile.
- Wenige kräftige funktionale Maschinen, Rohre und dunkle Vertiefungen. Keine dichten Leitungswälder, Schraubenraster, Mikro-Panels, Kratzer, Schmutzrauschen oder fotorealistische PBR-Verwitterung.
- Helles weiches Licht von links oben; dezente Verschattung nur an strukturellen Fugen. Dachflächen müssen auf dunkler UI und Gelände bei 40/68px klar erkennbar bleiben.

## Fraktionen

**Rebellenallianz:** warmes cremefarbenes Duracrete, dunkle schiefergraue Technikeinsätze und wenige gedämpfte rostorange Akzente. Praktische runde und weich gefaste Formen, saubere breite Flächen, nur sanfte Materialschattierung.

**Galaktisches Imperium:** helles neutrales graues Panzerstahl, große graphitschwarze Technikeinsätze und wenige rote Statuslichter. Kantige kontrollierte Geometrie, große helle Dachplatten. Die gesamte Anlage nicht dunkelgrau abtönen; keine beige Rebellenpalette.

## Referenzen und Erzeugung

Pro `gpt-image-2`-MCP-Aufruf genau **eine** freigegebene Fraktionsreferenz als Stilvorlage verwenden. Einzelne Bildreferenzen funktionieren am aktuellen Gateway; die bisher versuchten Mehrfachreferenzen wurden als ungültiges `image[0]` abgelehnt. Neue Funktionsgebäude erzeugen, nicht die Referenzanlage kopieren.

- [Rebel-Master](../../assets/generated/swu-stage-ii-simple-v2/style/rebel/master-512.png), [Referenz auf Freistellfarbe](../../assets/generated/swu-stage-ii-simple-v2/style/rebel-reference-magenta.png), [Stilprompt](../../assets/generated/swu-stage-ii-simple-v2/style/rebel/prompt-initial.txt).
- [Imperial-Master](../../assets/generated/swu-stage-ii-simple-v2/style/imperial/master-512.png), [Referenz auf Freistellfarbe](../../assets/generated/swu-stage-ii-simple-v2/style/imperial-reference-magenta.png), [Stilprompt](../../assets/generated/swu-stage-ii-simple-v2/style/imperial/prompt-initial.txt).

Das Gateway liefert aktuell RGB statt des angeforderten Alpha. Daher eine ausdrücklich einheitliche reine Magenta-Freistellfläche (`#FF00FF`) erzeugen und anschließend entfernen. Bei Bildbögen bleiben durchgehende leere Korridore zwischen den Zellen. Quellen, exakter Prompt, Bildreferenz und Generierungsmetadaten aufbewahren.

## Export und Prüfung

Laufzeitbild 256×256 RGBA-PNG, Master 512×512; maximal 244px Motivbreite bei 256px. Echte transparente Außenflächen ohne Schachbrett, Vignette oder Hintergrundplatte. Oberflächengebäude dürfen nur ein knappes funktionales Fundament behalten; Orbitassets zeigen weder Boden noch Sterne oder feste Schiffe. Dockräume und Zwischenräume orbitaler Streben sind transparent.

Alle Varianten einer Gebäudefamilie anhand der Game-Daten zuordnen. Bestehende Forschung, Bebaubarkeit, Terrain und Gebäudezustände erhalten. Eine Geländevorschau bei fehlenden Feldfreigaben ausdrücklich als Kompositionsvorschau markieren. Quelle sowie 40px-Menü- und 68px-Geländedarstellung visuell prüfen; anschließend Resolver/HTTP und echte `FieldCell` mit dev-browser überprüfen.

Aktuelle Umsetzung: [FZ2-Produktionsplan](../../assets/generated/swu-stage-ii-simple-v2/plan.json). Neue Versionen verwenden neue Dateinamen; die frühere Serie bleibt als Quellenarchiv erhalten.

## Verifizierte FZ2-Serie

Abgeschlossen am 2026-11-24: [Katalog](../../assets/generated/swu-stage-ii-simple-v2/README.md), 76 Familien / 138 IDs; 38 Familien / 69 IDs je Fraktion. Beide Muster bytegleich übernommen. Alle Runtime-Zuordnungen verwenden map-v2.png. Quellen, exakte Prompts, Master, Referenz-Kit und finale 40/68px-Übersichten sind persistent erhalten.

[Gesamtprüfung](../../assets/generated/swu-stage-ii-simple-v2/full-verification.json) und [Browserprüfung](../../assets/generated/swu-stage-ii-simple-v2/browser-verification.json) bestanden. Die Freistellung schützt dokumentierte emissive Plasma-/Phasenkerne vor versehentlicher Hintergrundentfernung; [Alpha-/Kernprüfung](../../assets/generated/swu-stage-ii-simple-v2/alpha-verification.json) bestätigt Originalpixel und transparente Docköffnungen.
