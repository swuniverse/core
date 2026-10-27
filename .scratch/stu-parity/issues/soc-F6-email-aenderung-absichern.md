# E-Mail-Änderung absichern

**Status:** resolved
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

- [x] Neue E-Mail wird getrimmt und kleingeschrieben gespeichert; ungültiges Format (Validator wie `class-validator` `IsEmail`, max. 254 Zeichen) liefert 400 „Die E-Mail-Adresse ist ungültig“.
- [x] Eindeutigkeit wird case-insensitiv geprüft („Die E-Mail-Adresse wird bereits verwendet“).
- [x] Ein injizierbarer Port `EmailBlocklistPort.isBlocked(email)` wird abgefragt (Default-Implementierung: nie gesperrt); gesperrt liefert 400 „Die E-Mail-Adresse ist blockiert“.
- [x] Bestehende Login-/Registrierungsvergleiche funktionieren mit gemischt geschriebenen Altadressen weiter (case-insensitiver Vergleich oder Migration mit Kollisionsprüfung).
- [x] Backend-Tests: Format, Normalisierung, Duplikat in anderer Schreibweise, gesperrt via Port-Mock.

## Comments

E-Mail-Änderung in `settings` validiert und normalisiert, mit case-insensitiver Eindeutigkeitsprüfung und injizierbarem Default-Allow-Blocklist-Port abgesichert. Registrierung und Verifikationsadressänderung verwenden dieselbe Normalisierung und case-insensitive Duplikatsuche; Backend-Tests decken die neuen Regeln ab. Die persistente Sperrliste bleibt wie geplant Folgearbeit von sh-AP-08.
