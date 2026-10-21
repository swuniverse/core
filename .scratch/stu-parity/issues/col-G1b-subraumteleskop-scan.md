# Subraumteleskop: Scan eines Kartenfelds

**Status:** ready-for-agent
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

- [ ] Scan zieht die EPS-Kosten ab; bei zu wenig EPS wird abgelehnt.
- [ ] Ergebnis im Panel: Anzahl Schiffe je Rumpfkategorie auf dem gewählten Feld, ohne Eigentümer; das Ergebnis wird nicht gespeichert und erzeugt keine Systementdeckung.
- [ ] `docs/adr/0002-persoenliche-systementdeckung-und-dynamisches-scanwissen.md` erhält einen Nachtrag: momentane Fernaufklärung ohne Speicherung (Teleskop-Scan) ist zulässig.
- [ ] Backend- und Frontend-Tests.

## Entscheidung

Vorgabe: Variante (a), STU. Anzahl Schiffe je Rumpfkategorie auf dem Feld, momentan, ohne Eigentümer; keine Systementdeckung, keine Speicherung. Vermerk in ADR-0002, dass momentane Aufklärung ohne Speicherung zulässig ist.

## Comments

- 2026-10-21 Product Owner: Option a – Der Teleskop-Scan zeigt wie in STU momentan die Anzahl der Schiffe je Rumpfkategorie auf dem Feld, ohne Eigentümer, ohne Speicherung und ohne Systementdeckung.
