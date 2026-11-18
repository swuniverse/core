# Mails wie STU: PM-Benachrichtigung, Massenmail, Tick-Fehlermail

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** sh-AUD-01

## Ziel

Laut PO-Entscheidung (README G) entfallen die Mail-Flags; Mails werden dann standardmäßig verschickt. Drei Mailarten weichen von STU ab:

1. **PM-Benachrichtigung:** SWU ist Opt-out (`email_notification: '1'`) und schickt nur „Neue Nachricht von <Name>“ mit Link. STU ist Opt-in und schickt den vollen PM-Text mit Betreff „Neue Privatnachricht von Spieler <Name>“, nur für den Ordner Persönlich. Ohne Angleichung bekäme nach Wegfall der Flags jeder Spieler ungefragt Mails.
2. **Massenmail:** SWU schickt immer eine PM und mailt optional nur an Spieler mit `email_notification`. STU schickt wahlweise Mail **oder** PM an alle Nicht-NPCs, unabhängig von der Einstellung.
3. **Admin-Fehlermail des Ticks:** STU mailt dem Admin bei einem fehlgeschlagenen Tick (`FailureEmailSender`, `TransactionTickRunner`). SWU hat das nicht.

## STU-Quellen

- `src/Module/Message/Lib/EmailNotificationSender.php` (Z. 28–37: Betreff, voller Text)
- `src/Module/Message/Lib/PrivateMessageSender.php` (Z. ~165–170: nur `SPECIAL_MAIN`)
- `src/Component/Player/Settings/UserSettingsProvider.php` (`isEmailNotification`: ohne Eintrag `false`)
- `src/Module/Admin/Action/SendMassMail.php` (Z. 53–89: Medium Mail/PM, alle Nicht-NPCs)
- `src/Component/Admin/Notification/FailureEmailSender.php`, `src/Module/Tick/TransactionTickRunner.php` (Z. ~62)

## SWU-Pfade

- `apps/backend/src/modules/mail/mail.service.ts` (PM-Mail Z. ~75–85)
- `apps/backend/src/modules/messaging/private-message-notification.service.ts` (NPC-Absender übersprungen Z. ~34)
- `apps/backend/src/modules/settings/settings.service.ts` (`SETTING_DEFAULTS.email_notification`), `apps/backend/src/modules/settings/user-settings-reader.ts` (Z. ~11)
- `apps/backend/src/modules/messaging/admin-broadcast.service.ts` (Z. 39–92), `packages/shared/src/lib/messaging/admin-broadcast.ts`
- `apps/frontend/src/pages/admin-mass-message.tsx`, `apps/frontend/src/pages/settings.tsx` (Benachrichtigungen)
- `apps/backend/src/modules/tick/tick.service.ts` (Fehlerpfade `catch`), `.env.example` (Admin-Adresse)

## Akzeptanzkriterien

- [x] `email_notification` ist Opt-in: Default `'0'` in `SETTING_DEFAULTS` und `UserSettingsReader`. Eine Migration setzt bestehende, nie ausdrücklich gespeicherte Werte nicht auf „an“ (Spieler ohne eigenen Eintrag erhalten keine Mails); die Strategie ist im Ticket-Kommentar dokumentiert.
- [x] PM-Mail nur für persönliche PMs von Spielern (nicht System/NPC), Betreff „Neue Privatnachricht von Spieler <Name>“ (Name ohne BBCode), Text = voller PM-Text als Klartext (BBCode entfernt bzw. als Text gerendert), Adressat Konto-E-Mail. Versand blockiert die PM nie.
- [x] Massenmail: Admin wählt Medium „E-Mail“ oder „PM“. E-Mail geht an alle Nicht-NPC-Konten mit Adresse, unabhängig von `email_notification`; PM an alle Nicht-NPCs. Rückmeldung mit Anzahl. Fraktions-Targeting bleibt als SWU-Zusatz erhalten.
- [x] Tick-Fehlermail: Schlägt ein Tick (Haupt-, Minuten- oder Maintenance-Lauf) mit Fehler fehl, erhält die konfigurierte Admin-Adresse (neue Variable, z. B. `ADMIN_EMAIL`, in `.env.example`) eine Mail mit Ticktyp, Zeit und Fehlermeldung/Stack. Mailfehler werden nur geloggt.
- [x] Einstellungs-UI: Hinweistext zur PM-Mail passt zu Opt-in und vollem Text.
- [x] Backend-Tests: Opt-in-Default, voller Text und Betreff, NPC/System ohne Mail, Massenmail beide Medien inkl. Spieler mit `email_notification = 0`, Tick-Fehler löst Fehlermail aus.
- [x] Frontend-Test: Medium-Auswahl in der Massenmail-Seite.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt G (Flags entfallen) und H („PM-Mail“, „Admin-Fehlermails … Massenmail anders gefiltert“); [social.md](../audit-2026-11-17/social.md) Große Abweichung 6, Kleine Abweichungen „Massenmail“ und „Mail, weitere Unterschiede“, Unsicherheit 3.
- PO-Entscheidung G vom 2026-11-17 (Flags entfallen) macht die Angleichung dringlich; Blocker sh-AUD-01 (Flag-Entfernung).
- `soc-A4-email-bei-neuer-pm.md` ist `resolved` mit „Text ohne Nachrichteninhalt“; diese Akzeptanz wird durch STU-Verhalten ersetzt. Passwort-Reset-Ablauf bleibt bewusst sicherer als STU (kein Klartext-Passwort).

