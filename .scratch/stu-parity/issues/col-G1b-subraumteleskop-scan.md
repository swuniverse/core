# Subraumteleskop: Scan eines Kartenfelds

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** col-G1a

## Ziel

In STU kostet ein Teleskop-Scan EPS und zeigt für das gewählte Kartenfeld die Anzahl der Schiffe je Rumpfkategorie (`getRumpCategoryInfo`), ohne Eigentümer. Das ist Fernaufklärung und berührt ADR-0002, nach der Wissen über Systeme nur durch eigene Astrometrie entsteht und Systemeinträge keine taktischen Fernaktionen erlauben.

## STU-Quellen

- `src/Module/Colony/View/ShowSubspaceTelescopeScan/ShowSubspaceTelescopeScan.php` (EPS-Abzug, `locationRepository->getRumpCategoryInfo`)
- `src/html/colony/component/telescopeScan.twig`

## SWU-Pfade

- Service und Panel aus col-G1a
- `apps/backend/src/modules/colony/entities/colony-changeable.entity.ts` (EPS)
- `docs/adr/0002-persoenliche-systementdeckung-und-dynamisches-scanwissen.md`

## Akzeptanzkriterien

- [x] Scan zieht die EPS-Kosten ab; bei zu wenig EPS wird abgelehnt.
- [x] Ergebnis im Panel: Anzahl Schiffe je Rumpfkategorie auf dem gewählten Feld, ohne Eigentümer; das Ergebnis wird nicht gespeichert und erzeugt keine Systementdeckung.
- [x] `docs/adr/0002-persoenliche-systementdeckung-und-dynamisches-scanwissen.md` erhält einen Nachtrag: momentane Fernaufklärung ohne Speicherung (Teleskop-Scan) ist zulässig.
- [x] Backend- und Frontend-Tests.

## Entscheidung

Vorgabe: Variante (a), STU. Anzahl Schiffe je Rumpfkategorie auf dem Feld, momentan, ohne Eigentümer; keine Systementdeckung, keine Speicherung. Vermerk in ADR-0002, dass momentane Aufklärung ohne Speicherung zulässig ist.

## Comments

- 2026-10-21 Product Owner: Option a – Der Teleskop-Scan zeigt wie in STU momentan die Anzahl der Schiffe je Rumpfkategorie auf dem Feld, ohne Eigentümer, ohne Speicherung und ohne Systementdeckung.
- 2026-11-02 Agent: POST-Scan mit STU-EPS-Kosten, momentaner Rumpfkategorie-Aggregation und Panel-Tabelle umgesetzt; ADR-0002 ergänzt. Fokussierte Tests und alle Builds sind grün. Der vollständige Backend-Testlauf bleibt durch die fachfremden bestehenden Fixture-Fehler in `spacecraft-core-controls.spec.ts` und `spacecraft-fleet.service.spec.ts` rot.
