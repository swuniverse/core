# „Zufällige Spieler (online)“ mit bis zu 35 Avataren

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Die Maindesk-Box „Zufällige Spieler (online)“ zeigt in SWU **einen** zufällig gewählten Online-Spieler (`useStableRandomPlayer` in `DashboardLowerSections.tsx`). STU zeigt bis zu **35** Avatare von Spielern, die in den letzten 5 Minuten aktiv waren, ohne den eigenen Spieler und ohne NPCs. Sichtbar sind Spieler mit Online-Status-Freigabe und Spieler, die den Betrachter als Freund in ihrer Kontaktliste führen. Ohne Treffer steht „Kein Spieler online“.

## STU-Quellen

- `src/html/maindesk/randomOnline.twig`
- `src/Module/Game/Lib/View/Provider/MaindeskProvider.php` (Z. ~97–99, `getOrderedByLastaction(35, …, time() - USER_ONLINE_PERIOD)`)
- `src/Orm/Repository/UserRepository.php` (Z. ~260–290, `getOrderedByLastaction`: Online-Status-Setting oder Freund-Kontakt beim Betrachter, sortiert nach letzter Aktion)
- `src/Component/Game/GameEnum.php` (Z. 10, `USER_ONLINE_PERIOD = 300`)

## SWU-Pfade

- `apps/frontend/src/pages/dashboard/DashboardLowerSections.tsx` (Z. ~133–149 `useStableRandomPlayer`, Box Z. ~216–241)
- `apps/frontend/src/pages/dashboard.tsx`, `pages/dashboard/types.ts` (`onlinePlayers`)
- `apps/backend/src/modules/database/database.service.ts#getOnlinePlayers` (Z. ~239–253, heute WebSocket-Verbindungen + `show_online_status`)
- `apps/backend/src/modules/database/database.controller.ts` (`GET online`, Z. ~55) bzw. `apps/backend/src/modules/dashboard/dashboard.controller.ts`
- `apps/backend/src/modules/auth/user.entity.ts` (`lastActiveAt`)
- `apps/backend/src/modules/contacts/` (Freund-Kontakte)
- `apps/frontend/src/components/PlayerAvatar.tsx`

## Akzeptanzkriterien

- [ ] Neuer oder erweiterter Endpunkt für das Maindesk liefert bis zu 35 Spieler, sortiert nach letzter Aktivität absteigend, Aktivität innerhalb der letzten 5 Minuten, ohne den Betrachter und ohne NPCs.
- [ ] Sichtbar ist ein Spieler, wenn er den Online-Status freigibt **oder** den Betrachter als Freund in seiner Kontaktliste führt (wie STU).
- [ ] Die Box zeigt alle Treffer als Avatare mit Name im Tooltip und Link aufs Profil; ohne Treffer „Kein Spieler online“.
- [ ] Die Auswahl eines einzelnen Zufallsspielers entfällt. Der öffentliche Endpunkt `GET database/online` (Landing) bleibt unverändert oder wird separat behandelt.
- [ ] Backend-Tests: Limit 35, Zeitfenster, Sortierung, Ausschluss Betrachter/NPC, Sichtbarkeit über Setting und über Freund-Kontakt.
- [ ] Frontend-Tests: mehrere Avatare, Leerzustand.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt C (Zeile Maindesk „Zufällige Spieler online bis 35 Avatare“).
- [`../audit-2026-11-17/shell-admin-runtime.md`](../audit-2026-11-17/shell-admin-runtime.md), G5 und Seitenabgleich `maindesk/randomOnline.twig`.
- PO-Linie 2026-11-17 „wie STU“. Kein bisheriges Ticket (Inventur führte die Box als „voll“).

## Comments
