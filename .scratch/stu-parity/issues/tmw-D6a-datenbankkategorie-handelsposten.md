# Datenbankkategorie „Handelsstationen“ (Handelsposten)

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** tmw-T1

## Ziel

Der Platzhalter „Handelsstationen – Stationsnetz wird aufgebaut“ wird zu einer POI-Liste aller Handelsposten. Sie zeigt Name, Beschreibung, Handelsnetz, Ort (Ebene, Koordinaten bzw. System) und Betreiber, wie STU `poiinfo.twig`. Spielerposten aus tmw-T12a erscheinen später automatisch.

## STU-Quellen

- `src/Component/Database/DatabaseCategoryTypeEnum.php` (`TRADEPOST`)
- `src/html/database/poiinfo.twig`, `src/Module/Database/View/Category/*`

## SWU-Pfade

- Handelsmodul aus tmw-T1 (Postenentität, Lesedienst)
- `apps/backend/src/modules/database/database.service.ts`, `database.controller.ts`
- `apps/frontend/src/pages/database.tsx` (Gruppe „Wichtige Orte“)

## Akzeptanzkriterien

- [ ] `GET database/trade-posts` liefert alle Handelsposten mit Name, Beschreibung, Netz, Ort und Betreibername, sortiert nach Netz und Name.
- [ ] Der Hub-Eintrag „Handelsstationen“ ist verlinkt. Die Liste nutzt den Spieltabellenstil, und ein Klick auf den Ort führt zur Sternenkarte an diese Position, sofern das Feld erkundet ist. Sonst wird kein Ort offengelegt (Nebel des Krieges).
- [ ] Backend-Test: Liste, Sortierung, keine Ortsangabe für unerkundete Felder. Frontend-Test: Hub-Link und Liste.

## Comments