## Comments


### 2026-11-17 – Umsetzung und Bestandsstrategie

Ohne gespeicherten Eintrag ist `email_notification` jetzt ausgeschaltet (`'0'` / `false`). Ausdrücklich gespeicherte Werte bleiben erhalten; es gibt keinen Backfill und keine Migration, die Spieler einschaltet. Die neue Migration betrifft ausschließlich Versandansprüche für Admin-Massenmails.

## Answer

- Persönliche Spieler-PMs werden nach erfolgreicher Speicherung unabhängig vom SMTP-Versand zugestellt. Nur ein ausdrückliches Opt-in des Empfängers löst die zusätzliche Mail an seine Konto-Adresse aus. Betreff wie STU, Klartextname und vollständiger Nachrichtentext ohne unterstützte BBCode-Tags; Linkziele bleiben erhalten. Systemnachrichten sowie NPC-Absender/-Empfänger lösen keine PM-Mail aus.
- Admin-Massennachrichten wählen genau ein Medium: PM oder E-Mail. E-Mail ignoriert die PM-Mail-Einstellung und adressiert alle Nicht-NPC-Konten mit Adresse; Fraktionsfilter bleibt erhalten. UI, Vertrag, Validierung und Rückmeldung wurden angepasst.
- `admin_broadcast_deliveries` beansprucht E-Mail-Empfänger atomar vor SMTP. Wiederholte und parallele Anfragen mit derselben Broadcast-ID versuchen jeden Empfänger höchstens einmal. Versandfehler werden geloggt und erfolgreiche Sendungen gezählt. Bewusste Grenze: SMTP und Datenbank sind keine gemeinsame Transaktion; ein Absturz nach dem Anspruch kann eine Zustellung verlieren. Fehlgeschlagene Versuche werden unter derselben ID nicht wiederholt. Ein neuer Versand verwendet eine neue ID. Kontolöschung entfernt die zugehörigen Ansprüche per Fremdschlüssel-Cascade.
- Haupt-, Minuten- und Maintenance-Läufe melden Fehler über `ADMIN_EMAIL`, sowohl bei manuellen als auch geplanten Aufrufen. Enthalten sind Ticktyp, Ticknummer, Zeit und Fehler/Stack. Auch frühe Datenbankfehler und Fehler beim Speichern werden gemeldet. SMTP-Fehler bleiben Logeinträge und ersetzen den ursprünglichen Tickfehler nicht.
- Betrieb: Migration `20261117120000-admin-broadcast-deliveries` beim nächsten Update ausführen; `ADMIN_EMAIL` und einen funktionierenden SMTP-Transport konfigurieren. Die Migration wurde in der temporären PostgreSQL-Testdatenbank geprüft; keine Betriebsdatenbank wurde verändert.

Validierung: 325 Backend-Unit-Tests, 14 PostgreSQL-Integrationstests (inklusive vollständigem AppModule und Kontolöschungs-Cascade), 11 Frontend-Tests bestanden. Backend-/Frontend-Lint, Typechecks und Builds erfolgreich; bestehende Lint- und Bundlegrößen-Warnungen bleiben. `git diff --check` sauber.
