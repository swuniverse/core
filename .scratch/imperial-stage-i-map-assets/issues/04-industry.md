# Metalle, Treibstoff und Raumfahrt: imperiale Gebäudeassets

Status: open
Label: ready-for-agent
Type: task

## Auftrag

Nutzer hat den grauen, kantigen imperialen Stil freigegeben und die gesamte Stufe-I-Serie beauftragt. Spezifikation: ../spec.md. Manifest: assets/generated/swu-imperial-stage-i-v1/industry/manifest.json.

- Phrik-Raffinerie: 63100300, 63100399 → 63100300-imperial-phrik-raffinerie-map-v1.png
- Durastahl-Schmiede: 63110300, 63110399 → 63110300-imperial-durastahl-schmiede-map-v1.png
- Hypermaterie-Synthesizer: 61020300, 61020311, 61020399 → 61020300-imperial-hypermaterie-synthesizer-map-v1.png
- Landeplattform: 81110300, 81110399 → 81110300-imperial-landeplattform-map-v1.png

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
