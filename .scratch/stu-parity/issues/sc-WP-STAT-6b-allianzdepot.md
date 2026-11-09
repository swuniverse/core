# Allianzdepot zuordnen und lösen

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** sc-WP-STAT-2

## Ziel

Umsetzung des Integrationsvertrags „Allianzdepots“: Der Eigner ordnet eine geeignete Depotstation seiner Allianz zu oder löst sie; Präsident und Vize sehen Besitzer, Standort und Bestand. Eigentum und Entnahmerechte ändern sich nicht.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Station/Action/{AddToAlliance,DeleteFromAlliance}`

## SWU-Pfade

- `.scratch/alliance-stu-parity/allianz-infrastruktur-spec.md` (Integrationsvertrag Allianzdepots, Bereinigung)
- `apps/backend/src/modules/alliance/alliance-context-cleanup.ts`, Allianzverwaltung im Frontend (`pages/alliances.tsx`)
- `CONTEXT.md` (**Allianzdepot**)

## Akzeptanzkriterien

- [ ] Nur der Eigner ordnet eine Station mit Depotrolle zu; ungeeignete Stationen erzeugen einen Fehler (kein Erfolg, STU-Bug nicht übernehmen).
- [ ] Austritt, Rauswurf, Demontage und Allianzauflösung lösen die Zuordnung gemäß Vertrag.
- [ ] Verwaltung zeigt Präsident/Vize alle Depots mit Besitzer, Standort und Bestand.
- [ ] Backend-Tests je Bereinigungsfall, Frontend-Test.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-10-29: Blockiert nach zwei ernsthaften Verifikationsläufen. Der Produktpfad mit Zuordnung, Cleanup-Consumer, Verwaltungsansicht und Migration ließ sich bauen; der Frontend-Test wurde grün. Der vorgeschriebene Backend-Testlauf scheitert jedoch bereits beim Laden bestehender STU-Entities an `ReferenceError: Cannot access 'StarSystem' before initialization`, und der Frontend-Typecheck scheitert an bereits vorhandenen issue-fremden Fehlern (`database.tsx`-Faction-Typ sowie zahlreiche TS6305-Artefakte). Produktänderungen wurden gemäß Ralph-Abbruchregel verworfen.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Entity-Initialisierung und Frontend-Typecheck); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
