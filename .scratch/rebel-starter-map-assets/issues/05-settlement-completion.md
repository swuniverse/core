# Außenposten und Kuppeln: vollständige Stufe-I-Assets
Status: claimed
Label: ready-for-agent
Type: task

## Auftrag

Nutzer hat alle verbleibenden 25 Stufe-I-Rebellenfamilien plus Forschungszentrum II freigegeben. Dieses Ticket besitzt nur Serie settlement. Referenz/gesamte Planung: ../spec-stage-i-completion.md. Manifest: assets/generated/swu-rebel-stage-i-completion/settlement/manifest.json. Abhängigkeiten: Serien 01–03 resolved; Assettickets dieser Restserie dürfen unabhängig umgesetzt werden.

| Familie | IDs | Neue PNG unter assets/buildings/generated/ |
| --- | --- | --- |
| Außenposten | 81010100, 81010199 | 81010100-rebel-aussenposten-map-v1.png |
| Versorgungskuppel | 12020100, 12020199 | 12020100-rebel-versorgungskuppel-map-v1.png |
| Habitatkuppel | 12010100, 12010104, 12010199 | 12010100-rebel-habitatkuppel-map-v1.png |
| Kryo-Zuchtanlage | 21120100, 21120102, 21120199 | 21120100-rebel-kryo-zuchtanlage-map-v1.png |

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

- Umgesetzt, Prüfung ausstehend: 4 Familien / 10 IDs exportiert, Quellen/Master/Prompt gespeichert, direkte Integrationschecks bestanden. Gemeinsame finale Browser-/Vollständigkeitsprüfung der Restserie noch offen. Core-Commit: eindeutiger Betreff "feat: complete Rebel stage-I settlement building assets". Parent-Sichtprüfung von Quelle und 40/68px durchgeführt.
