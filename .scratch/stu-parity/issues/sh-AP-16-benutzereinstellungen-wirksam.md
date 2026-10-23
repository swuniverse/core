# Gespeicherte Benutzereinstellungen wirksam machen

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Die vier gespeicherten Einstellungen haben heute keine Wirkung. Dieses Issue macht `default_view` und `storage_notification` wirksam, validiert alle Werte serverseitig und stellt einen gemeinsamen Lesezugriff bereit, den `email_notification` (soc-A4, sh-AP-10) und `show_pm_read_receipt` (soc-A3) nutzen. Kanonisch für soc-F2 und col-B2. Wählbare Farbschemata sind ausgelagert (soc-F3b).

## STU-Quellen

- `src/Module/PlayerSetting/Lib/UserSettingEnum.php`
- `src/Component/Player/Settings/UserSettingsProvider.php` (u. a. `DEFAULT_VIEW` Z. 130)
- `src/Module/Tick/Colony/Component/ProceedStorage.php` (`isStorageNotification`)

## SWU-Pfade

- `apps/backend/src/modules/settings/settings.service.ts` (`SETTING_DEFAULTS`, `VALID_SETTINGS`, `updateSettings`), `settings.module.ts`
- `apps/backend/src/modules/colony/colony-tick-processor.service.ts` (`STORAGE_FULL`, Z. ~428/436) bzw. `apps/backend/src/modules/messaging/colony-event.service.ts`
- `apps/frontend/src/pages/settings.tsx` (Optionen `maindesk`, `colonies`, `starmap`, `messages`), `apps/frontend/src/app/app.tsx`, `apps/frontend/src/pages/login.tsx`

## Akzeptanzkriterien

- [ ] Serverseitige Validierung je Schlüssel: Boolesche Einstellungen nur `'0'`/`'1'`, `default_view` nur aus einer Allowlist (`maindesk`, `colonies`, `spacecraft`, `starmap`, `messages`, `research`, `holonet`); unbekannte Schlüssel oder Werte → 400.
- [ ] Exportierter Dienst `UserSettingsReader` (z. B. `getBoolean(userId, key)`, `getManyBoolean(userIds, key)` ohne N+1) aus dem Settings-Modul, von anderen Modulen injizierbar.
- [ ] `default_view`: Nach erfolgreichem Login (nicht beim Neuladen einer beliebigen Seite) leitet das Frontend auf die Route der gewählten Startansicht; `maindesk` = `/`. Die Einstellung wird im Login-Response oder per `GET /user/settings` gelesen.
- [ ] `storage_notification = '0'` unterdrückt die `STORAGE_FULL`-Meldungen des Kolonie-Ticks für diesen Spieler; andere Tick-Meldungen bleiben.
- [ ] Die Einstellungsseite erklärt bei `email_notification` und `show_pm_read_receipt`, dass die Wirkung mit den jeweiligen Funktionen kommt, solange soc-A3/soc-A4 nicht resolved sind (Hinweis entfällt danach).
- [ ] Backend-Tests: Validierung, Reader mit Defaults, `STORAGE_FULL` an/aus. Frontend-Test: Weiterleitung nach Login je `default_view`.

## Comments
