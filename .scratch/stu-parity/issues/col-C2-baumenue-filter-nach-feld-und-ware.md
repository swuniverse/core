# Baumenü-Filter nach Feld und Ware

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Öffnet der Spieler in STU das Baumenü aus einem Feld, zeigt es nur Gebäude, die auf diesem Feldtyp baubar sind. Außerdem lässt sich das Baumenü über „Baumenü nach 'X' filtern“ auf Gebäude einschränken, die eine bestimmte Ware produzieren. SWU hebt nur umgekehrt passende Felder für ein gewähltes Gebäude hervor.

## STU-Quellen

- `src/Module/Colony/Lib/Gui/Component/BuildmenuProvider.php` (Parameter `fieldType`, `cid`)
- `src/html/colony/component/fieldAction.twig` (Z. ~214/270, Link „Baumenü nach '…' filtern“)
- `src/Module/Colony/View/ShowBuildMenuPart/`

## SWU-Pfade

- `apps/frontend/src/pages/colonies/components/PanelBuild.tsx` (+ `.spec.tsx`)
- `apps/frontend/src/pages/colonies/components/ColonyFieldDialog.tsx` („Baumenü öffnen“)
- `apps/frontend/src/pages/colonies/ColoniesPage.tsx` (`highlightedFields`, Panel-Zustand)
- `apps/frontend/src/pages/colonies/components/BuildInspector.tsx` (Produktionsanzeige)

## Akzeptanzkriterien

- [x] „Baumenü öffnen“ aus einem Feld setzt einen Feldfilter; das Baumenü zeigt nur auf diesem Feldtyp baubare Gebäude und einen sichtbaren, entfernbaren Filterhinweis („Feld 12: Wüste ×“).
- [x] In der Produktionsanzeige eines Gebäudes bzw. Felds führt ein Link „Baumenü nach '<Ware>' filtern“ zu einem Baumenü, das nur Gebäude zeigt, die diese Ware produzieren.
- [x] Beide Filter sind kombinierbar und werden beim Schließen bzw. per Klick auf ✕ zurückgesetzt.
- [x] Frontend-Tests: Feldfilter, Warenfilter, Kombination, Zurücksetzen.

## Comments

- Feld- und Warenfilter im React-Baumenü ergänzt; Feldaktionen und Produktionswaren öffnen den gefilterten Build-Workspace. Kombinierte Filter und separates Zurücksetzen sind in `PanelBuild.spec.tsx` abgedeckt. Keine offenen Folgepunkte.
