# E-Mail-Änderung absichern

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

`PATCH user/email` prüft heute nur Passwort und Eindeutigkeit. Wie STU kommen eine Formatprüfung, Normalisierung (Trim, Kleinschreibung) und eine Sperrlistenprüfung hinzu. Die Sperrliste selbst entsteht in sh-AP-08 (Blockieren); hier wird nur ein Prüfhaken vorgesehen, der ohne Sperrliste immer „nicht gesperrt“ liefert.

## STU-Quellen

- `src/Module/PlayerSetting/Action/ChangeEmail/ChangeEmail.php` (`FILTER_VALIDATE_EMAIL`, bereits verwendet, blockiert über `BlockedUserRepository` mit Hash)

## SWU-Pfade

- `apps/backend/src/modules/settings/settings.service.ts` (E-Mail ändern), `settings.controller.ts`
- `apps/backend/src/modules/auth/auth.service.ts` (Registrierung/Login: gleiche Normalisierung beim Vergleich)
- `apps/frontend/src/pages/settings.tsx`

## Akzeptanzkriterien

- [ ] Neue E-Mail wird getrimmt und kleingeschrieben gespeichert; ungültiges Format (Validator wie `class-validator` `IsEmail`, max. 254 Zeichen) liefert 400 „Die E-Mail-Adresse ist ungültig“.
- [ ] Eindeutigkeit wird case-insensitiv geprüft („Die E-Mail-Adresse wird bereits verwendet“).
- [ ] Ein injizierbarer Port `EmailBlocklistPort.isBlocked(email)` wird abgefragt (Default-Implementierung: nie gesperrt); gesperrt liefert 400 „Die E-Mail-Adresse ist blockiert“.
- [ ] Bestehende Login-/Registrierungsvergleiche funktionieren mit gemischt geschriebenen Altadressen weiter (case-insensitiver Vergleich oder Migration mit Kollisionsprüfung).
- [ ] Backend-Tests: Format, Normalisierung, Duplikat in anderer Schreibweise, gesperrt via Port-Mock.

## Comments
