# Lager-voll-Meldung als Nutzereinstellung

**Status:** wontfix
**Priority:** P3
**Size:** S
**Blocked by:** sh-AP-16

## Ziel

STU unterdrückt die Meldung „Lager voll“ im Kolonie-Tick, wenn der Spieler die Einstellung `storage_notification` abgeschaltet hat. SWU speichert die Einstellung bereits (`settings.service.ts`, `pages/settings.tsx`), wertet sie im Tick aber nicht aus.

## STU-Quellen

- `src/Module/Tick/Colony/Component/ProceedStorage.php`
- `src/Module/PlayerSetting/Lib/UserSettingEnum.php`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-tick-processor.service.ts` (`STORAGE_FULL`, Z. ~428/436)
- `apps/backend/src/modules/settings/settings.service.ts`

## Akzeptanzkriterien

- [ ] Abgedeckt durch sh-AP-16 („`storage_notification` gilt für Tick-Reports“).

## Comments

Beim Anlegen als Duplikat erkannt: Der kanonische Eigentümer ist sh-AP-16 (siehe Duplikat-Tabelle in `map.md`, Zeile „Gespeicherte Einstellungen wirksam“). Dieses Issue wird nicht separat umgesetzt.
