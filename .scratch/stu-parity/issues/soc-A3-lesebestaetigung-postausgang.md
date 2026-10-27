# Lesebestätigung im Postausgang

**Status:** resolved
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

- [x] Postausgang-Einträge enthalten ein Feld `readReceipt: boolean`, das nur `true` ist, wenn die Nachricht gelesen wurde UND beide Seiten `show_pm_read_receipt = '1'` haben. Der rohe `isRead`-Status des Empfängers wird sonst nicht ausgeliefert.
- [x] Die Auflösung der Einstellungen erfolgt gebündelt (keine N+1-Abfragen je Nachricht).
- [x] Die UI zeigt ein Häkchen-Icon (Asset, z. B. `buttons/double_checked.png`, sonst Statuspunkt) mit `title="Nachricht gelesen"`.
- [x] Backend-Tests: vier Kombinationen der Einstellungen × gelesen/ungelesen.
- [x] Frontend-Test: Postausgang rendert das Icon nur bei `readReceipt: true`.

## Comments

- 2026-10-27: Postausgang liefert datensparsame, gebündelt aufgelöste Lesebestätigungen; die Nachrichtenliste zeigt dafür ein Doppelhäkchen. Backend- und Frontend-Tests sowie Pflichtvalidierung und Builds sind grün.
- 2026-10-23: Umsetzung und die neuen fokussierten Tests sind grün (12/13 Messaging-HTTP-Integrationstests; der bestehende Auth-Test bleibt unabhängig mit 500 statt 401 rot). Die Pflichtvalidierung kann nach zwei ernsthaften Läufen nicht grün werden: `backend:test` scheitert reproduzierbar im unveränderten `spacecraft-destruction.service.spec.ts`, weil der Test Commodity `10101` erwartet, die Implementierung aber `10201` speichert. `backend:test-integration` scheitert zusätzlich im bestehenden anonymen Folder-Test mit 500 statt 401. Produktänderungen werden gemäß Ralph-Abbruchregel zurückgenommen; bitte die beiden Baseline-Fehler klären.
