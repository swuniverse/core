# Forschungsbaum: EXCLUDE- und REQUIRE_SOME-Kanten unterscheiden

**Status:** claimed
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Der SWU-Forschungsbaum zeichnet alle Abhängigkeiten gleich. Der STU-Admin-Baum unterscheidet EXCLUDE (rot) und REQUIRE_SOME (blau) von REQUIRE. Spieler sollen so erkennen, welche Forschungen sich gegenseitig ausschließen und wo eine von mehreren Voraussetzungen genügt.

## STU-Quellen

- `src/Module/Admin/View/ResearchTree/`

## SWU-Pfade

- `apps/frontend/src/pages/research-tree.tsx`
- `apps/backend/src/modules/research/research.service.ts` (Abhängigkeitsdaten im Baum-Payload)

## Akzeptanzkriterien

- [ ] REQUIRE-, REQUIRE_SOME- und EXCLUDE-Kanten haben unterschiedliche Farben bzw. Strichart mit Legende.
- [ ] Gesperrte (ausgeschlossene) Forschungen sind im Baum als ausgeschlossen erkennbar.
- [ ] Frontend-Test: die drei Kantentypen werden unterschiedlich gerendert.

## Comments
