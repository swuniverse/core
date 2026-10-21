# HoloNet: Admin-Löschung mit Begründung

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** soc-D1

## Ziel

Ein Admin löscht einen fremden HoloNet-Beitrag weich und gibt optional eine Begründung an. Der Autor erhält eine Systemnachricht „Der HoloNet-Beitrag mit der ID X wurde vom Admin Y gelöscht. Begründung: …“.

## STU-Quellen

- `src/Module/Communication/Action/AdminDeleteKnPost/AdminDeleteKnPost.php`
- `src/Module/Communication/View/ShowAdminDeletePost`
- `src/html/communication/adminDelete.twig`

## SWU-Pfade

- `apps/backend/src/modules/holonet/holonet.service.ts`, `holonet.controller.ts` (z. B. `DELETE /holonet/:id/admin` mit `AdminGuard`)
- `apps/backend/src/modules/auth/admin.guard.ts`
- `apps/backend/src/modules/messaging/messaging.service.ts#sendSystem`
- `apps/frontend/src/pages/holonet.tsx`

## Akzeptanzkriterien

- [ ] Endpunkt nur für Admins (403 sonst); Begründung optional, max. 500 Zeichen.
- [ ] Beitrag wird weich gelöscht (Mechanik aus soc-D1); der Autor erhält die Systemnachricht mit Beitrags-ID, Admin-Namen und Begründung.
- [ ] UI: Admins sehen an fremden Beiträgen „Löschen (Admin)“ mit Dialog für die Begründung.
- [ ] Backend-Tests: Nicht-Admin abgelehnt, Löschung weich, Nachricht mit/ohne Begründung. Frontend-Test: Button nur für Admins.

## Comments
