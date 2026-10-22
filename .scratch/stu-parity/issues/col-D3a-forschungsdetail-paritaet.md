# Forschungsliste und -detail: Bilder, Datum, Folgeforschungen, Freischaltungen

**Status:** claimed
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

- [ ] Liste und Detail zeigen das Forschungsbild (`researchImage`) mit Fallback, wenn das Asset fehlt.
- [ ] Abgeschlossene Forschungen zeigen „Erforscht am <Datum>“ (neues Feld `completedAt`, beim Abschluss gesetzt; Altbestände ohne Datum zeigen kein Datum).
- [ ] Folgeforschungen im Detail umfassen REQUIRE- und REQUIRE_SOME-Abhängige (REQUIRE_SOME als „eine von“ gekennzeichnet).
- [ ] Das Detail listet freigeschaltete Schiffsklassen und Module (zusätzlich zu Gebäuden) mit Icons.
- [ ] Backend-Test: `completedAt` wird gesetzt und ausgeliefert; Unlock-Daten enthalten Rümpfe/Module.
- [ ] Frontend-Tests: Bild, Datum, REQUIRE_SOME-Folgeforschung, Rumpf-/Modulliste.

## Comments

Geprüft beim Anlegen: Die Schaltfläche „Tick ausführen“ in `research.tsx` ist bereits nur für Admins sichtbar (`user?.isAdmin`).
