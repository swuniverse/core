# Schiffsmülleimer: Waren entsorgen

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Wie in STU kann der Spieler Waren aus dem Schiffslager vernichten, um Platz zu schaffen.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/RemoveWaste`, `Module/Spacecraft/View/ShowWasteMenu`, `html/spacecraft/waste.twig`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.controller.ts`, `entities/cargo-item.entity.ts`
- `apps/frontend/src/components/spacecraft/ShipStoragePanel.tsx`, `CargoPanel.tsx`
- Vorbild Kolonie: `apps/frontend/src/pages/colonies/components/PanelWaste.tsx`

## Akzeptanzkriterien

- [x] `POST :id/cargo/dispose` mit Liste `{commodityId, amount}`; Mengen werden auf den Bestand gekürzt, Meldung je Ware.
- [x] Nur der Eigentümer, nicht im Hyperraumflug.
- [x] Dialog im Lagerbereich mit Mengenfeldern je Ware und „alles“.
- [x] Backend- und Frontend-Test.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-10-28: Umsetzung und fokussierte Backend-/Frontend-Tests waren erfolgreich, aber die vorgeschriebene Prüfung `npx nx affected -t lint typecheck test --base=HEAD` bleibt nach zwei ernsthaften Versuchen rot. `frontend:typecheck` meldet repo-weit TS6305 für nicht erzeugte `apps/frontend/dist/**/*.d.ts`-Ausgaben (auch nach erfolgreichem `npx nx run-many --targets=build`). Produktcode gemäß Abbruchregel verworfen. Bitte den Frontend-Typecheck-/Declaration-Build reparieren oder bestätigen, wie diese bekannte Infrastrukturblockade im Ralph-Lauf zu behandeln ist.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Frontend-TS6305-Gate); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.


## Answer

- `POST /spacecraft/:id/cargo/dispose` akzeptiert `{ items: [{ commodityId, amount }] }` mit validierten ganzzahligen, nichtnegativen Mengen. Eigentümerprüfung sowie Hyperraum-/Wracksperre erfolgen unter einer transaktionalen Schiffssperre.
- Warenbestände werden ebenfalls gesperrt; doppelte Wareneinträge werden zusammengefasst, Übermengen auf den Bestand begrenzt, leere Lagerzeilen entfernt und `cargoUsed` aus dem verbleibenden Bestand neu berechnet. Antwort mit tatsächlicher Entsorgungsmeldung je Ware und aktualisiertem Lager. Leere oder nicht verfügbare Auswahl liefert eine entsprechende Meldung.
- Die Schiffsdetailseite bietet im Lagerbereich einen Dialog mit Mengenfeldern, „alles“ je Ware, dauerhaften Ergebnismeldungen und Fehlerbehandlung. Hyperraum sperrt den Dialog; erfolgreiche Entsorgung aktualisiert Lager und Schiffsdetails.
- Die aktuelle STU-Referenz beschränkt `ShowWasteMenu` auf NPCs. Gemäß diesem Ticket steht die SWU-Funktion Schiffseigentümern zur Verfügung.

## Validation

- `npx nx affected -t lint typecheck test --base=HEAD --parallel=2`: grün; Backend 232 Suites / 2222 Tests, Frontend 110 Dateien / 796 Tests. Bestehende Lintwarnungen, keine Fehler.
- `npx nx run backend:test-integration --runInBand --testPathPatterns=cargo-dispose`: 5 PostgreSQL-Tests grün, einschließlich paralleler Entsorgung und Transaktions-Rollback.
- `npx nx run-many --targets=build`: alle drei Projekte grün.
- Backend-Deklarationen nach dem Produktionsbuild neu erzeugt, damit die Typecheck-Baseline erhalten bleibt.
