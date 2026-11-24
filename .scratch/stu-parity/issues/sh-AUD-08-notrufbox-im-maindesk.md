# Notrufbox im Maindesk anzeigen

**Status:** claimed
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

- [x] Box „Notrufe“ in der linken Maindesk-Spalte, Position wie STU (nach Allianzforum, vor Ereignissen). Ohne aktive Notrufe wird sie nicht angezeigt.
- [x] Spalten: Koordinaten, Info, Notrufsignal, Zeitpunkt (In-Universe-Datumsformat wie übrige Maindesk-Zeitangaben).
- [x] Detailrecht wie STU: Für eigene Schiffe und Schiffe von Freunden (Beziehungsauflösung aus Sicht des Betrachters) Koordinaten sowie „<Schiff> von <Spieler>“ mit Profillink. Für alle anderen nur Sektor/Region und Notruftext, ohne Schiffs- und Spielernamen. Die Filterung passiert serverseitig; das DTO enthält für fremde Notrufe keinen Schiffsnamen, keine Besitzer-ID und keine genauen Koordinaten.
- [ ] RPG-verborgene Schiffe bleiben ausgeblendet (bestehender Filter).
- [ ] Backend-Tests: Detail für eigenes und Freundes-Schiff, reduziertes DTO für Fremde, RPG-Filter.
- [x] Frontend-Tests: Box erscheint mit Daten, fehlt ohne Daten, zeigt reduzierte Zeile ohne Details.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt A (Zeile „Notrufe im Maindesk“), Abschnitt C (Maindesk) und Abschnitt E („Notrufbox“).
- [`../audit-2026-11-17/shell-admin-runtime.md`](../audit-2026-11-17/shell-admin-runtime.md), G3 und Seitenabgleich `maindesk/emergencies.twig`.
- PO-Linie 2026-11-17 „wie STU“. Kein bisheriges Ticket; sh-AP-18 (resolved) hatte Notrufe nicht im Scope.

## Comments

### 2026-11-24 – umgesetzt, Prüfung ausstehend

Commit „feat(maindesk): STU distress box with viewer-filtered details (stu-parity sh-AUD-08)“.

- `GET /spacecraft/distress-signals/active` filtert jetzt pro Betrachter (`listActiveDistress(viewerId)`). Eigene Schiffe und Schiffe von Freunden (`RelationshipResolverService.resolveMany`, `isFriend`, Besitzer = aktueller `spacecraft.userId`) bekommen `details` (Schiff-ID, Name, Besitzer-ID/-Name, genaue Koordinaten). Für fremde Notrufe ist `details: null`; dann stehen dort nur `sectorLabel` („<Ebene> · Sektor N“, gleiche Sektorformel wie der Kartenkontext), Text und Zeitpunkt. `active` und `stoppedAt` sind aus dem DTO entfernt, weil der Endpoint nur aktive Notrufe liefert und einzig vom Maindesk genutzt wird.
- Frontend: `DashboardDistressSignals` zwischen Allianzforum und Ereignissen. Die Box wird ohne Notrufe nicht angezeigt. Spalten: Koordinaten, Info, Notrufsignal, Zeitpunkt (`formatGameDateTime`). Der Profillink erscheint nur mit Details.
- Bereits gelaufen: `spacecraft-communication.service.spec.ts` (12/12, darunter eigen/Freund/fremd und RPG-Filter), `DashboardLowerSections.spec.tsx` (9/9), `nx run-many -t typecheck -p backend frontend` grün.
- Noch offen für die gesammelte Verifikation: `rpg-transponder.int-spec.ts` (angepasst auf `listActiveDistress(admin)` / `details?.spacecraftId`, braucht Integrations-DB) und der Diff-Review. AC „Backend-Tests“ und „RPG-verborgene Schiffe“ bleiben bis dahin offen.
- Modell: Opus 5.5 direkt (Sol/Luna in dieser Sitzung nicht verfügbar; Ticket berührt Informationsfreigabe, daher keine Delegation).
