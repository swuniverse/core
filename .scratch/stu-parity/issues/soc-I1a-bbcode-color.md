# BBCode: `[color]` mit strenger Validierung

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

`BbCodeText` unterstützt wie STU `[color=…]…[/color]` in BBCode-Texten (HoloNet, Profil- und Charakterbeschreibung, Nachrichten, Allianzforum). Erlaubt sind nur Hex-Farben (`#rgb`, `#rrggbb`) und eine feste Liste benannter CSS-Farben; alles andere bleibt Literaltext. Spieler- und Allianznamen sind nicht betroffen (Namen bleiben reiner Text, siehe soc-I1c).

## STU-Quellen

- `src/Lib/StuBbCodeDefinitionSet.php` (`color` mit `CssColorValidator`)
- `src/Lib/StuBbCodeWithImageDefinitionSet.php`, `src/Component/Communication/Kn/KnBbCodeDefinitionSet.php`

## SWU-Pfade

- `apps/frontend/src/components/BbCodeText.tsx` (Tag-Union, Parser, `renderFrame`)
- `apps/frontend/src/components/BbCodeText.spec.tsx`

## Akzeptanzkriterien

- [x] `[color=#ff0000]x[/color]`, `[color=#f00]x[/color]` und `[color=red]x[/color]` rendern ein `<span>` mit inline `color`.
- [x] Ungültige Werte (`expression(...)`, `url(...)`, `red;background:...`, `rgb(...)`, leere Option) werden nicht als Stil übernommen, sondern als Literaltext ausgegeben; kein Stil-Injection-Vektor.
- [x] Verschachtelung mit anderen Tags und `[translate]` funktioniert; `[code]` bleibt unverarbeitet.
- [x] Frontend-Tests für gültige, ungültige und verschachtelte Fälle.

## Comments

- 2026-11-04: Implementiert und geprüft. Direkter Vitest-Lauf für `BbCodeText.spec.tsx` grün (13 Tests), TypeScript-Checks für Shared und Frontend grün, ESLint ohne Fehler (zwei bestehende Non-null-Assertion-Warnungen in `BbCodeText.tsx`). Nx-Testziel unter npm blockiert durch pnpm-Lockfile/fehlendes `node_modules/.modules.yaml`; direkter Vitest-Aufruf verwendet. `git diff --check` sauber.
