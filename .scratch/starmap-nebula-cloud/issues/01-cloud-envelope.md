# Kontinuierliche Nebelhülle und Gasschleier

Type: task
Status: resolved
Label: ready-for-agent
Spec: ../spec.md

## Acceptance criteria

- [x] Kontinuierliche Hülle und dekorativer Außensaum in allen vier Ansichten.
- [x] Gameplay-Terrain erhalten; Quellen und Empfänger beachten Aufklärung/Redaktion.
- [x] Gezielte Prüfungen erfolgreich.
- [x] Gesammelte Verifikation abgeschlossen.

## Comments

2026-11-25: Hauptagent nutzt Sitzungsmodell-Fallback für Architektur/Datenschutz/Algorithmus/Review. Begrenzte vier Renderer samt UI-Tests an ticket-coder (Luna high).

2026-11-25: umgesetzt, Prüfung ausstehend (Commit-Betreff „feat(starmap): render continuous nebula envelopes across known space“). 35 Renderer-Tests, Shared-Halo-/Seam-/Cache-Prüfungen, DOM/Pixi-Cachetest und reale Privacy-/Sektor-Puffer-Integration grün. Shared/Backend/Frontend-App-Typechecks, beide Builds und ESLint ohne Fehler. Gesammelte Suites: Backend 2794 Tests, Frontend 1056 Tests grün. Restliche Verifikation: abschließender Byte-Abgleich zum verwalteten Workspace, laufende API nach Neustart und unveränderte echte Galaxiefelddaten.

## Answer

d7bf9220 implementiert die rasterunabhängige Wolkenhülle und den rein optischen Außensaum in Galaxiekarte, Fullmap-Editor, Vorschau und Galaxie-LSS. Die kontinuierliche Quellenfläche überlagert bekannte Weltraumfelder; größere Weltkoordinaten-Verformungen und vorhandene Gasfäden erhalten die filmische Gestaltung. Es gibt keine unterschiedliche Alpha-Begrenzung pro Feld und keine Feldkonturmaske auf Cloud-PNGs. Unbekannte/redigierte Quellen und Empfänger ausgeschlossen; Sektor-Puffer umfasst 2 Felder und erweitert nie die Antwort. Legacy-Terrain behält seine Kacheln und Masken.

2026-11-25: Separate Verifikation abgeschlossen. Backend 274 Suites/2794 Tests; Frontend 151 Dateien/1056 Tests; 12 reale Integrationsfälle (inkl. bekanntem Halo hinter Sektorgrenze, versteckter Nachbarquelle, identischen Fullmap-/Sektor-Pixeln und unveränderten Kosten), 35 Renderer-Tests und DOM/Pixi-Cachetest grün. Shared/Backend/Frontend-App-Typechecks und beide Builds grün; ESLint ohne Fehler (Non-null-Regelwarnungen). Umfassendere bestehende Spec-Mock/WebGPU-Typfehler bleiben außerhalb des Changes. Alle 20 Implementierungsdateien bytegleich mit geprüfter Arbeitskopie. Backend neu gebaut, HTTP 200/ONLINE. Echte API: 1600 Felder, 390 PNGs (177 Nebelquellen plus 213 dekorative Haloempfänger); getesteter Halo-Pixelvergleich exakt, Sektor-/Gesamtkarte identisch; Preview HTTP 201 mit 0 Änderungen. Galaxiefelder einschließlich Feldtypen, Kosten, Effekten und Generierungsmetadaten vor/nach Änderung identisch. Vollständiger 120×120-Rasterlauf mit 2611 Quellen und 3748 Texturen: 3845ms; 40×40 inkl. Vorherdarstellung 1542ms. Quellenfläche auf global ausgerichteten 8×8-Samples je Feld, begrenzte Caches. PNG-Vergleich unter output/starmap-nebula-drafts im Originalcheckout. Hauptagent: Architektur, Datenschutz, Algorithmus, Backend, finaler Review (Sitzungsmodell-Fallback); ticket-coder/Luna high: vier Renderer und UI-Tests.
