# Hyperantriebs-Booster (Pendant zum STU-Warpantrieb-Boost)

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

STU lädt mit dem Spezialsystem „Warpantrieb-Booster“ sofort ein Drittel der maximalen Warpantriebsladung nach und deaktiviert das System danach. SWU erhält ein Star-Wars-Pendant für den Hyperantrieb (Name wählt der Agent nach Leitplanke 2 und dokumentiert ihn unter „Entscheidungen“ in `map.md`).

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Spacecraft/Action/WarpdriveBoost/WarpdriveBoost.php` (`+round(max/3)`, gedeckelt auf Max, danach Deaktivierung mit Cooldown)
- `Component/Spacecraft/System/Type/WarpdriveBoosterShipSystem.php`, `html/spacecraft/system/WARPDRIVE_BOOSTER.twig`

## SWU-Pfade

- `packages/shared/src/lib/spacecraft/index.ts` (`SPACECRAFT_RUNTIME_SYSTEM_KEYS`)
- `apps/backend/src/modules/spacecraft/spacecraft-runtime-state.service.ts` (`getRuntimeSystemsForModule`)
- `apps/backend/src/modules/spacecraft/spacecraft-engineering.service.ts`, `spacecraft.controller.ts`
- `game-data/data/modules/special.yaml`, `game-data/data/fabrication/stu-fabrication.yaml` (Submodul, eigener Commit)
- `apps/frontend/src/components/spacecraft/ShipControlCenter.tsx`, `ReactorPanel.tsx`

## Akzeptanzkriterien

- [x] SW-Name `Hyperantriebs-Notladegerät` und Moduldefinition (Kategorie SPECIAL, Forschung, Kosten) in `game-data`; Entscheidung in `map.md` festgehalten.
- [x] Neuer Laufzeitsystem-Schlüssel, nur bei verbautem Modul vorhanden. Das System betrifft ausschließlich die Hyperantriebspunkte des normalen feldweisen Galaxieflugs und hat keinen Einfluss auf den `Navicomputer-Sprung` aus `sc-WP-NAV-5b`.
- [x] Einzelne-Schiff-Aktion „Notladung auslösen“ kostet 100 EPS und erhöht die Hyperantriebspunkte um `round(max/3)`, gedeckelt auf das Maximum. Anschließend deaktiviert sich das System sofort und erhält 24 Stunden Cooldown; die tatsächlich geladene Menge wird gemeldet.
- [x] Abgelehnt bei Cooldown, zerstörtem System oder fehlender Crew.
- [x] Backend-Tests für Regel und Ablehnung; Frontend-Test für den Knopf.
- [x] Relevante Backend-, Frontend- und Spieldaten-Tests sind grün.

## Entscheidung

Das `Hyperantriebs-Notladegerät` übernimmt die STU-Regel für ein einzelnes Schiff: 100 EPS erzeugen sofort `round(warpdriveMax / 3)` Hyperantriebspunkte, gedeckelt auf das Maximum; danach deaktiviert sich das System mit 24 Stunden Cooldown. Es lädt ausschließlich den Vorrat für den normalen feldweisen Galaxieflug und beeinflusst weder Kosten noch Cooldown des `Navicomputer-Sprungs`.

## Comments

- 2026-10-28: Umsetzung nach zwei Prüfversuchen abgebrochen und Produktcode verworfen. Backend- und Frontend-Tests sowie alle Builds waren grün, aber die vorgeschriebene Prüfung `npx nx affected -t lint typecheck test --base=HEAD` scheitert reproduzierbar in `backend:typecheck` und `frontend:typecheck` an zahlreichen vorhandenen TS6305-Fehlern (fehlende `dist/**/*.d.ts`-Buildausgaben), auch nach expliziten Backend-, Frontend- und Gesamt-Builds. Bitte den Typecheck-Buildzustand bzw. das Prüfverfahren klären.
- 2026-10-30 Product Owner: Option 1. `Hyperantriebs-Notladegerät` als Einzel-Schiff-System nach STU: Aktivierung kostet 100 EPS, lädt gerundet ein Drittel der maximalen Hyperantriebspunkte bis höchstens zum Maximum, deaktiviert sich sofort und erhält 24 Stunden Cooldown. Es gilt nur für die Ladung des normalen Galaxieflugs und hat keinerlei Auswirkung auf `sc-WP-NAV-5b`. Die historischen TS6305-Probleme sind durch die inzwischen reparierte Typecheck-Baseline kein stehender Blocker oder Ausnahmegrund.
- 2026-11-02: Added the `Hyperantriebs-Notladegerät` runtime system, EPS-funded booster action, cooldown validation, frontend control, and data definitions. Backend/frontend typechecks pass; Jest could not start because the repository Nx Jest config throws `TypeError: yargs is not a function`.
- 2026-11-03 Audit: Testfixture und Cooldown-Reihenfolge korrigiert; die Spieldaten erhielten eine eindeutige Waren-ID für das Fertigungsrezept. `npx nx test backend -- spacecraft-engineering.service.spec.ts --runInBand` (9/9), `npx nx test frontend -- ShipControlCenter.spec.tsx --run` (7/7) und `npx nx test backend -- game-data.service.spec.ts --runInBand` (40/40) sind grün.
