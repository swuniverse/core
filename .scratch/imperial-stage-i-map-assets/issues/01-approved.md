# Freigegebene Grundgebäude: imperiale Gebäudeassets

Status: claimed
Label: ready-for-agent
Type: task

## Auftrag

Nutzer hat den grauen, kantigen imperialen Stil freigegeben und die gesamte Stufe-I-Serie beauftragt. Spezifikation: ../spec.md. Manifest: assets/generated/swu-imperial-stage-i-v1/approved/manifest.json.

- Kommandozentrale: 82010300, 82010399 → 82010300-imperial-kommandozentrale-map-v1.png
- Wohnkomplex: 11010300, 11010303, 11010399 → 11010300-imperial-wohnkomplex-map-v1.png
- Doonium-Schmelze: 61010300, 61010399 → 61010300-imperial-doonium-schmelze-map-v1.png

## Ownership

Parent besitzt Rastergrafiken, Export, Manifest, Dokumentation und scoped Commits. Code-Anbindung ausschließlich durch Integrationsticket 12. Änderungen anderer erhalten. Keine Änderungen an Gameplay, Forschung, Bebaubarkeit, FieldCell oder vorhandenen Rebellenbildern.

## Akzeptanzkriterien

- [x] Transparente 256px-RGBA-PNGs, 512px-Master und Quelle/Prompt erhalten.
- [x] IDs, Namen, Forschung und Vorschaufelder gegen game-data geprüft.
- [x] Quelle und 40-/68px-Geländemontagen visuell geprüft.
- [x] Lokaler scoped Assetcommit und Format-/Whitespaceprüfung.
- [ ] Gemeinsame Zuordnungs-/Resolver-/HTTP-/Browserprüfung und Abschluss dokumentiert.

## Comments

- Parent im verfügbaren Sitzungsmodell; Wechsel auf GPT-6.1 Sol nicht möglich. Begrenzte Code-Anbindung über ticket-coder GPT-6 Luna high, ein Coding Agent zur Zeit.

- Umgesetzt, Prüfung ausstehend: Quelle, Master, Export und Daten-/Alpha-/Geländeprüfung für 3 Familien / 7 IDs bestanden; Parent hat Quelle und 40-/68px geprüft. Scoped Assetcommit mit eindeutigem Betreff "feat(assets): add Imperial approved map buildings". Gemeinsame Runtime-/Resolver-/HTTP-/Browserprüfung durch Ticket 12 bleibt offen.
