# Awards: Vergabe durch Admins

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** soc-G1

## Ziel

Admins vergeben Awards manuell an Spieler, insbesondere NPC-/Fraktions-Awards und RPG-/Community-Awards (STU `GiveNpcAward`). Die Vergabe läuft über den idempotenten `AwardService`.

## STU-Quellen

- `src/Module/NPC/Action/GiveNpcAward`
- `src/Component/Player/UserAwardEnum.php` (NPC- und Community-Awards)

## SWU-Pfade

- `apps/backend/src/modules/awards/*` (Admin-Endpunkt mit `AdminGuard`)
- `apps/backend/src/modules/auth/admin.guard.ts`
- `apps/frontend/src/pages/admin-users.tsx` bzw. `admin.tsx`

## Akzeptanzkriterien

- [ ] `POST /admin/awards/grant` (Spieler-ID, Award-Key, optional `incrementExisting`) nur für Admins (403 sonst); unbekannter Spieler/Award liefert 404.
- [ ] Admin-UI: Auswahl Spieler und Award aus dem Katalog, Ergebnis als Toast.
- [ ] Optional: Award entziehen (Anzahl verringern bzw. Eintrag löschen) ohne Prestige-Rückbuchung, mit Bestätigung.
- [ ] Backend-Tests: Rechte, Vergabe, Fehlerfälle. Frontend-Test: Formular ruft den Endpunkt.

## Comments
