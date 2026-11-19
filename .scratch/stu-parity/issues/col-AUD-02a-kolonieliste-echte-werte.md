# Kolonieliste mit echten Werten (Signaturen, Verteidigung, Wachstum)

**Status:** resolved
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

- [x] `signatureCount` ist die Zahl der Signaturen, die der Sektor-Scan der Kolonie zeigt (gleiche Quelle und Filter wie sc-WP-NAV-2b, keine zweite Zählweise).
- [x] `status.defended` ist wahr, wenn wie STU `Colony::isDefended` mindestens ein Schiff die Kolonie verteidigt (Verteidigungsauftrag im Orbit).
- [x] `population.immigration` ist das Wachstum des nächsten Ticks wie STU `getGrowth`, mit derselben Funktion wie im Tick berechnet (keine Kopie der Formel).
- [x] Die Signaturzahl in der Kolonieliste ist klickbar und öffnet den Sektor-Scan der Kolonie (Kolonie „Informationen“ mit Scan oder Dialog).
- [x] Das Verteidigungs-Icon erscheint bei `defended` mit Tooltip „Verteidigt“.
- [x] Die Werte werden für alle Kolonien gesammelt geladen (keine N+1-Abfragen je Kolonie).
- [x] Backend-Tests für `findAllByUser`: Signaturzahl > 0 bei fremder Signatur, `defended` mit/ohne Verteidiger, Wachstum statt Arbeitslose.
- [x] Frontend-Test `ColonyOverview.spec.tsx`: Link öffnet den Scan, Icon erscheint, Klammerwert ist das Wachstum.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt C (Zeile „Kolonieliste“).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Seitenabgleich „Kolonieliste“ und „Sektor-Scan“, Große Abweichung Nr. 2.
- sc-WP-NAV-2b (resolved) hat den Sektor-Scan gebaut, die Liste aber nicht angebunden; `inventory/colony.md` führt „Signaturen“ fälschlich als erledigt.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt. Die fehlenden Infoblöcke stehen in col-AUD-02b.
- 2026-11-19 – umgesetzt, Prüfung ausstehend. Umsetzung an Sonnet-Agent delegiert, Review durch Opus 5.5. Commits `c3e7050a` und „perf(colony): bound the colony list signature query to the visibility window (col-AUD-02a)“.
  - Signaturzahl wie STU `getVisibleSignatureCount`: fremde Schiffe mit Signatur am Kolonie-Systemfeld innerhalb des Sichtbarkeitsfensters, getarnt und verblasst eingeschlossen. `FlightSignatureService.countVisibleAt` (eine Abfrage für alle Kolonien) nutzt dieselbe aus `getVisibleAt` extrahierte Regel (`classify`).
  - `defended`: eine Abfrage aller DEFEND-Orbitaufträge (`ColonyOrbitService.getDefendedColonyIds`). Wachstum: gemeinsame Funktion aus col-AUD-08b.
  - Signaturzahl ist ein Knopf, der die Kolonie auswählt; Standardansicht „Informationen“ zeigt den Umgebungsscan. Verteidigt-Icon `defend1.png` mit `title="Verteidigt"` (natives Tooltip statt `Tooltip`-Komponente).
  - Review-Befund behoben: `countVisibleAt` lud die gesamte Signaturhistorie aller Kolonien; jetzt nur Zeilen jünger als 48 h (`FLIGHT_SIGNATURE_RETENTION_MS`, gleiche Grenze wie `classify`), Ergebnis unverändert.
  - Checks: Jest `flight-signature colony-tick colony-environment-scan colony-orbit` 266/266, Vitest `ColonyOverview` 1/1, PostgreSQL `admin-flight-signature signature-mask colony-environment` 23/23 inkl. neuem Vergleich `countVisibleAt` = `getVisibleAt` auf echten Zeilen, `tsc` sauber, ESLint 0 Fehler.
  - Hinweis: `FlightSignatureService` ist im Kolonieservice `@Optional()` (positionale Testkonstruktoren); fehlt er, zeigt die Liste 0. Nest stellt ihn bereit (gleiche Injektion wie im Umgebungsscan).
  - Offen für den Prüfpass: Browserprüfung (Klick auf Signaturzahl, Icon), gemeinsamer Build.
- 2026-11-19 – Prüfpass (Opus 5.5): Diff bereits bei der Übergabe geprüft (Signaturabfrage auf 48 h begrenzt, PostgreSQL-Vergleich mit dem Sektor-Scan). Gesamtlauf auf `66a875fb`: Build `backend frontend shared` erfolgreich, Lint 0 Fehler, Backend-Unit 2605/2605, Frontend 925/925, PostgreSQL 903/1042 – die 139 Fehlschläge sind identisch mit dem vorherigen Prüfpass (vorbestehend, kein Ticket), keine Regression. Offen: Browserprüfung – Signaturzahl öffnet den Umgebungsscan, Verteidigt-Icon mit Tooltip. Status bleibt `claimed`.
- 2026-11-19 – Abschluss (Opus 5.5): Browserprüfung vom Product Owner als bestanden gesetzt (nicht von Opus selbst im Browser gesehen). Prüflauf auf `7924fb96`: `nx typecheck backend frontend` grün, Build und Lint 0 Fehler, Backend-Unit 2625/2625, Frontend 943/943, PostgreSQL 1048/1048. resolved.
