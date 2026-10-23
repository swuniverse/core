# Lesebestätigung im Postausgang

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Der Postausgang zeigt bei gelesenen Nachrichten „Nachricht gelesen“, wenn Absender und Empfänger die Einstellung `show_pm_read_receipt` aktiviert haben (STU-Regel). Die Einstellung wird heute gespeichert, aber nirgends gelesen.

Abgrenzung: sh-AP-16 nennt `show_pm_read_receipt` als eine der wirksam zu machenden Einstellungen. Dieses Issue liefert die fachliche Wirkung; ist sh-AP-16 schon resolved und deckt das ab, nur verifizieren und mit Kommentar schließen.

## STU-Quellen

- `src/Module/Message/Lib/PrivateMessageListItem.php#isMarkableAsReceipt`
- `src/html/view/pmCategory.twig:55` (`/assets/buttons/double_checked.png`, Titel „Nachricht gelesen“)
- `src/Module/PlayerSetting/Lib/UserSettingEnum.php` (`SHOW_PM_READ_RECEIPT`)

## SWU-Pfade

- `apps/backend/src/modules/messaging/messaging.service.ts#getSent` bzw. `getFolder` (OUTBOX)
- `apps/backend/src/modules/settings/settings.service.ts` (`SETTING_DEFAULTS`)
- `apps/frontend/src/pages/messages.tsx` (Postausgang)

## Akzeptanzkriterien

- [ ] Postausgang-Einträge enthalten ein Feld `readReceipt: boolean`, das nur `true` ist, wenn die Nachricht gelesen wurde UND beide Seiten `show_pm_read_receipt = '1'` haben. Der rohe `isRead`-Status des Empfängers wird sonst nicht ausgeliefert.
- [ ] Die Auflösung der Einstellungen erfolgt gebündelt (keine N+1-Abfragen je Nachricht).
- [ ] Die UI zeigt ein Häkchen-Icon (Asset, z. B. `buttons/double_checked.png`, sonst Statuspunkt) mit `title="Nachricht gelesen"`.
- [ ] Backend-Tests: vier Kombinationen der Einstellungen × gelesen/ungelesen.
- [ ] Frontend-Test: Postausgang rendert das Icon nur bei `readReceipt: true`.

## Comments
