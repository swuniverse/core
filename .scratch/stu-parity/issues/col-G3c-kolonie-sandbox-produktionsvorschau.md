# Kolonie-Sandbox: Produktions- und Energievorschau

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** col-G3b

## Ziel

Die Sandbox zeigt dieselbe Bilanz wie die echte Kolonie: Energie, Warenproduktion je Ware, Wohnraum, Arbeiter und Lebensstandard. So sieht der Spieler die Folgen seiner Planung. Die Entscheidung über die Sandbox steht in col-G3a.

## STU-Quellen

- `src/html/colony/sandbox/*.twig`
- `src/Module/Colony/Lib/ColonyProductionPreviewWrapper.php`, `ColonyEpsProductionPreviewWrapper.php`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-stats.service.ts` (`calculateSummary`, `resolveEpsProc` für Sandbox-Felder nutzbar machen)
- `apps/frontend/src/pages/colonies/components/PanelInfo.tsx`, `SupplyDock.tsx` (Sandbox-Modus)

## Akzeptanzkriterien

- [ ] Die Sandbox zeigt Energiebilanz, Produktion je Ware, Wohnraum, Arbeiter und Lebensstandard, berechnet mit derselben Logik wie die echte Kolonie.
- [ ] Ein Vergleich „Kolonie vs. Sandbox“ zeigt die Differenz je Kennzahl.
- [ ] Backend-Test: gleiche Felder ergeben gleiche Bilanz wie die Kolonie; Frontend-Test für die Differenzanzeige.

## Entscheidung

Vorgabe: Folgt col-G3a, Option (a) – die Kolonie-Sandbox wird vollständig umgesetzt; dieses Teilpaket ist Teil davon.

## Comments

- 2026-10-21 Product Owner: Option a (über col-G3a) – Folgt der Entscheidung zu col-G3a: Die Kolonie-Sandbox wird vollständig umgesetzt; dieses Teilpaket ist damit freigegeben.
