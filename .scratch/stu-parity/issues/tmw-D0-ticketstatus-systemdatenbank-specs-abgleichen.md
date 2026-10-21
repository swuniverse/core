# Ticketstatus der Systemdatenbank-Specs abgleichen

**Status:** ready-for-agent
**Priority:** P1
**Size:** S
**Blocked by:** —

## Ziel

Die Issues der Specs `stu-systemdatenbank-und-kolonie-scans` (01–08) und `grafischer-systemeintrag-nach-astrometrie` (01–03) stehen noch auf `ready-for-agent`, sind laut Code und Commits aber weitgehend umgesetzt. Jedes dieser Issues wird gegen Code und Tests geprüft. Erfüllte Issues werden auf `resolved` gesetzt, Restlücken werden dokumentiert. Danach kann niemand mehr versehentlich bereits umgesetzte Arbeit erneut aufnehmen.

## STU-Quellen

- keine (reine Abgleichsaufgabe)

## SWU-Pfade

- `.scratch/stu-systemdatenbank-und-kolonie-scans/spec.md`, `.scratch/stu-systemdatenbank-und-kolonie-scans/issues/01-…08-*.md`
- `.scratch/grafischer-systemeintrag-nach-astrometrie/spec.md`, `.scratch/grafischer-systemeintrag-nach-astrometrie/issues/01-…03-*.md`
- Code zur Prüfung, unter anderem:
  - `apps/backend/src/modules/database/database.service.ts` und `database.controller.ts` (`GET database/systems[/:id]`)
  - `apps/backend/src/modules/database/database-system-catalog.service.spec.ts`, `database-system-detail.service.spec.ts`, `database-settler-scans.service.spec.ts`
  - `apps/backend/src/modules/spacecraft/cartography-plan.service.ts`, `colony-scan-projection.service.ts`, `entities/colony-scan.entity.ts`
  - `apps/frontend/src/pages/database.tsx` (`DatabaseSystemDetailPage`)
  - `apps/frontend/src/components/database/SystemRasterMap.tsx`, `ColonyScans.tsx`
  - `apps/frontend/src/pages/colony-scans.tsx`, `apps/frontend/src/pages/player-profile.tsx`
  - Commits `b496498`, `d118865` sowie die Kartographie-Tickets in `.scratch/stu-messpunkt-systemkartographie` (alle `resolved`)
  - `docs/adr/0002-*.md`, `docs/adr/0003-*.md`

## Akzeptanzkriterien

- [ ] Für jedes der elf Issues ist jedes Akzeptanzkriterium gegen Code und Tests geprüft: per CodeGraph (`codegraph explore`), Lesen der Tests und `git log`.
- [ ] Ist ein Issue vollständig erfüllt, steht dort `**Status:** resolved`, die Checkboxen sind abgehakt, und ein `## Comments`-Eintrag nennt Belegdateien, Testdateien und Commit-Hashes.
- [ ] Ist ein Issue nur teilweise erfüllt, bleibt sein Status unverändert. Ein `## Comments`-Eintrag listet die offenen Kriterien konkret auf. Zusätzlich gibt es für die Restlücke ein neues Issue `tmw-D0a-<slug>.md` (fortlaufend `D0b`, `D0c` …) in `.scratch/stu-parity/issues/` mit `**Status:** needs-triage`.
- [ ] Es wird kein Produktcode geändert. Geändert werden nur Status-Zeilen, Checkboxen und Kommentare in den beiden Spec-Verzeichnissen sowie ggf. neue Restlücken-Issues.
- [ ] Die betroffenen Backend- und Frontend-Tests (`npx nx test backend`, `npx nx test frontend`) laufen grün. Das belegt, dass die als `resolved` markierten Kriterien abgedeckt sind. Fehlschläge werden als Restlücke behandelt.
- [ ] Die Zeile zu `stu-systemdatenbank-…`/`grafischer-systemeintrag-…` in `inventory/trade-map-world.md` muss nicht angepasst werden. Das Ergebnis steht unter „Erledigt“ in `map.md`.

## Comments
