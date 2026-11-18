# Notrufbox im Maindesk anzeigen

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Das Maindesk lädt aktive Notrufe (`/spacecraft/distress-signals/active` in `dashboard.tsx`) in `data.distressSignals`, rendert sie aber nirgends. Notrufe sieht man nur am eigenen Schiff im `CommunicationDrawer`. Spieler erfahren damit nichts von fremden Notrufen; der STU-Anreiz für Rettungseinsätze (Kapseln bergen) fehlt.

STU zeigt in der linken Maindesk-Spalte eine Box „Notrufe“ (nur wenn Notrufe aktiv sind) mit den Spalten Koordinaten, Info („<Schiff> von <Spieler>“), Notrufsignal und Zeitpunkt. Volle Details sieht man nur für eigene Schiffe und Schiffe von Freunden (`EmergencyWrapper#showDetails`). Sonst stehen dort nur der Sektor, der Notruftext und der Zeitpunkt.

## STU-Quellen

- `src/html/maindesk/emergencies.twig`
- `src/html/view/maindesk.twig` (Z. 12, Einbindung nach Allianzforum, vor Ereignissen)
- `src/Module/Game/Lib/View/Provider/MaindeskProvider.php` (Z. ~155–170, `setPotentialEmergencies`)
- `src/Module/Spacecraft/Lib/EmergencyWrapper.php` (Z. ~20–28, `showDetails`: eigener Spieler oder Freund)
- `src/Orm/Entity/SpacecraftEmergency.php`

## SWU-Pfade

- `apps/frontend/src/pages/dashboard.tsx` (Laden Z. ~137–141, Layout Z. ~446–472)
- `apps/frontend/src/pages/dashboard/types.ts` (`distressSignals`, Z. ~189)
- `apps/frontend/src/pages/dashboard/DashboardLowerSections.tsx` (neue Box neben `RecentEvents`)
- `apps/backend/src/modules/spacecraft/spacecraft-communication.service.ts#listActiveDistress` (Z. ~390–420)
- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts` (`GET distress-signals/active`, Z. ~1319)
- `apps/backend/src/modules/alliance/relationship-resolver.service.ts` (Freund-Bestimmung)

## Akzeptanzkriterien

- [ ] Box „Notrufe“ in der linken Maindesk-Spalte, Position wie STU (nach Allianzforum, vor Ereignissen). Ohne aktive Notrufe wird sie nicht angezeigt.
- [ ] Spalten: Koordinaten, Info, Notrufsignal, Zeitpunkt (In-Universe-Datumsformat wie übrige Maindesk-Zeitangaben).
- [ ] Detailrecht wie STU: Für eigene Schiffe und Schiffe von Freunden (Beziehungsauflösung aus Sicht des Betrachters) Koordinaten sowie „<Schiff> von <Spieler>“ mit Profillink. Für alle anderen nur Sektor/Region und Notruftext, ohne Schiffs- und Spielernamen. Die Filterung passiert serverseitig; das DTO enthält für fremde Notrufe keinen Schiffsnamen, keine Besitzer-ID und keine genauen Koordinaten.
- [ ] RPG-verborgene Schiffe bleiben ausgeblendet (bestehender Filter).
- [ ] Backend-Tests: Detail für eigenes und Freundes-Schiff, reduziertes DTO für Fremde, RPG-Filter.
- [ ] Frontend-Tests: Box erscheint mit Daten, fehlt ohne Daten, zeigt reduzierte Zeile ohne Details.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt A (Zeile „Notrufe im Maindesk“), Abschnitt C (Maindesk) und Abschnitt E („Notrufbox“).
- [`../audit-2026-11-17/shell-admin-runtime.md`](../audit-2026-11-17/shell-admin-runtime.md), G3 und Seitenabgleich `maindesk/emergencies.twig`.
- PO-Linie 2026-11-17 „wie STU“. Kein bisheriges Ticket; sh-AP-18 (resolved) hatte Notrufe nicht im Scope.

## Comments
