# Grundversorgung und Gas: imperiale Gebäudeassets

Status: resolved
Label: ready-for-agent
Type: task

## Auftrag

Nutzer hat den grauen, kantigen imperialen Stil freigegeben und die gesamte Stufe-I-Serie beauftragt. Spezifikation: ../spec.md. Manifest: assets/generated/swu-imperial-stage-i-v1/starter/manifest.json.

- Bantha-Farm: 21010300, 21010301, 21010399 → 21010300-imperial-bantha-farm-map-v1.png
- Ionensegel-Kollektor: 31010300, 31010331, 31010399 → 31010300-imperial-ionensegel-kollektor-map-v1.png
- Versorgungslager: 81210300, 81210399 → 81210300-imperial-versorgungslager-map-v1.png
- Tibanna-Extraktor: 61030300, 61030399 → 61030300-imperial-tibanna-extraktor-map-v1.png

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

- Umgesetzt, Prüfung ausstehend: Quelle, Master, Export und Daten-/Alpha-/Geländeprüfung für 4 Familien / 10 IDs bestanden; Parent hat Quelle und 40-/68px geprüft. Gemeinsamer erster Assetcommit 1725ce6da4; Core-Plan-/Statuscommit ed530eb7. Gemeinsame Runtime-/Resolver-/HTTP-/Browserprüfung durch Ticket 12 bleibt offen.

## Answer

Alle 4 Familien / 10 IDs fertig und angebunden. Daten-, Forschungs-, Gelände-, Alpha- und Masterprüfung bestanden. Gemeinsame Prüfung: 42 Familien / 94 IDs decken den imperialen Umfang bis FP I plus Forschungszentrum II vollständig ab. Tatsächlicher buildingImage-Resolver und bytegleiche HTTP-Auslieferung geprüft; alle fremden Zuordnungen und Resolvercode gegenüber 5c31a4e97a7fe29f95a8276130f2f6b822879409 unverändert.

Browserfixture importiert die echte FieldCell: 94 Varianten, 302 geladene Bilder, 36 Statusfälle und 42 Menübilder bestanden. Numerische STU-Felder, Orbit, Inaktiv-/Beschädigt-Rahmen und 50-%-Baufortschritt enthalten; kein Bildüberlauf. Quellen und 40-/68px sowie die vollständige Übersicht visuell geprüft. Format-/Whitespaceprüfung und lokale scoped Commits erfolgt; Abschlusscommit mit eindeutigem Betreff "feat: complete verified Imperial stage-I building assets". [Gesamtübersicht](../../../assets/generated/swu-imperial-stage-i-v1/full-overview.png), [Datenprüfung](../../../assets/generated/swu-imperial-stage-i-v1/full-verification.json), [Browserprüfung](../../../assets/generated/swu-imperial-stage-i-v1/browser-verification.json).

Modellnutzung: Parent erzeugt/reviewt im verfügbaren Sitzungsmodell (kein aktiver Wechsel auf GPT-6.1 Sol möglich); begrenzte Runtime-Anbindung an ticket-coder GPT-6 Luna high delegiert. Quellen über gpt-image-2 MCP, medium.
