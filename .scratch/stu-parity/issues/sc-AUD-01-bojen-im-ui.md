# Bojen im UI: auslegen, aufnehmen, anzeigen

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Bojen sind im Backend vollständig vorhanden (sc-WP-SENS-1), für Spieler aber unerreichbar: Kein Frontend-Code ruft die Bojen-Endpunkte auf oder zeigt `buoys` an. Wie STU sollen Spieler Bojen im Informationsblock setzen, im Sektor-Scan und Feldkontext sehen, analysieren und aufnehmen sowie eine Bojenliste unter der Schiffsliste sehen.

## STU-Quellen

- `src/html/spacecraft/control/control_mid.twig` („Boje setzen“, `B_DROP_BOUY`)
- `src/html/spacecraft/sectorScan.twig` (Bojentabelle mit „Boje aufbringen“)
- `src/html/ship/analysebuoy.twig`, `src/Module/Spacecraft/View/ShowAnalyseBuoy/ShowAnalyseBuoy.php`
- `src/Module/Spacecraft/Action/DropBuoy/DropBuoy.php`, `src/Module/Spacecraft/Action/TakeBuoy/`
- `src/html/view/shiplist.twig` → `src/html/buoylist.twig`, `src/Module/Ship/View/ShowBuoyList/ShowBuoyList.php`
- `src/Public/static/js/buoy.js`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts` (`GET/POST :id/buoys`, `POST :id/buoys/:buoyId/pick-up`, Z. ~995–1020)
- `apps/backend/src/modules/spacecraft/spacecraft-scan.service.ts` (`buoys` im Sektor-Scan)
- `packages/shared/src/lib/spacecraft/index.ts` (`buoys` in Sektor-Scan- und Feldkontext-DTO, Z. ~715, ~952; `SpacecraftBuoyDto`)
- `apps/frontend/src/components/spacecraft/FieldContextPanel.tsx` (Informationsblock, `SectorScanDialog`)
- `apps/frontend/src/pages/spacecraft.tsx` (Schiffsliste, Bojenliste darunter)

## Akzeptanzkriterien

- [x] Im Feldkontext gibt es „Boje setzen“ mit Texteingabe (1–60 Zeichen); Fehlergründe des Backends (keine Bojenware, Rampe defekt, Limit 16, zu wenig EPS) werden angezeigt.
- [x] Bojen am Feld erscheinen im Feldkontext und im Sektor-Scan als Tabelle (Eigner, Text, Datum) mit „Boje aufbringen“ (1 EPS) für jedes Schiff am Feld.
- [x] Bojen lassen sich analysieren (Text/Eigner wie `analysebuoy.twig`), ohne das Feld verlassen zu müssen.
- [x] Unter der Schiffsliste steht wie STU eine Bojenliste der eigenen Bojen mit Position.
- [x] Nach Setzen/Aufnehmen aktualisieren sich Feldkontext, Sektor-Scan, Lager und EPS ohne Reload.
- [x] Frontend-Tests (Vitest/Testing Library) für Setzen, Anzeige im Sektor-Scan, Aufnehmen und Bojenliste; Backend-Test, falls für die Bojenliste ein neuer Endpunkt nötig ist.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt A („Bojen auslegen/aufnehmen/anzeigen“) und D; [spacecraft.md](../audit-2026-11-17/spacecraft.md) große Abweichung 1, Seitenabgleich „Sektor-Scan“ und „Schiffsliste“.
- Resolved-Ticket mit nicht erfüllter Akzeptanz: [sc-WP-SENS-1](sc-WP-SENS-1-bojen.md) („Frontend-Test deckt Anzeige und Aktionen ab“ trifft nicht zu; Feature-Commit `5408d3ca` ohne Frontend-Datei).

## Comments

- 2026-11-20 – umgesetzt, Prüfung ausstehend. Commit: `feat(spacecraft): drop, pick up and list buoys in the UI (stu-parity sc-AUD-01)`.
  - Backend: `SpacecraftBuoyDto.ownerName` (Eignername für Tabelle/Analyse); Feldkontext lieferte rohe Entities (`userId` statt `ownerId`) und mappt jetzt wie der Sektor-Scan über `toBuoyDto`. Ungenutztes `GET :id/buoys` ersetzt durch nutzerweites `GET /spacecraft/buoys` (`SpacecraftOwnBuoyDto` mit `sector` wie STU `getSectorString`: `x|y` bzw. `sx|sy (Name-System)`).
  - Frontend: „Boje setzen“ im Informationsblock (Dialog, 1–60 Zeichen, Backendfehler im Dialog). Bojentabelle (Eigner, Botschaft, Datum, „Boje aufbringen · 1 EPS“, „Analysieren“) im Feldkontext und im Sektor-Scan. Analyse zeigt Text und Besitzer ohne Serveraufruf. Nach Setzen/Aufbringen lädt das Panel die Bojen per Feldkontext nach (die Seite lädt den Kontext sonst nur bei Bewegung) und ruft `onUpdate` für EPS/Lager auf. Bojenliste (Botschaft, x|y) unter den Einzelschiffen.
  - Abweichungen: STU-Analyse-Minispiel (Amplitude/Wellenlänge bis zum Treffer) nicht übernommen, Besitzer direkt sichtbar; Textbuttons statt STU-Grafiken (`take_buoy`/`analyse_buoy` fehlen in SWU-Assets); kein Fraktionsbild der Boje.
  - Geprüft: `nx typecheck` backend/frontend/shared grün; Backend-Unit `spacecraft` 753/754 (rot nur `resource-collection.controller.spec` – Meldungstext des PermissionGuard, unabhängig) inkl. neuem `spacecraft-buoy-list.spec.ts`; Frontend `components/spacecraft` + `pages/spacecraft*` 252/252 inkl. neuer Tests (Setzen, Fehlergrund, Sektor-Scan + Aufbringen, Analyse, Bojenliste); ESLint 0 Fehler.
  - Ausstehend: Browserprüfung (Setzen mit Sondenboje im Lager, Anzeige/Aufbringen im Sektor-Scan, EPS/Lager-Aktualisierung, Bojenliste); PostgreSQL-Check von `GET /spacecraft/buoys` (Relationen `location.systemField.starSystem`).
  - Modell: Opus 5.5 direkt (ticket-coder/Luna in dieser Sitzung nicht verfügbar), keine Delegation.
- 2026-11-20 – **resolved nach Verifikation.** Kriterium 5 belegt: `reloadBuoys` aktualisiert Feldkontext und offenen Sektor-Scan, `onUpdate` lädt EPS/Lager; Tests in `FieldContextPanel.spec.tsx`. `GET /spacecraft/buoys` über die Integrationssuite (App-Start) abgedeckt. Gesammelter Verifikationslauf 2026-11-20 (Claude Opus 5.5, Sol nicht verfügbar): Diff-Review gegen die Akzeptanzkriterien; `npm run lint` 0 Fehler, `npm run typecheck` grün, `npm run test` grün (Backend 2700/2700, Frontend 972/972), PostgreSQL-Integrationssuite inkl. aller Migrationen 1058/1062 – die 4 Fehler lagen in zwei veralteten Test-Fixtures (`profile-friends.int-spec.ts`: `shipRepo`-Mock ohne `manager` seit sc-AUD-13; `layer-access-http.int-spec.ts`: `MAP_EDITOR` nur im JWT, seit col-AUD-16a liest `JwtStrategy` Rechte aus der DB), korrigiert und erneut 54/54 grün. Browserprüfungen entfallen laut Nutzerentscheid vom 2026-11-20.
