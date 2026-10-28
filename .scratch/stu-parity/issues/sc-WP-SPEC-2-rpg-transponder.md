# RPG-Transponder mit Admin-Unsichtbarkeit

**Status:** needs-triage
**Priority:** P3
**Size:** S
**Blocked by:** soc-E3a

## Ziel

Ein RPG-Transponder bildet das STU-RPG-Modul ab. Er kennzeichnet ein Spacecraft als Teil einer administrierten RPG-Szene; Administratoren können es für die Szenenvorbereitung vollständig aus Spieler-Sensorik und Kartenanzeige ausblenden und später wieder einblenden. Die Unsichtbarkeit ist kein spielerseitiges Tarnsystem und gewährt keine taktischen Vorteile.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/SetRpgModuleInvisibility/SetRpgModuleInvisibility.php`
- `Component/Spacecraft/System/Type/RPGShipSystem.php`
- `Component/Spacecraft/System/Data/RpgModuleSystemData.php`
- Sichtbarkeitsfilter in `Orm/Repository/MapRepository.php` und `Orm/Repository/ShipRepository.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/`
- `apps/backend/src/modules/starmap/`
- `apps/backend/src/modules/admin/`
- `apps/frontend/src/pages/admin.tsx`
- `packages/shared/`
- `game-data/data/modules/special.yaml`

## Akzeptanzkriterien

- [ ] RPG-Transponder kann nur über administrierte RPG-Inhalte vergeben beziehungsweise verwendet werden.
- [ ] Nur Administratoren können die RPG-Unsichtbarkeit umschalten.
- [ ] Unsichtbare RPG-Spacecrafts fehlen in Spieler-Sensorik, Kartenbelegung und Echtzeitereignissen; Administratoren können sie weiterhin verwalten.
- [ ] Beim Wiedereinblenden wird der aktuelle Zustand wieder veröffentlicht.
- [ ] Das System beeinflusst keine Tarn-, Kampf- oder Haltungsregeln.
- [ ] Service- und Integrationstests decken Rechte und sämtliche Sichtbarkeitspfade ab.

## Comments
