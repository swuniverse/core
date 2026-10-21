# Profilbesucher erfassen und anzeigen

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

STU erfasst Besuche fremder Profile (einmal je Besucher, mit Datum) und zeigt sie im Maindesk als Box „Profilbesucher“. Das ist ein Datenschutzthema; Übernahme und Aufbewahrung müssen entschieden werden.

## STU-Quellen

- `src/Module/PlayerProfile/Lib/ProfileVisitorRegistration.php`
- `src/Module/Game/Lib/View/Provider/UserProfileProvider.php`
- `src/html/maindesk/visitors.twig`

## SWU-Pfade

- `apps/backend/src/modules/database/database.controller.ts` (`GET database/settlers/:id`)
- `apps/backend/src/modules/dashboard/dashboard.service.ts`
- `apps/frontend/src/pages/dashboard/DashboardLowerSections.tsx` (Maindesk-Box, vgl. sh-AP-18)

## Akzeptanzkriterien

- [ ] Besuch je Besucher/Profil upsert mit Datum, keine Selbstbesuche; Besucher mit aktivem Opt-out werden nicht erfasst.
- [ ] Einstellung „Meine Profilbesuche nicht erfassen“ in den Einstellungen (Default aus).
- [ ] Ein Bereinigungsjob löscht Besuche älter als 7 Tage (Maintenance aus sh-AP-07a, falls vorhanden, sonst eigener Cron).
- [ ] Dashboard-Box mit den letzten Besuchern.
- [ ] Backend- und Frontend-Tests (Upsert, Selbstbesuch, Opt-out, Bereinigung, Box).

## Entscheidung

Vorgabe: Variante (a). Erfassung wie STU, Aufbewahrung 7 Tage, Opt-out-Einstellung „Meine Profilbesuche nicht erfassen“ (Besuche dieses Spielers werden nicht gespeichert).

## Comments

- 2026-10-21 Product Owner: Option a – Profilbesuche werden wie in STU erfasst und dem Profilinhaber angezeigt, mit 7 Tagen Aufbewahrung und einer Opt-out-Einstellung.
