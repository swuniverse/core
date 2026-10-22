# Design-Tokens, Spieltabellen-Stil, Zahlenformatierung und Textkorrekturen

**Status:** resolved
**Priority:** P1
**Size:** S
**Blocked by:** —

## Ziel

Die globalen UI-Konventionen (Inventur Abschnitt 3) bekommen ihre technische Basis: Header auf das vorhandene Token, Positiv/Negativ-Tokens für Bilanzen, eine wiederverwendbare Spieltabellen-Utility, zentrale Zahlenformatierer und das Entfernen von Emoji und Umlaut-Umschreibungen. Viele Fachissues verwenden diese Bausteine.

## STU-Quellen

- `src/Public/static/css/stu.css`, `schwarz.css` (`.positive`, `.negative`, `table.tcal`)
- `src/Module/Template/TemplateHelper.php` (`addPlusCharacter`, Färbung)
- `src/Module/Twig/TwigHelper.php` (`numberWithThousandSeperator`)

## SWU-Pfade

- `apps/frontend/src/styles.css` (`--color-swu-header` existiert bereits)
- `apps/frontend/src/components/layout/header.tsx` (Z. 123: `bg-[#0d0e1b]`)
- `apps/frontend/src/lib/format.ts`
- `apps/frontend/src/pages/dashboard/DashboardFleet.tsx` (Emoji 🔴🟡🟢)
- `apps/frontend/src/pages/settings.tsx` („Passwort aendern“, „E-Mail aendern“, „Konto loeschen“, „Endgueltig loeschen“), `apps/frontend/src/pages/login.tsx` („Brucke“), `apps/frontend/src/pages/admin.tsx`

## Akzeptanzkriterien

- [x] Header nutzt `bg-swu-header` statt des Hex-Werts.
- [x] Neue Tokens `--color-swu-positive` (grün) und `--color-swu-negative` (rot) in `styles.css`, nutzbar als `text-swu-positive`/`text-swu-negative`.
- [x] Spieltabellen-Utility nach 3.4 (z. B. CSS-Klassen `swu-table`, oder Komponente `GameTable`): `w-full border-collapse text-xs`, Zellen `border border-swu-border px-1.5 py-1`, Kopf `bg-black/40 font-bold text-swu-primary text-center`, Zeilen `hover:bg-white/5`, Zahlenzellen `font-mono text-right`, keine Zebrastreifen; ein bestehender Tisch (z. B. Maindesk-Limits) wird als Referenz umgestellt.
- [x] `formatNumber(n)` (de-DE, Tausenderpunkt) und `formatDelta(n)` (mit `+` bei positiven Werten, `0` ohne Vorzeichen) sowie eine kleine Komponente `<Delta value>` mit Positiv/Negativ-Farbe in `lib/format.ts` bzw. `components/`.
- [x] `DashboardFleet.tsx` zeigt Alarmstufen als Statuspunkte (`size-1.5 rounded-full`, rot/gelb/grün über Tokens) mit `title`; kein Emoji mehr im Frontend (Suche nach den drei Zeichen ist leer).
- [x] Umlaute in `settings.tsx`, `login.tsx` und `admin.tsx` korrigiert (Suche nach `aendern`, `loeschen`, `Endgueltig`, `Brucke` in `apps/frontend/src` ist leer, außer in Bezeichnern).
- [x] Frontend-Tests: `formatNumber`, `formatDelta`, `<Delta>`-Farbe; bestehende Tests mit angepassten Texten grün.

## Comments

Header-, Bilanz- und Tabellen-Tokens sowie zentrale Zahlen-/Deltaformatierung ergänzt; Maindesk-Limits auf die gemeinsame Spieltabelle umgestellt, Flottenalarme als zugängliche Statuspunkte umgesetzt und deutsche UI-Texte korrigiert. Formatter-, Komponenten- und Dashboardtests sowie betroffene Nx-Prüfungen und alle Builds sind grün.
