# Forschungsliste und -detail: Bilder, Datum, Folgeforschungen, Freischaltungen

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Die SWU-Forschungsansicht zeigt keine Forschungsbilder, kein Abschlussdatum, Folgeforschungen nur über REQUIRE und keine freigeschalteten Rümpfe und Module. STU zeigt all das in Liste und Detail. Das Issue bringt Liste und `TechDetailModal` auf STU-Informationsdichte.

## STU-Quellen

- `src/html/view/research.twig`
- `src/html/research/researchDetails.twig`
- `src/Module/Research/View/ShowResearch/`, `src/Module/Research/SelectedTech.php`

## SWU-Pfade

- `apps/frontend/src/pages/research.tsx` (`TechDetailModal`, Liste) + `research.spec.tsx`
- `apps/frontend/src/lib/assets.ts` (`researchImage`)
- `apps/backend/src/modules/research/research.service.ts` (`getResearchState`), `entities/research.entity.ts` (kein Abschlusszeitpunkt vorhanden → `completedAt` ergänzen, Migration nach `docs/typeorm-migrations.md`)
- `apps/backend/src/modules/research/unlock-resolver.service.ts` (Rümpfe, Module, Gebäude)

## Akzeptanzkriterien

- [x] Liste und Detail zeigen das Forschungsbild (`researchImage`) mit Fallback, wenn das Asset fehlt.
- [x] Abgeschlossene Forschungen zeigen „Erforscht am <Datum>“ (neues Feld `completedAt`, beim Abschluss gesetzt; Altbestände ohne Datum zeigen kein Datum).
- [x] Folgeforschungen im Detail umfassen REQUIRE- und REQUIRE_SOME-Abhängige (REQUIRE_SOME als „eine von“ gekennzeichnet).
- [x] Das Detail listet freigeschaltete Schiffsklassen und Module (zusätzlich zu Gebäuden) mit Icons.
- [x] Backend-Test: `completedAt` wird gesetzt und ausgeliefert; Unlock-Daten enthalten Rümpfe/Module.
- [x] Frontend-Tests: Bild, Datum, REQUIRE_SOME-Folgeforschung, Rumpf-/Modulliste.

## Comments

Geprüft beim Anlegen: Die Schaltfläche „Tick ausführen“ in `research.tsx` ist bereits nur für Admins sichtbar (`user?.isAdmin`).

Umgesetzt: Das Backend persistiert und liefert `completedAt` per Entity und Migration und reichert Rumpf-/Modulfreischaltungen für die Anzeige an. Forschungsliste und Detail zeigen Bilder mit Fallback, Abschlussdatum, REQUIRE_SOME-Folgeforschungen sowie Rumpf-/Modulfreischaltungen mit Icons. Backend- und Frontend-Tests sowie die vollständigen Nx-Prüfungen sind grün; keine offenen Folgepunkte.
