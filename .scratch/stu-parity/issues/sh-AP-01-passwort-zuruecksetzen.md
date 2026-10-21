# Passwort vergessen und zurücksetzen

**Status:** ready-for-agent
**Priority:** P1
**Size:** M
**Blocked by:** —

## Ziel

Spieler können ein vergessenes Passwort per E-Mail-Link zurücksetzen. Die Anfrage verrät nicht, ob ein Konto existiert, der Token ist gehasht gespeichert, läuft ab und ist nur einmal nutzbar. Das Issue liefert außerdem den gemeinsamen Token-Mechanismus, den E-Mail-Verifikation (sh-AP-03) und Löschbestätigung (sh-AP-05a) wiederverwenden. Kanonisch auch für soc-H3.

Vorgabe gemäß Leitplanke 4: Der Versand an Spieler steht hinter der Konfiguration `PASSWORD_RESET_ENABLED` (Default `false`). Ist sie aus oder SMTP nicht konfiguriert, ist die Funktion im UI ausgeblendet und der Endpunkt antwortet mit 404.

Bewusste Abweichung von STU (Leitplanke 5, Sicherheitslücke nicht übernehmen): STU verschickt nach dem Klick ein neues Klartext-Passwort per Mail. SWU lässt den Spieler das neue Passwort auf der Reset-Seite selbst setzen.

## STU-Quellen

- `src/Module/Index/Action/SendPassword/SendPassword.php` (Token-Erzeugung, Mailtext)
- `src/Module/Index/Action/ResetPassword/ResetPassword.php`
- `src/Module/Index/View/ShowLostPassword`, `src/Module/Index/View/ShowResetPassword`
- `src/html/index/lostPassword.twig`, `src/html/index/resetPassword.twig`

## SWU-Pfade

- `apps/backend/src/modules/auth/auth.service.ts`, `auth.controller.ts`, `user.entity.ts`, neue Entity z. B. `auth/account-token.entity.ts` mit Migration (`docs/typeorm-migrations.md`)
- `apps/backend/src/modules/mail/mail.service.ts` (neue Methode `sendPasswordResetMail`)
- `packages/shared/src/lib/auth/index.ts` (DTOs)
- `apps/frontend/src/pages/login.tsx` (Link „Passwort vergessen?“), neue Seiten `lost-password.tsx`, `reset-password.tsx`, Routen in `apps/frontend/src/app/app.tsx` (öffentlich, wie `/login`)
- `.env.example` (`PASSWORD_RESET_ENABLED`, Basis-URL für Links, z. B. `APP_BASE_URL`)

## Akzeptanzkriterien

- [ ] Gemeinsamer Token-Dienst (z. B. `AccountTokenService`): Zweck (`PASSWORD_RESET`, später `EMAIL_VERIFICATION`, `ACCOUNT_DELETION`), zufälliger Token (≥ 32 Byte), in der DB nur als SHA-256-Hash, Ablauf (Reset: 24 h), einmalige Einlösung, ein neuer Token desselben Zwecks invalidiert ältere.
- [ ] `POST /auth/lost-password` nimmt Login-Name oder E-Mail (case-insensitiv) und antwortet immer gleich („Falls ein Konto existiert, wurde eine E-Mail verschickt“), auch bei unbekanntem Konto. Höchstens eine Anfrage je Konto alle 5 Minuten (weitere werden still verworfen).
- [ ] Die Mail enthält einen Link `<APP_BASE_URL>/reset-password?token=…`, keinen Klartext-Token im Log.
- [ ] `POST /auth/reset-password` (Token, neues Passwort mit denselben Regeln wie bei der Registrierung) setzt den Passwort-Hash, löscht das gespeicherte Refresh-Token (alle Sitzungen enden) und verbraucht den Token. Abgelaufene, benutzte oder unbekannte Tokens liefern 400 „Der Link ist ungültig oder abgelaufen“.
- [ ] `GET /auth/features` (öffentlich) liefert mindestens `{ passwordReset: boolean }` (true nur bei Flag an und SMTP konfiguriert); spätere Flags (sh-AP-03, sh-AP-05a) erweitern diesen Endpunkt.
- [ ] Frontend: Login zeigt „Passwort vergessen?“ nur bei `passwordReset: true`; Seiten `/lost-password` und `/reset-password` im Stil von `components/auth/AuthLayout.tsx`, mit Erfolgs- und Fehlermeldung und Rückweg zum Login.
- [ ] Backend-Tests: gleiche Antwort für existierendes/unbekanntes Konto, Hash statt Klartext gespeichert, Ablauf, Einmaligkeit, Refresh-Token gelöscht, Flag aus → 404, Rate-Limit.
- [ ] Frontend-Tests: Link nur bei aktivem Feature, Reset-Formular sendet Token und zeigt Fehler bei ungültigem Link.

## Comments
