# Orbitale Energie und Werften: imperiale Gebäudeassets

Status: resolved
Label: ready-for-agent
Type: task

## Auftrag

Nutzer hat den grauen, kantigen imperialen Stil freigegeben und die gesamte Stufe-I-Serie beauftragt. Spezifikation: ../spec.md. Manifest: assets/generated/swu-imperial-stage-i-v1/orbital/manifest.json.

- Orbital-Solarkollektor: 31910300, 31910399 → 31910300-imperial-orbital-solarkollektor-map-v1.png
- Werftkomplex: 85010300, 85010399 → 85010300-imperial-werftkomplex-map-v1.png
- Jägerwerft: 85110300, 85110399 → 85110300-imperial-jaegerwerft-map-v1.png
- Fregattenwerft: 85120300, 85120399 → 85120300-imperial-fregattenwerft-map-v1.png

## Ownership

Parent besitzt Rastergrafiken, Export, Manifest, Dokumentation und scoped Commits. Code-Anbindung ausschließlich durch Integrationsticket 12. Änderungen anderer erhalten. Keine Änderungen an Gameplay, Forschung, Bebaubarkeit, FieldCell oder vorhandenen Rebellenbildern.

## Akzeptanzkriterien

- [x] Transparente 256px-RGBA-PNGs, 512px-Master und Quelle/Prompt erhalten.
- [x] IDs, Namen, Forschung und Vorschaufelder gegen game-data geprüft.
- [x] Quelle und 40-/68px-Geländemontagen visuell geprüft.
- [x] Lokaler scoped Assetcommit und Format-/Whitespaceprüfung.
- [x] Gemeinsame Zuordnungs-/Resolver-/HTTP-/Browserprüfung und Abschluss dokumentiert.

## Comments

- Parent im verfügbaren Sitzungsmodell; Wechsel auf GPT-6.1 Sol nicht möglich. Begrenzte Code-Anbindung über ticket-coder GPT-6 Luna high, ein Coding Agent zur Zeit.

- Umgesetzt, Prüfung ausstehend: Quelle, Master, Export und Daten-/Alpha-/Geländeprüfung für 4 Familien / 8 IDs bestanden; Parent hat Quelle und 40-/68px geprüft. Scoped Assetcommit mit eindeutigem Betreff "feat(assets): add Imperial orbital map buildings". Gemeinsame Runtime-/Resolver-/HTTP-/Browserprüfung durch Ticket 12 bleibt offen.

## Answer

Alle 4 Familien / 8 IDs fertig und angebunden. Daten-, Forschungs-, Gelände-, Alpha- und Masterprüfung bestanden. Gemeinsame Prüfung: 42 Familien / 94 IDs decken den imperialen Umfang bis FP I plus Forschungszentrum II vollständig ab. Tatsächlicher buildingImage-Resolver und bytegleiche HTTP-Auslieferung geprüft; alle fremden Zuordnungen und Resolvercode gegenüber 5c31a4e97a7fe29f95a8276130f2f6b822879409 unverändert.

Browserfixture importiert die echte FieldCell: 94 Varianten, 302 geladene Bilder, 36 Statusfälle und 42 Menübilder bestanden. Numerische STU-Felder, Orbit, Inaktiv-/Beschädigt-Rahmen und 50-%-Baufortschritt enthalten; kein Bildüberlauf. Quellen und 40-/68px sowie die vollständige Übersicht visuell geprüft. Format-/Whitespaceprüfung und lokale scoped Commits erfolgt; Abschlusscommit mit eindeutigem Betreff "feat: complete verified Imperial stage-I building assets". [Gesamtübersicht](../../../assets/generated/swu-imperial-stage-i-v1/full-overview.png), [Datenprüfung](../../../assets/generated/swu-imperial-stage-i-v1/full-verification.json), [Browserprüfung](../../../assets/generated/swu-imperial-stage-i-v1/browser-verification.json).

Modellnutzung: Parent erzeugt/reviewt im verfügbaren Sitzungsmodell (kein aktiver Wechsel auf GPT-6.1 Sol möglich); begrenzte Runtime-Anbindung an ticket-coder GPT-6 Luna high delegiert. Quellen über gpt-image-2 MCP, medium.

Offene Dockbereiche mit Alpha-Stichproben (Fregattenwerft: 155/128 und 155/90) sowie Magenta-Montage geprüft; echte Transparenz, keine fest eingebauten Schiffe.
