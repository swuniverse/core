# Kolonieliste mit echten Werten (Signaturen, Verteidigung, Wachstum)

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Die Kolonieliste zeigt Signaturen immer als `0` und „verteidigt“ immer als `false`, weil das Backend beide Werte fest einträgt. In Klammern hinter der Bevölkerung steht die Zahl der Arbeitslosen statt des Wachstums. STU zeigt die echte Signaturzahl als Link zum Sektor-Scan, das Verteidigungs-Icon und das Wachstum. Dieses Ticket liefert die echten Werte und macht die Signaturzahl klickbar.

## STU-Quellen

- `src/html/view/colonylist.twig` (Signaturen als Link `showColonySectorScanWindow`, Icon verteidigt, Bevölkerung mit Wachstum)
- `src/Module/Colony/Lib/ColonyListItem.php` (`getSignatureCount`, `getImmigration` → `getGrowth`, `isDefended`)
- `src/Module/Colony/View/ShowSectorScan/`, `src/html/colony/component/sectorscan.twig`
- `src/Component/Colony/ColonyPopulationCalculator.php` (`getGrowth`)

## SWU-Pfade

- `apps/backend/src/modules/colony/colony.service.ts` `findAllByUser` (Z. 202; `signatureCount: 0` Z. 266, `defended: false` Z. 278, `immigration` = `available` Z. 283–286)
- `apps/backend/src/modules/colony/colony-environment-scan.service.ts` (Signaturen des Sektor-Scans, sc-WP-NAV-2b)
- `apps/backend/src/modules/colony/colony-orbit-order.policy.ts`, `entities/colony-orbit-assignment.entity.ts` (Verteidigungsauftrag im Orbit)
- `apps/backend/src/modules/colony/colony-tick-processor.service.ts` (Wachstumsberechnung Z. 182–227)
- `apps/frontend/src/pages/colonies/components/ColonyOverview.tsx` (Signaturen als Text Z. 173–175), `apps/frontend/src/pages/colonies/types.ts`
- `apps/frontend/src/pages/colonies/components/PanelInfo.tsx` (`SystemScan`/`SectorSignatures`)

## Akzeptanzkriterien

- [ ] `signatureCount` ist die Zahl der Signaturen, die der Sektor-Scan der Kolonie zeigt (gleiche Quelle und Filter wie sc-WP-NAV-2b, keine zweite Zählweise).
- [ ] `status.defended` ist wahr, wenn wie STU `Colony::isDefended` mindestens ein Schiff die Kolonie verteidigt (Verteidigungsauftrag im Orbit).
- [ ] `population.immigration` ist das Wachstum des nächsten Ticks wie STU `getGrowth`, mit derselben Funktion wie im Tick berechnet (keine Kopie der Formel).
- [ ] Die Signaturzahl in der Kolonieliste ist klickbar und öffnet den Sektor-Scan der Kolonie (Kolonie „Informationen“ mit Scan oder Dialog).
- [ ] Das Verteidigungs-Icon erscheint bei `defended` mit Tooltip „Verteidigt“.
- [ ] Die Werte werden für alle Kolonien gesammelt geladen (keine N+1-Abfragen je Kolonie).
- [ ] Backend-Tests für `findAllByUser`: Signaturzahl > 0 bei fremder Signatur, `defended` mit/ohne Verteidiger, Wachstum statt Arbeitslose.
- [ ] Frontend-Test `ColonyOverview.spec.tsx`: Link öffnet den Scan, Icon erscheint, Klammerwert ist das Wachstum.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt C (Zeile „Kolonieliste“).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Seitenabgleich „Kolonieliste“ und „Sektor-Scan“, Große Abweichung Nr. 2.
- sc-WP-NAV-2b (resolved) hat den Sektor-Scan gebaut, die Liste aber nicht angebunden; `inventory/colony.md` führt „Signaturen“ fälschlich als erledigt.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt. Die fehlenden Infoblöcke stehen in col-AUD-02b.
