# Inaktivitätslöschung und Warnmails

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** sh-AP-07a, sh-AP-05b, sh-AP-05c, sh-AP-05d, sh-AP-04a

## Ziel

Ein täglicher Maintenance-Handler löscht inaktive Konten nach den STU-Fristen und warnt vorher per Mail: unverifizierte Registrierungen nach 3 Tagen, Inaktive nach ca. 3 Monaten, Urlauber nach ca. 6 Monaten, bestätigte Löschanträge (Marke 2) sofort. Admins und Konten mit Löschverbot (Marke 3) sind ausgenommen.

Vorgabe gemäß Leitplanke 4: Löschung und Warnmails stehen hinter `IDLE_DELETION_ENABLED` (Default `false`). Die Fristen werden von STU übernommen und sind per Konfiguration überschreibbar. Bei ausgeschaltetem Flag läuft der Handler nur im Trockenmodus und protokolliert, wen er löschen bzw. warnen würde.

## STU-Quellen

- `src/Module/Maintenance/IdleUserDeletion.php`
- `src/Module/Maintenance/IdleUserWarning.php` (Warnfenster 48 h und 24 h vor Löschung, Nichtaktivierung 24 h vorher, Mailtexte)
- `src/Component/Player/Deletion/PlayerDeletion.php#handleDeleteable` (`USER_IDLE_REGISTRATION` = 3 Tage, `USER_IDLE_TIME` = 7.905.600 s ≈ 91,5 Tage, `USER_IDLE_TIME_VACATION` = 15.811.200 s = 183 Tage)
- `src/Orm/Repository/UserRepository.php#getDeleteable`, `#getIdleRegistrations`

## SWU-Pfade

- Maintenance-Gerüst aus sh-AP-07a (Handler-Registrierung)
- `PlayerDeletionService` aus sh-AP-05a
- `apps/backend/src/modules/auth/user.entity.ts` (`lastActiveAt`, `vacationMode`, `deletionMark`, `isAdmin`, `emailVerifiedAt` aus sh-AP-03)
- `apps/backend/src/modules/auth/last-activity.service.ts`
- `apps/backend/src/modules/mail/mail.service.ts`
- `.env.example` (`IDLE_DELETION_ENABLED`, `IDLE_DELETION_DAYS`, `IDLE_DELETION_VACATION_DAYS`, `IDLE_UNVERIFIED_DAYS`)

## Akzeptanzkriterien

- [ ] Handler `IdleUserMaintenanceHandler` im Maintenance-Lauf (täglich 03:00): erst Warnungen, dann Löschungen; jede Phase protokolliert Anzahl und IDs.
- [ ] Löschkandidaten: Marke 2; oder kein Urlaub und `lastActiveAt` älter als die Inaktivfrist; oder Urlaub und `lastActiveAt` älter als die Urlaubsfrist; oder unverifiziert und Registrierung älter als 3 Tage (dieser Zweig nur, wenn sh-AP-03 bereits resolved ist und `EMAIL_VERIFICATION_ENABLED` aktiv ist; sonst entfällt er und wird unter `## Comments` als Folgepunkt vermerkt). Ausgenommen: Admins, Marke 3, `lastActiveAt = null` bei verifizierten Konten (wie STU `la.timestamp > 0`).
- [ ] Warnmails: 48 h und 24 h vor Ablauf der Inaktiv- bzw. Urlaubsfrist sowie (mit sh-AP-03) 24 h vor der Löschung unverifizierter Konten; je Konto und Lauf höchstens eine Mail; Abschlussmail nach erfolgter Löschung (Grund: Inaktivität bzw. Löschantrag). Texte auf Deutsch, Star-Wars-Team-Signatur statt STU-Texten.
- [ ] Flag aus: keine Mail, keine Löschung, nur Trockenlauf-Log.
- [ ] Ein Fehler bei einem Konto bricht den Lauf nicht ab; Fehler landen im Ergebnis des Maintenance-Laufs (sh-AP-07a).
- [ ] Backend-Tests mit festem `now`: Grenzwerte jeder Frist, Admin- und Marke-3-Ausnahme, Warnfenster 48/24 h, Trockenmodus, Fehlertoleranz.

## Comments
