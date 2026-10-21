# E-Mail-Verifikation nach der Registrierung

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** sh-AP-01

## Ziel

Neue Konten gelten bis zur Bestätigung ihrer E-Mail-Adresse als unverifiziert und kommen erst danach ins Onboarding. Spieler können die Mail neu anfordern und eine vertippte Adresse korrigieren. Unverifizierte Konten werden später von der Inaktivitätslöschung (sh-AP-06) nach 3 Tagen entfernt.

Vorgabe gemäß Leitplanke 4: alles hinter `EMAIL_VERIFICATION_ENABLED` (Default `false`). Bei ausgeschaltetem Flag gelten alle Konten als verifiziert und das Verhalten bleibt wie heute. SMS-Verifikation wird nicht gebaut (laut Inventur STU-spezifisch).

## STU-Quellen

- `src/Module/Maindesk/Action/AccountVerification/AccountVerification.php`
- `src/Module/Maindesk/Action/EmailManagement/EmailManagement.php` (Neusenden, Adresskorrektur)
- `src/Component/Player/Register/RegistrationEmailSender.php`, `PlayerCreator.php`
- `src/Module/PlayerSetting/Lib/UserStateEnum.php` (`ACCOUNT_VERIFICATION`)
- `src/Module/Control/Router/Handler/AccountNotVerifiedFallbackHandler.php`
- `src/html/index/accountVerification.twig`

## SWU-Pfade

- `apps/backend/src/modules/auth/auth.service.ts#register`, `auth.controller.ts`, `user.entity.ts` (z. B. `emailVerifiedAt`), Migration (Bestandskonten gelten als verifiziert)
- Token-Dienst aus sh-AP-01 (Zweck `EMAIL_VERIFICATION`), `GET /auth/features`
- `apps/backend/src/modules/game-status/game-status.guard.ts` bzw. ein eigener Guard für `RequiresGameAccess`-Endpunkte
- `apps/backend/src/modules/mail/mail.service.ts`
- `apps/frontend/src/pages/register.tsx`, `apps/frontend/src/components/layout/app-shell.tsx`, neue Seite `verify-email.tsx`, `apps/frontend/src/app/app.tsx`

## Akzeptanzkriterien

- [ ] Bei aktivem Flag erhält ein neues Konto `emailVerifiedAt = null` und eine Mail mit Link `<APP_BASE_URL>/verify-email?token=…` (Token 72 h gültig) statt bzw. vor der Willkommensmail.
- [ ] `POST /auth/verify-email` (Token) setzt `emailVerifiedAt`; ungültig/abgelaufen → 400.
- [ ] `POST /auth/verification/resend` (eingeloggt, unverifiziert) sendet höchstens alle 5 Minuten eine neue Mail; `PATCH /auth/verification/email` ändert die Adresse nur solange unverifiziert (Format- und Eindeutigkeitsprüfung, neue Mail, alter Token ungültig).
- [ ] Unverifizierte Konten erhalten auf Spielendpunkten (`RequiresGameAccess`) 403 mit Code `EMAIL_NOT_VERIFIED`; erlaubt bleiben `auth/me`, Logout und die Verifikationsendpunkte. Admins sind ausgenommen.
- [ ] Frontend: Die App-Shell leitet unverifizierte Spieler auf `/verify-email` (Hinweis, Neusenden, Adresse korrigieren); nach Bestätigung geht es zu `/claim-colony`.
- [ ] `GET /auth/features` liefert zusätzlich `emailVerification: boolean`.
- [ ] Flag aus: keine Mail, kein Gate, Registrierung und Onboarding unverändert (Regressionstest).
- [ ] Backend-Tests: Gate, Ablauf, Resend-Limit, Adresskorrektur, Flag aus. Frontend-Tests: Weiterleitung und Verifikationsseite.

## Comments
