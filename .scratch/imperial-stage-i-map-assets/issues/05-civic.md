# Zivile Versorgung und Verwaltung: imperiale Gebäudeassets

Status: open
Label: ready-for-agent
Type: task

## Auftrag

Nutzer hat den grauen, kantigen imperialen Stil freigegeben und die gesamte Stufe-I-Serie beauftragt. Spezifikation: ../spec.md. Manifest: assets/generated/swu-imperial-stage-i-v1/civic/manifest.json.

- Mandalorianischer-Grog-Destille: 22020300, 22020399 → 22020300-imperial-mandalorianischer-grog-destille-map-v1.png
- Cantina: 22010300, 22010399 → 22010300-imperial-cantina-map-v1.png
- Imperiale Militärakademie: 51010300, 51010399 → 51010300-imperial-imperiale-militaerakademie-map-v1.png
- Raumbahnhof: 81120300, 81120399 → 81120300-imperial-raumbahnhof-map-v1.png

## Ownership

Parent besitzt Rastergrafiken, Export, Manifest, Dokumentation und scoped Commits. Code-Anbindung ausschließlich durch Integrationsticket 12. Änderungen anderer erhalten. Keine Änderungen an Gameplay, Forschung, Bebaubarkeit, FieldCell oder vorhandenen Rebellenbildern.

## Akzeptanzkriterien

- [ ] Transparente 256px-RGBA-PNGs, 512px-Master und Quelle/Prompt erhalten.
- [ ] IDs, Namen, Forschung und Vorschaufelder gegen game-data geprüft.
- [ ] Quelle und 40-/68px-Geländemontagen visuell geprüft.
- [ ] Lokaler scoped Assetcommit und Format-/Whitespaceprüfung.
- [ ] Gemeinsame Zuordnungs-/Resolver-/HTTP-/Browserprüfung und Abschluss dokumentiert.

## Comments

- Parent im verfügbaren Sitzungsmodell; Wechsel auf GPT-6.1 Sol nicht möglich. Begrenzte Code-Anbindung über ticket-coder GPT-6 Luna high, ein Coding Agent zur Zeit.
