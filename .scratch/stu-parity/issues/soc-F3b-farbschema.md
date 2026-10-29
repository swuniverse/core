# Wählbares Interface-Farbschema

**Status:** claimed
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
