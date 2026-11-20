# Frühe Produktionsketten: imperiale Gebäudeassets

Status: claimed
Label: ready-for-agent
Type: task

## Auftrag

Nutzer hat den grauen, kantigen imperialen Stil freigegeben und die gesamte Stufe-I-Serie beauftragt. Spezifikation: ../spec.md. Manifest: assets/generated/swu-imperial-stage-i-v1/production/manifest.json.

- Nerf-Zucht: 21020300, 21020302, 21020399 → 21020300-imperial-nerf-zucht-map-v1.png
- Gezeitenkraftwerk: 31020300, 31020332, 31020399 → 31020300-imperial-gezeitenkraftwerk-map-v1.png
- Transparistahl-Manufaktur: 62020300, 62020399 → 62020300-imperial-transparistahl-manufaktur-map-v1.png
- Phrik-Mine: 61110300, 61110312, 61110399 → 61110300-imperial-phrik-mine-map-v1.png

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
