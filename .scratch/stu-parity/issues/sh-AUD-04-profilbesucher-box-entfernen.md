# Profilbesucher-Box vom Maindesk entfernen

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

SWU zeigt in der rechten Maindesk-Spalte die Box „Profilbesucher“ (soc-F1b). In STU ist diese Box im Maindesk-Template auskommentiert, Spieler sehen dort keine Profilbesucher. Der Product Owner hat am 2026-11-17 entschieden: **wie STU**. Die Box verschwindet vom Maindesk.

Die Erfassung der Besuche (`registerVisit`, Opt-out-Einstellung, 7-Tage-Bereinigung in der Maintenance) bleibt bestehen. STU erfasst Besuche ebenfalls (`ProfileVisitorRegistration`) und hält die Daten vor. Entfernt wird nur die Anzeige auf dem Maindesk samt dem dafür genutzten Endpunkt.

## STU-Quellen

- `src/html/view/maindesk.twig` (Z. 19: `{# {% include 'html/maindesk/visitors.twig' %} #}`, auskommentiert)
- `src/html/maindesk/visitors.twig` (nicht eingebunden)
- `src/Module/PlayerProfile/Lib/ProfileVisitorRegistration.php` (Erfassung bleibt)

## SWU-Pfade

- `apps/frontend/src/pages/dashboard.tsx` (Laden `/dashboard/profile-visitors` Z. ~168, Rendern Z. ~469)
- `apps/frontend/src/pages/dashboard/DashboardLowerSections.tsx` (`DashboardProfileVisitors`, Z. ~8–40)
- `apps/frontend/src/pages/dashboard/types.ts` (`profileVisitors`)
- `apps/frontend/src/pages/dashboard/DashboardProfileVisitors.spec.tsx`, `DashboardLowerSections.spec.tsx`
- `apps/backend/src/modules/dashboard/dashboard.controller.ts` (`GET profile-visitors`, Z. ~27), `dashboard.service.ts` (`getProfileVisitors`), `dashboard.module.ts`
- `apps/backend/src/modules/profile-visitor/profile-visitor.service.ts` (`getRecentVisitors` nur noch nutzen, falls anderer Aufrufer existiert)

## Akzeptanzkriterien

- [ ] Das Maindesk rendert keine Box „Profilbesucher“ mehr und lädt `/dashboard/profile-visitors` nicht mehr. Die rechte Spalte zeigt Limits, „Zufällige Spieler (online)“ (sh-AUD-10) und Prozesse wie STU.
- [ ] Der Endpunkt `GET dashboard/profile-visitors` und `DashboardService#getProfileVisitors` sind entfernt; `getRecentVisitors` wird entfernt, wenn es keinen weiteren Aufrufer hat.
- [ ] Erfassung, Opt-out („Meine Profilbesuche nicht erfassen“) und 7-Tage-Bereinigung bleiben unverändert und getestet.
- [ ] `map.md`: Entscheidung soc-F1b (Option a, Maindesk-Anzeige) als revidiert markiert, mit Verweis auf dieses Ticket.
- [ ] Frontend-Test: Maindesk zeigt keine Profilbesucher-Box und ruft den Endpunkt nicht auf. `DashboardProfileVisitors.spec.tsx` entfernt.
- [ ] Backend-Test: Route existiert nicht mehr (404); Erfassungstests der `profile-visitor`-Suite bleiben grün.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt G (Zeile „Profilbesucher auf dem Maindesk, in STU auskommentiert“) und Abschnitt N2.
- [`../audit-2026-11-17/shell-admin-runtime.md`](../audit-2026-11-17/shell-admin-runtime.md), Seitenabgleich `html/view/maindesk.twig` und „Bewusste/entschiedene Abweichungen“.
- PO-Entscheidung 2026-11-17: wie STU. Revidiert `map.md`-Entscheidung „2026-10-21 – soc-F1b – Option a“ (Maindesk-Box) und das AK „Dashboard-Box mit den letzten Besuchern“ des resolved Tickets soc-F1b.

## Comments
