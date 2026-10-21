# Kolonie-Sandbox: Bauen, Abreißen und Schalten

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** col-G3a

## Ziel

In der Sandbox kann der Spieler wie in der echten Kolonie bauen, abreißen, upgraden und Gebäude schalten, aber ohne Kosten, Bauzeit, Queues oder Ereignisse. Regeln zu Feldtyp, Forschung, Limits und Energie gelten wie in der Kolonie. Die Entscheidung über die Sandbox steht in col-G3a.

## STU-Quellen

- `src/Module/Colony/View/Sandbox/`, `src/html/colony/sandbox/*.twig`
- `src/Component/Building/BuildingRemovalHandler.php`, `BuildingPostAction.php` (polymorph für `ColonySandbox`; Building-Action-Handler tun bei Sandboxen nichts)

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-construction.service.ts` (Regelprüfungen herauslösen und für Sandbox wiederverwenden)
- `colony-sandbox.service.ts` aus col-G3a
- `apps/frontend/src/pages/colonies/components/ColonyFieldDialog.tsx`, `PanelBuild.tsx`, `PanelBuildingManagement.tsx` (Sandbox-Modus)

## Akzeptanzkriterien

- [ ] Bauen, Abreißen, Upgrade, Terraforming und (Massen-)Schaltung funktionieren in der Sandbox sofort und kostenlos.
- [ ] Feldtyp-, Forschungs-, Gebäudelimit- und Atmosphärenregeln werden wie in der echten Kolonie geprüft (gemeinsamer Code, keine Kopie).
- [ ] Sandbox-Aktionen erzeugen keine Nachrichten, Queues oder Hook-Effekte (col-A1a/b).
- [ ] Backend- und Frontend-Tests.

## Entscheidung

Vorgabe: Folgt col-G3a, Option (a) – die Kolonie-Sandbox wird vollständig umgesetzt; dieses Teilpaket ist Teil davon.

## Comments

- 2026-10-21 Product Owner: Option a (über col-G3a) – Folgt der Entscheidung zu col-G3a: Die Kolonie-Sandbox wird vollständig umgesetzt; dieses Teilpaket ist damit freigegeben.
