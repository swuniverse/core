# Allianzdepot zuordnen und lösen

**Status:** claimed
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
