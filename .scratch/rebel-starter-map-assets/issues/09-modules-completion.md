# Modulfertigung und Torpedos: vollständige Stufe-I-Assets

Status: claimed
Label: ready-for-agent
Type: task

## Auftrag

Nutzer hat alle verbleibenden 25 Stufe-I-Rebellenfamilien plus Forschungszentrum II freigegeben. Dieses Ticket besitzt nur Serie modules. Referenz/gesamte Planung: ../spec-stage-i-completion.md. Manifest: assets/generated/swu-rebel-stage-i-completion/modules/manifest.json. Abhängigkeiten: Serien 01–03 resolved; Assettickets dieser Restserie dürfen unabhängig umgesetzt werden.

| Familie                | IDs                | Neue PNG unter assets/buildings/generated/       |
| ---------------------- | ------------------ | ------------------------------------------------ |
| Waffenmodulfertigung   | 81810100, 81810199 | 81810100-rebel-waffenmodulfertigung-map-v1.png   |
| Schildmodulfertigung   | 81820100, 81820199 | 81820100-rebel-schildmodulfertigung-map-v1.png   |
| Antriebsmodulfertigung | 81830100, 81830199 | 81830100-rebel-antriebsmodulfertigung-map-v1.png |
| Protonentorpedo-Fabrik | 81990100, 81990199 | 81990100-rebel-protonentorpedo-fabrik-map-v1.png |

## Ownership und Invarianten

Coding Agent besitzt ausschließlich apps/frontend/src/lib/assets.ts. Genau die IDs dieser Tabelle auf die genannten Dateien umstellen; bestehende GENERATED_BUILDING_FILES-Tabelle verwenden. Alle übrigen IDs, imperiale/shared Altzuordnungen, bereits fertige Serien und Resolver-Fallback erhalten.
Parent besitzt Grafiken, Quellen, Export, Dokumentation, Review und Commits. Nicht allein im Codebestand; Änderungen anderer erhalten. Keine Spielregel-, Status-, FieldCell-, API-, game-data-, Ticket- oder Asset-Edits und kein Commit durch Coding Agent. Keine neuen Abstraktionen.

## Akzeptanzkriterien

- [x] Alle Familien dieser Serie als transparente 256x256-PNGs, 512px-Master und Quelle/Prompt gespeichert.
- [x] Exakt die Manifest-IDs angebunden; übrige Zuordnungen erhalten.
- [x] Namen, Forschung und Varianten gegen YAML geprüft.
- [x] Quelle und 40/68px auf tatsächlich passenden Feldern visuell geprüft.
- [x] Tatsächlicher Resolver und bytegleiche HTTP-Auslieferung geprüft.
- [ ] Separate Diff-/Format-/Whitespaceprüfung, lokale Commits, Abschluss dokumentiert.

## Checks

Coding Agent: gezielter Prettier-Check, git diff --check -- apps/frontend/src/lib/assets.ts. Keine breiten Tests, Browserprüfungen, spiegelnden Tests oder Commits.
Parent: Manifest/YAML, ganze Tabelle gegen vorherigen HEAD, Alpha/Auflösung, Vorschaufelder (einschließlich Sonderplatzierung), tatsächlicher buildingImage-Resolver, PNG-Auslieferung, Sichtprüfung. Unveränderte FieldCell/Status bereits in Serie 1 geprüft.

## Comments

- Planung/Review im verfügbaren Parent-Sitzungsmodell; aktive Modellumschaltung auf gpt-6.1-sol nicht verfügbar. Begrenzte Code-Anbindung über ticket-coder GPT-6 Luna high.

- Umgesetzt, Prüfung ausstehend: 4 Familien / 8 IDs exportiert, Quellen/Master/Prompt gespeichert, direkte Integrationschecks bestanden. Gemeinsame finale Browser-/Vollständigkeitsprüfung der Restserie noch offen. Core-Commit: eindeutiger Betreff "feat: complete Rebel stage-I modules building assets". Parent-Sichtprüfung von Quelle und 40/68px durchgeführt.
- Hinweis: Die 8 Modul-Zuordnungen in apps/frontend/src/lib/assets.ts wurden vom parallel laufenden Orbital-Commit c3a9397f mitcommittet (ganze Datei gestaged); die zugehörigen PNGs/Quellen kommen mit dem Modul-Commit. verify.cjs lief mit den Orbital-Manifest-IDs als zusätzlicher Ausnahme, weil deren Zuordnungen zum Prüfzeitpunkt noch uncommittet waren; alle übrigen IDs unverändert. Stilreferenz: generated/swu-rebel-starter-map-v1/source-approved-four.png. Implementiert in der Claude-Sitzung (Opus 5.5) direkt, ohne Luna-Delegation (ticket-coder in dieser Sitzung nicht verfügbar; Änderung 8 Zeilen).
