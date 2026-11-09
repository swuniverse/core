# Wählbares Interface-Farbschema

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

STU bietet mit `CSS_COLOR_SHEET` mehrere Farbschemata der Oberfläche. SWU hat ein eigenes Design-Token-System (`apps/frontend/src/styles.css`). Ob wählbare Schemata übernommen werden, ist eine Designentscheidung (auch in sh-AP-16 als Folgepaket offen).

## STU-Quellen

- `src/Component/Player/UserCssClassEnum.php`
- `src/Module/PlayerSetting/Lib/UserSettingEnum.php` (`CSS_COLOR_SHEET`)
- `src/Public/static/css/stu.css`, `schwarz.css`

## SWU-Pfade

- `apps/frontend/src/styles.css` (Tokens `--color-swu-*`)
- `apps/backend/src/modules/settings/settings.service.ts`
- `apps/frontend/src/pages/settings.tsx`, `apps/frontend/src/components/layout/app-shell.tsx`

## Akzeptanzkriterien

- [ ] Einstellung `css_color_sheet` mit Allowlist (z. B. `default`, `contrast`, `faction`), Default `default`.
- [ ] Schemata als Token-Overrides der `--color-swu-*`-Tokens (z. B. `data-theme` am Root); keine komponentenspezifischen Sonderfarben.
- [ ] Auswahl in den Einstellungen, sofort wirksam und persistiert.
- [ ] Frontend-Test für das Umschalten; Backend-Test für die Allowlist.

## Entscheidung

Vorgabe: Variante (a). Zwei bis drei Schemata (Standard, Kontrast/Hell, Imperial/Rebellen-Akzent) als Token-Overrides über `data-theme` am Root; Auswahl in den Einstellungen.

## Comments

- 2026-10-21 Product Owner: Option a – SWU erhält zwei bis drei wählbare Farbschemata (Standard, Kontrast/Hell, Imperial/Rebellen-Akzent) als Token-Overrides.
- 2026-10-29 Agent: Umsetzung und fokussierte Tests sind grün, aber die vorgeschriebene Gesamtsuite scheitert nach zwei ernsthaften Versuchen an bereits vorhandenen, issuefremden Fehlern: `frontend:typecheck` (u. a. `database.tsx:1015` Faction-Typ sowie zahlreiche TS6305-Ausgabefehler) und `backend:test` (`database-settler-scans.service.spec.ts`, fehlender `profileVisitService.registerVisit`). Produktcode wurde gemäß Abbruchregel verworfen; bitte die Baseline-Prüfungen reparieren und das Issue erneut freigeben.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Frontend-Typecheck und profileVisitService-Fixture); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
