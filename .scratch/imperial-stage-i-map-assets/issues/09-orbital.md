# Orbitale Energie und Werften: imperiale Gebäudeassets

Status: claimed
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
- [ ] Gemeinsame Zuordnungs-/Resolver-/HTTP-/Browserprüfung und Abschluss dokumentiert.

## Comments

- Parent im verfügbaren Sitzungsmodell; Wechsel auf GPT-6.1 Sol nicht möglich. Begrenzte Code-Anbindung über ticket-coder GPT-6 Luna high, ein Coding Agent zur Zeit.

- Umgesetzt, Prüfung ausstehend: Quelle, Master, Export und Daten-/Alpha-/Geländeprüfung für 4 Familien / 8 IDs bestanden; Parent hat Quelle und 40-/68px geprüft. Scoped Assetcommit mit eindeutigem Betreff "feat(assets): add Imperial orbital map buildings". Gemeinsame Runtime-/Resolver-/HTTP-/Browserprüfung durch Ticket 12 bleibt offen.
