
## Comments

Optional `shipReward` (faction, techId, shipClassKey, complete moduleSelections) added to `TechDef`; `GameDataService.validateShipReward` rejects incomplete rewards at load (unknown class, missing/unknown slots, faction/techId mismatch). Research state exposes `shipReward {shipClassKey,name}`; `TechDetailModal` shows "Belohnung: <Klasse>" only when mapped. No productive mappings added. Note: the import script does not emit rewards, so validation lives in the loader (tested). Follow-ups: col-D2a2..4.
