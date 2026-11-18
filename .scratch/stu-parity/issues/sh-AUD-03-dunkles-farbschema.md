# Dunkles Farbschema entwerfen und auswählbar machen

**Status:** ready-for-human
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

SWU bietet drei Farbschemata (`default`, `contrast`, `faction`) als Token-Overrides (soc-F3b). Der Product Owner hat am 2026-11-17 entschieden, zusätzlich **ein dunkles Schema** zu entwerfen. Es ist ein SWU-eigenes Design, keine Übernahme eines STU-Stylesheets. STU-Sheets wie `schwarz.css` dürfen als Anregung dienen.

Der Entwurf (Palette für alle `--color-swu-*`-Tokens) ist Aufgabe eines Menschen (Design). Danach ist die Einbindung eine kleine Agentenaufgabe.

## STU-Quellen

- `src/Public/static/css/schwarz.css`, `src/Public/static/css/stu.css` (nur Anregung)

## SWU-Pfade

- `apps/frontend/src/styles.css` (Tokens `--color-swu-*`, Overrides `:root[data-theme='…']`)
- `packages/shared/src/lib/auth/index.ts` (`INTERFACE_COLOR_SCHEMES`)
- `apps/frontend/src/hooks/use-interface-theme.ts`
- `apps/backend/src/modules/settings/settings.service.ts` (Allowlist `css_color_sheet`)
- `apps/frontend/src/pages/settings.tsx` (Auswahl)

## Akzeptanzkriterien

- [ ] Design: Palette für alle `--color-swu-*`-Tokens des dunklen Schemas liegt vor (Hintergrund, Flächen, Rahmen, Text primär/gedämpft, Akzent, Warnung/Fehler/Erfolg). Kontrast Text/Hintergrund mindestens WCAG AA.
- [ ] Neuer Schemawert (z. B. `dark`) in `INTERFACE_COLOR_SCHEMES` und in der Backend-Allowlist.
- [ ] Override `:root[data-theme='dark']` in `styles.css`, nur über Tokens, keine komponentenspezifischen Sonderfarben.
- [ ] Auswahl in den Einstellungen mit deutschem Label, sofort wirksam und gespeichert.
- [ ] Sichtprüfung auf Maindesk, Kolonie, Schiffsdetail, Sternenkarte und Handel; Screenshots im Ticket.
- [ ] Backend-Test: Allowlist akzeptiert den neuen Wert. Frontend-Test: Umschalten setzt `data-theme`.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt G (Zeile „Farbschemata: drei SWU-Schemata statt STU-CSS“) und Abschnitt N1 („Ein dunkles Farbschema wird neu entworfen“).
- [`../audit-2026-11-17/shell-admin-runtime.md`](../audit-2026-11-17/shell-admin-runtime.md), „Bewusste/entschiedene Abweichungen“ (Farbschemata).
- PO-Entscheidung 2026-11-17: dunkles Schema entwerfen und auswählbar machen. Ergänzt `map.md`-Entscheidung soc-F3b (Option a), ersetzt sie nicht.

## Comments
