# Admin: Spieler blockieren und Löschverbot setzen

**Status:** needs-info
**Priority:** P2
**Size:** S
**Blocked by:** sh-AP-08a, sh-AP-05a

## Ziel

Admins können einen Spieler blockieren: Seine E-Mail-Adresse wird als Hash auf eine Sperrliste gesetzt, die Registrierung und E-Mail-Änderung prüfen, und das Konto wird zur Löschung freigegeben (Marke 2). Außerdem können Admins ein Löschverbot (Marke 3) setzen und wieder aufheben.

## STU-Quellen

- `src/Module/Admin/Action/BlockUser.php` (E-Mail-Hash, Löschmarke `DELETION_CONFIRMED`)
- `src/Orm/Entity/BlockedUser.php`
- `src/Module/PlayerSetting/Action/ChangeEmail/ChangeEmail.php` (Sperrlistenprüfung)
- `src/Module/PlayerSetting/Lib/UserConstants.php` (`DELETION_FORBIDDEN`)

## SWU-Pfade

- neue Entity z. B. `apps/backend/src/modules/auth/blocked-email.entity.ts` mit Migration
- `apps/backend/src/modules/auth/auth.service.ts#register`, `auth.controller.ts`
- `EmailBlocklistPort` aus soc-F6 (`apps/backend/src/modules/settings/settings.service.ts`), falls vorhanden; sonst hier anlegen
- `apps/frontend/src/pages/admin-users.tsx`

## Akzeptanzkriterien

- [ ] E-Mail-Hash: SHA-256 der getrimmten, kleingeschriebenen Adresse mit serverseitigem Pepper aus der Konfiguration (kein Klartext gespeichert).
- [ ] `POST /auth/admin/users/:id/block` speichert den Hash, setzt Marke 2 und löscht das Refresh-Token; doppeltes Blockieren → 409 „Dieser Spieler ist bereits blockiert“. Admins nicht blockierbar.
- [ ] Registrierung und E-Mail-Änderung mit gesperrter Adresse liefern 400 „Die E-Mail-Adresse ist blockiert“ (über den Port `EmailBlocklistPort`).
- [ ] `PATCH /auth/admin/users/:id/deletion-forbidden` setzt bzw. entfernt Marke 3; ein Spielerantrag ist dann wie heute blockiert.
- [ ] Spielerliste: Aktionen „Blockieren“ (rot umrandet, mit Bestätigung) und „Löschverbot“ (Umschalter), Anzeige des Zustands.
- [ ] Backend-Tests: Hash statt Klartext, Registrierung blockiert (auch andere Groß-/Kleinschreibung), Marke 2 gesetzt, Löschverbot. Frontend-Test: Aktionen in der Liste.

## Comments

- 2026-10-30: Blockiert durch die verpflichtenden Repository-Gates: `npx nx affected -t lint typecheck test --base=HEAD` und `npx nx run-many --targets=build` scheitern bereits außerhalb dieses Issues im Backend an `TS2307: Cannot find module 'dotenv'` in `apps/backend/src/database/typeorm-migration.config.ts` sowie zahlreichen bestehenden `TS6305`-Fehlern. Zwei Umsetzungs-/Prüfversuche mit grünen fokussierten Backend- und Frontend-Tests konnten die vorgeschriebenen Gesamtprüfungen daher nicht grün bekommen. Produktcode gemäß Abbruchregel verworfen. Bitte zuerst die Baseline (z. B. sh-AP-23 oder Abhängigkeits-/Build-Artefakt-Reparatur) beheben und das Issue danach erneut freigeben.
