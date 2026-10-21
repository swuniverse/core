# Brownout-Meldungen sichtbar machen und Wrackverfall

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Schaltet der Tick wegen Energiemangels Systeme ab, erfährt der Spieler das (STU-Tickmeldung). Wracks verlieren wie STU-Trümmerfelder je Tick Hülle und verschwinden bei 0.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Tick/Spacecraft/Handler/{SystemDeactivationHandler,EpsSystemCheckHandler,EnergyConsumeHandler}.php`
- `Module/Tick/Spacecraft/ManagerComponent/LowerHull.php` (`lowerTrumfieldHull`: 5–15 je Tick)

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft-resource-flow.service.ts` (`handleBrownout`)
- `apps/backend/src/modules/spacecraft/entities/spacecraft-wreck.entity.ts` (`hull`)
- `apps/backend/src/modules/tick/tick.service.ts`
- `apps/frontend/src/components/spacecraft/SpacecraftMessageBar.tsx` (WS `SPACECRAFT_EVENT`)

## Akzeptanzkriterien

- [ ] Prüfen, ob Brownout-Abschaltungen bereits gemeldet werden; falls nicht: je betroffenem Schiff eine Meldung mit abgeschalteten Systemen (Ereignis bzw. Nachricht im Schiffsordner), sichtbar in der Schiffsansicht.
- [ ] Wracks verlieren je Tick zufällig 5–15 Hülle und werden bei 0 samt Inhalt gelöscht.
- [ ] Backend-Tests für Meldung und Wrackverfall (deterministischer Zufall).
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments
