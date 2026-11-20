# Kuppeln, Kryozucht und Forschung: imperiale Gebäudeassets

Status: open
Label: ready-for-agent
Type: task

## Auftrag

Nutzer hat den grauen, kantigen imperialen Stil freigegeben und die gesamte Stufe-I-Serie beauftragt. Spezifikation: ../spec.md. Manifest: assets/generated/swu-imperial-stage-i-v1/settlement/manifest.json.

- Versorgungskuppel: 12020300, 12020399 → 12020300-imperial-versorgungskuppel-map-v1.png
- Habitatkuppel: 12010300, 12010304, 12010399 → 12010300-imperial-habitatkuppel-map-v1.png
- Kryo-Nerf-Zucht: 21120300, 21120302, 21120399 → 21120300-imperial-kryo-nerf-zucht-map-v1.png
- Forschungszentrum Stufe I: 72010300, 72010399 → 72010300-imperial-forschungszentrum-i-map-v1.png

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
