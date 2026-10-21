# Gemeinsame Tooltip-Komponente im STU-Verhalten

**Status:** ready-for-agent
**Priority:** P1
**Size:** S
**Blocked by:** —

## Ziel

SWU bekommt eine gemeinsame `<Tooltip>`-Komponente, die sich wie die STU-Tippy-Tooltips verhält: sofort ohne Verzögerung und Animation, dem Cursor folgend, immer nur einer gleichzeitig, Inhalt als kleine Tabelle mit Titelzeile, auf Touch per Tap. Viele UI-Issues anderer Bereiche (z. B. sc-WP-UI-1b, sc-WP-UI-2, sh-AP-15c) bauen darauf auf; bis dahin gilt laut UI-Konventionen 3.7 ein Verbot neuer Ad-hoc-Hover-Panels.

## STU-Quellen

- `src/Public/static/js/default.js#initTooltips` (Tippy: `followCursor`, `placement: bottom`, Offset 20 px, `delay:[0,0]`, `duration:[0,0]`, `allowHTML`)
- `src/Public/static/css/stu.css` (`.tippy-box[data-theme~="light-border"]`, transparent, `pointer-events:none`)
- `src/html/game/component/coloniesComponent.twig` (Beispielinhalt `table.tcal` mit `<th>`-Titel)

## SWU-Pfade

- neu: `apps/frontend/src/components/Tooltip.tsx` (+ `Tooltip.spec.tsx`)
- `apps/frontend/src/components/layout/app-shell.tsx` (ggf. Portal-Root/Provider)
- Referenz für Tabellenstil: `inventory/shell-admin-runtime.md` Abschnitt 3.4 und 3.7

## Akzeptanzkriterien

- [ ] API: `<Tooltip content={ReactNode} title?={string}>{children}</Tooltip>` sowie eine Hilfskomponente `TooltipTable` (Titelzeile `th`, Zeilen mit Label/Wert, Stil nach 3.4: `border-swu-border`, `text-xs`, `bg-swu-surface`).
- [ ] Desktop: erscheint beim Hovern sofort, folgt dem Cursor mit ca. 20 px Abstand unterhalb, verschwindet beim Verlassen; kein Fade, keine Verzögerung; `pointer-events: none` am Panel.
- [ ] Es ist global immer höchstens ein Tooltip offen (gemeinsamer Store/Context).
- [ ] Touch: erster Tap öffnet (Position am Element), zweiter Tap auf dasselbe Element führt die normale Aktion aus (z. B. Link), Tap außerhalb schließt.
- [ ] Rendert per Portal in `document.body` mit z-Index über Header (`z-50`) und Dialogen; bleibt im Viewport (Flip/Clamp am Rand).
- [ ] Barrierefreiheit: Fokus per Tastatur zeigt den Tooltip am Element, `aria-describedby` verweist auf den Inhalt; `Escape` schließt.
- [ ] Keine neue Abhängigkeit nötig; falls doch, nur eine kleine, gepflegte Bibliothek mit Begründung im Commit.
- [ ] Frontend-Tests: Anzeigen/Ausblenden bei Hover, nur ein Tooltip gleichzeitig, Tap-Verhalten, Escape, Inhalt mit Titelzeile.

## Comments
