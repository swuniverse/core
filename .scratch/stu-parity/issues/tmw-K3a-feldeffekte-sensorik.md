# Feldeffekte, Teil 2a: Sensorik (LSS-Störung, LSS-Blockade, Signaturanzeige)

**Status:** needs-info
**Priority:** P2
**Size:** S
**Blocked by:** tmw-K1a

## Ziel

Passive Sensorik-Effekte wirken auf die Langstreckensensoren. Steht ein Schiff in einem Feld mit `LSS_MALFUNCTION`, liefert der LSS keine Daten. `LSS_BLOCKADE` blendet blockierte Felder in der LSS-Ansicht aus. `NO_SPACECRAFT_COUNT` unterdrückt die Signaturzählung des Feldes, `DUBIOUS_SPACECRAFT_COUNT` zeigt ab einer Signatur nur noch „!“.

## STU-Quellen

- `src/Lib/Map/FieldTypeEffectEnum.php` (Beschreibungen und Zielfeldhinweise)
- `src/Module/Spacecraft/Lib/Ui/PanelLayerConfiguration.php` (LSS bei `LSS_MALFUNCTION` leer)
- `src/Lib/Map/VisualPanel/LssBlockade/LssBlockadeGridFactory.php`
- `src/Lib/Map/VisualPanel/Layer/DataProvider/Spacecraftcount/*`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (`getLocalMap` ~Z. 2841, `buildLocalMapContext`, `countFieldSignatures` ~Z. 3162, `getShipCentredMap`)
- `apps/frontend/src/components/spacecraft/LssMap.tsx`, `FieldContextPanel.tsx`
- Effekt-Katalog aus tmw-K1a

## Akzeptanzkriterien

- [ ] Steht das Schiff auf einem Feld mit `LSS_MALFUNCTION`, liefert `GET spacecraft/:id/local-map` keine Felddaten außer dem eigenen Feld, dazu einen Hinweis. Das Frontend zeigt „Langstreckensensoren liefern keine verwertbaren Daten“.
- [ ] Felder mit `LSS_BLOCKADE` verdecken die Sicht auf dahinterliegende Felder nach dem STU-Raster (`LssBlockadeGridFactory`). Verdeckte Felder werden ohne Inhalt geliefert.
- [ ] Bei `NO_SPACECRAFT_COUNT` ist die Signaturanzahl des Feldes immer leer. Bei `DUBIOUS_SPACECRAFT_COUNT` steht ab einer Signatur „!“ statt der Zahl, und zwar im Backend-DTO, damit keine echten Zahlen an den Client gehen.
- [ ] Backend-Tests für alle vier Effekte (DTO-Ebene). Frontend-Test: `LssMap` rendert „!“ und den Störungshinweis.

## Comments

- 2026-10-28 Agent: Blocked by a missing product decision: the acceptance criteria require LSS_BLOCKADE to follow STU’s LssBlockadeGridFactory, but the referenced STU FieldTypeEffectEnum still marks LSS_BLOCKADE as not implemented while a grid implementation exists. Please confirm whether SWU should intentionally activate that currently dormant STU algorithm, including that blockade fields themselves are returned without content, and whether the behavior must apply to both system and galaxy local maps.
