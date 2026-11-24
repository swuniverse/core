# Freigegebenen Gebäudestil dauerhaft sichern

Status: resolved
Label: ready-for-agent
Type: task

## Auftrag

Stilguide docs/art/building-style.md, unveränderte Muster und Referenz-/Prompt-Kit unter assets/generated/swu-stage-ii-simple-v2/style sichern. Nutzerfreigabe ausdrücklich vorhanden; keine weitere Freigaberunde erforderlich.

## Akzeptanzkriterien

- [x] Kamerawinkel, Makrodetailgrad, Materialien, Fraktionsfarben, Alpha und 40/68px-Lesbarkeit dokumentiert.
- [x] Beide freigegebenen Muster, Quellen und exakte Prompts persistent im Assetsubmodul.
- [x] Quellenlinks und finale Serienintegration geprüft und committed.

## Comments

- 2026-11-24: Abgeschlossen nach separater gemeinsamer Prüfung. 76 Familien / 138 IDs; Assetcommit 27af3eb2adf89d6b7298e5ff0af08cd90769173d; Core-Integration im Commit „feat: use verified simple FZ2 building assets“.
- Originalquellen, exakte Prompts, Referenzen, 256px-RGBA-PNGs, 512px-Master und visuell geprüfte 40/68px-Montagen erhalten. Zwei freigegebene Muster bytegleich. Daten/Forschung/Feldvorschauen, PNG/Alpha, vollständiger Resolver und bytegleiche HTTP-Auslieferung bestanden: assets/generated/swu-stage-ii-simple-v2/full-verification.json.
- Finale FieldCell-Prüfung ohne Bildcache bestanden: 138 Varianten, 576 Bilder, 112 Zustandsfälle, 76 Menübilder, 68/40px; keine Ladefehler oder Überläufe. Nachweis: assets/generated/swu-stage-ii-simple-v2/browser-verification.json. Separate Alpha-Prüfung: 76 Dateien, sechs erhaltene technische Kernregionen, vier transparente Öffnungsproben. Prettier und git diff --check bestanden. Keine offenen Prüfungen.
- Routing: Parent-Produktion/Planung/Review im verfügbaren Sitzungsmodell; GPT-6.1 Sol nicht aktiv wählbar. Ausschließlich Zuordnungstabelle durch ticket-coder (GPT-6 Luna, high), Parent prüfte exakt 138 Änderungen und 308 unveränderte übrige Zuordnungen sowie Code außerhalb der Tabelle. Materialrework: Rasterseparatoren beim Zuschnitt ausgeschlossen, Magenta-Säume entfernt und emissive Plasma-/Phasenkerne aus der Originalquelle geschützt.
