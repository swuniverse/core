# Rohstoffgewinnung: vollständige Stufe-I-Assets

Status: resolved
Label: ready-for-agent
Type: task

## Auftrag

Nutzer hat alle verbleibenden 25 Stufe-I-Rebellenfamilien plus Forschungszentrum II freigegeben. Dieses Ticket besitzt nur Serie resources. Referenz/gesamte Planung: ../spec-stage-i-completion.md. Manifest: assets/generated/swu-rebel-stage-i-completion/resources/manifest.json. Abhängigkeiten: Serien 01–03 resolved; Assettickets dieser Restserie dürfen unabhängig umgesetzt werden.

| Familie                | IDs                          | Neue PNG unter assets/buildings/generated/       |
| ---------------------- | ---------------------------- | ------------------------------------------------ |
| Partikel-Beschleuniger | 62010100, 62010199           | 62010100-rebel-partikel-beschleuniger-map-v1.png |
| Kyber-Kristallmine     | 61210100, 61210121, 61210199 | 61210100-rebel-kyber-kristallmine-map-v1.png     |
| Hypermaterie-Pumpe     | 61040100, 61040199           | 61040100-rebel-hypermaterie-pumpe-map-v1.png     |
| Aurodium-Mine          | 61170100                     | 61170100-rebel-aurodium-mine-map-v1.png          |

## Ownership und Invarianten

Coding Agent besitzt ausschließlich apps/frontend/src/lib/assets.ts. Genau die IDs dieser Tabelle auf die genannten Dateien umstellen; bestehende GENERATED_BUILDING_FILES-Tabelle verwenden. Alle übrigen IDs, imperiale/shared Altzuordnungen, bereits fertige Serien und Resolver-Fallback erhalten.
Parent besitzt Grafiken, Quellen, Export, Dokumentation, Review und Commits. Nicht allein im Codebestand; Änderungen anderer erhalten. Keine Spielregel-, Status-, FieldCell-, API-, game-data-, Ticket- oder Asset-Edits und kein Commit durch Coding Agent. Keine neuen Abstraktionen.

## Akzeptanzkriterien

- [x] Alle Familien dieser Serie als transparente 256x256-PNGs, 512px-Master und Quelle/Prompt gespeichert.
- [x] Exakt die Manifest-IDs angebunden; übrige Zuordnungen erhalten.
- [x] Namen, Forschung und Varianten gegen YAML geprüft.
- [x] Quelle und 40/68px auf tatsächlich passenden Feldern visuell geprüft.
- [x] Tatsächlicher Resolver und bytegleiche HTTP-Auslieferung geprüft.
- [x] Separate Diff-/Format-/Whitespaceprüfung, lokale Commits, Abschluss dokumentiert.

## Checks

Coding Agent: gezielter Prettier-Check, git diff --check -- apps/frontend/src/lib/assets.ts. Keine breiten Tests, Browserprüfungen, spiegelnden Tests oder Commits.
Parent: Manifest/YAML, ganze Tabelle gegen vorherigen HEAD, Alpha/Auflösung, Vorschaufelder (einschließlich Sonderplatzierung), tatsächlicher buildingImage-Resolver, PNG-Auslieferung, Sichtprüfung. Unveränderte FieldCell/Status bereits in Serie 1 geprüft.

## Comments

- Planung/Review im verfügbaren Parent-Sitzungsmodell; aktive Modellumschaltung auf gpt-6.1-sol nicht verfügbar. Begrenzte Code-Anbindung über ticket-coder GPT-6 Luna high.

- Umgesetzt, Prüfung ausstehend: 4 Familien / 8 IDs exportiert, Quellen/Master/Prompt gespeichert, direkte Integrationschecks bestanden. Gemeinsame finale Browser-/Vollständigkeitsprüfung der Restserie noch offen. Core-Commit: eindeutiger Betreff "feat: complete Rebel stage-I resources building assets". Parent-Sichtprüfung von Quelle und 40/68px durchgeführt.

## Answer

Serie vollständig abgeschlossen. Alle 4 Familien / 8 IDs als transparente PNGs mit Master, Quelle und Prompt gespeichert und angebunden. Gemeinsame Prüfung: 42 Familien / 94 eindeutige IDs stimmen vollständig mit allen Rebellen-Gebäuden aus materialfinanzierter/FP-I-Forschung einschließlich Forschungszentrum II überein; PNG/Alpha/Master, tatsächlicher Resolver und bytegleiche HTTP-Auslieferung geprüft. Alle anderen Zuordnungen und Resolvercode unverändert gegenüber 03f4ae8e^; Spielkomponenten und game-data durch diese Assetserie unverändert.

Browserfixture mit echter FieldCell: 302 Bilder geladen, 94 Varianten, 36 Statusfälle und 42 Menübilder geprüft; Orbit und numerische STU-Felder enthalten, kein Gebäudeüberlauf. Separate Diff-/Format-/Whitespaceprüfung bestanden. Quellen/40-/68px-Vorschauen und Gesamtübersicht visuell geprüft. Nachweis: [Gesamtprüfung](../../../assets/generated/swu-rebel-stage-i-completion/full-verification.json), [Browserprüfung](../../../assets/generated/swu-rebel-stage-i-completion/browser-verification.json), [Übersicht](../../../assets/generated/swu-rebel-stage-i-completion/full-overview.png). Lokaler Abschlusscommit: eindeutiger Betreff "docs: verify and close Rebel stage-I asset completion".

Modellnutzung: Planung/Review im verfügbaren Parent-Sitzungsmodell (kein Wechsel auf GPT-6.1 Sol möglich), begrenzte Mapping-Anbindungen durch ticket-coder GPT-6 Luna high. Modulserie aus paralleler Claude-/Opus-5.5-Sitzung übernommen und durch Parent unabhängig mit unverändert striktem verify.cjs, Quellen-/Geländesichtung und vollständiger Abschlussprüfung verifiziert. Keine geschätzten Nutzungswerte.
