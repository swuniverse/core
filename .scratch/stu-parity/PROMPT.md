# Ralph-Durchlauf: STU-Parität

Du bist ein Durchlauf einer Endlosschleife. Du hast kein Gedächtnis außer den Dateien im Repo. Arbeite genau EIN Issue ab, dann beende dich.

## Quellen

- Referenz (nur lesen, niemals ändern): `/Users/TMUNDIN/git/github.com/st-universe/core` (PHP/Twig) und `/Users/TMUNDIN/git/github.com/st-universe/assets`.
- Ziel: dieses Repo. Lies zuerst `AGENTS.md`, `CONTRIBUTING.md`, `CONTEXT.md`, `docs/adr/*` und `.scratch/stu-parity/map.md` (insbesondere „Leitplanken“ und „Entscheidungen“).
- Code-Verständnis: `codegraph explore "<frage>"` vor grep/Read verwenden.

## Ablauf

0. **Abgebrochener Durchlauf:** Die Schleife läuft streng sequenziell. Steht ein Issue bereits auf `**Status:** claimed`, wurde der vorige Durchlauf abgebrochen (z. B. Proxy-/API-Fehler). Setze genau dieses Issue fort: prüfe mit `git status`/`git diff` den vorhandenen Stand, mache weiter ab Schritt 3 und überspringe Schritt 1–2.
1. **Auswahl:** Durchsuche `.scratch/stu-parity/issues/` nach Dateien mit `**Status:** ready-for-agent`, deren `**Blocked by:**`-IDs alle `resolved` oder `wontfix` sind. Wähle nach `**Priority:**` (P1 vor P2 vor P3), bei Gleichstand alphabetisch nach Dateiname. Gibt es keines: schreibe `RALPH_DONE` in `.scratch/stu-parity/ralph-status.md` und beende dich.
2. **Claim:** Setze `**Status:** claimed` und committe nur diese Änderung (`chore(stu-parity): claim <ID>`).
3. **Verstehen:** Lies die im Issue genannten STU-Quellen vollständig (Module, Templates, Tick-Logik, Assets). Lies die betroffenen SWU-Module. Maßstab ist funktionale Spielerparität und STU-typische UI-Dichte, nicht Quellcodeparität. SWU-ADRs und `map.md`-Entscheidungen gehen STU vor. Bekannte STU-Bugs/Sicherheitslücken nicht übernehmen.
4. **Umsetzen:** Test-first. Backend: NestJS-Module (entity → service → controller → module), Shared-DTOs in `packages/shared`, Migrationen nach `docs/typeorm-migrations.md`. Frontend: React + Zustand, bestehende Komponenten und Muster wiederverwenden. Code und Commits auf Englisch, Domänenbegriffe gemäß `CONTEXT.md`.
5. **Prüfen:** Alle müssen grün sein, sonst gilt das Issue nicht als erledigt:
   - `npx nx affected -t lint typecheck test --base=HEAD` (HEAD = dein Claim-Commit; uncommittete Änderungen werden einbezogen) (bei Zweifel `npm run lint && npm run typecheck && npm run test`)
   - `npx nx run-many --targets=build`
6. **Abschließen:**
   - Alle Akzeptanzkriterien abhaken, `**Status:** resolved`, unter `## Comments` eine kurze Notiz (was, wo, offene Folgepunkte).
   - Eine Zeile unter „Erledigt“ in `map.md` ergänzen.
   - Neu entdeckte Lücken als neue Issue-Datei (ID-Schema laut map.md) und `**Status:** needs-triage` anlegen — nicht selbst umsetzen.
   - Ein Commit: `feat(<scope>): <summary> (stu-parity <ID>)`.
7. **Abbruch:** Wenn eine Produktentscheidung fehlt, das Issue zu groß ist oder du nach zwei ernsthaften Versuchen die Prüfungen nicht grün bekommst: Änderungen am Produktcode verwerfen (`git checkout -- apps packages`), `**Status:** needs-info` setzen, unter `## Comments` die konkrete Frage/den Blocker notieren, committen, beenden.

## Regeln

- Nur ein Issue pro Durchlauf. Kein Refactoring außerhalb des Issues.
- Niemals auf `main` pushen, keine Force-Pushes, keine Änderungen an `/Users/TMUNDIN/git/github.com/st-universe`.
- Keine Tests löschen oder abschwächen, um grün zu werden.
- Keine Secrets, keine externen Dienste.
