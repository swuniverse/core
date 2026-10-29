# Station demontieren

**Status:** needs-info
**Priority:** P3
**Size:** S
**Blocked by:** sc-WP-STAT-2

## Ziel

Wie in STU kann der Eigner eine unbemannte Station mit Bestätigungscode demontieren (`UNDER_SCRAPPING`); nach Ablauf erhält er einen Teil der Module ins Lager eines angedockten Schiffs bzw. die Station verschwindet. Allianzdepot-Zuordnungen werden gelöst.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Station/Action/Scrapping/Scrapping.php` (Code `substr(md5(name),0,6)`, unbemannt, Konstrukt sofort entfernt), `Module/Station/View/ShowScrapping`

## SWU-Pfade

- Stationsmodell, `apps/backend/src/modules/tick/tick.service.ts`
- `apps/frontend/src/components/spacecraft/SelfDestructPanel.tsx` (Code-Bestätigung als Vorbild)

## Akzeptanzkriterien

- [ ] Demontage nur unbemannt und mit korrektem Code; Zustand und Restdauer sichtbar.
- [ ] Abschluss im Tick: Rückgabe gemäß STU, Station gelöscht, angedockte Schiffe abgedockt, Allianzzuordnung gelöst.
- [ ] Backend-Tests, Frontend-Test.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Comments

- 2026-10-29: Blockiert nach zwei ernsthaften Verifikationsläufen. Die fokussierten Backend- und Frontend-Tests sowie alle Builds sind grün, aber der vorgeschriebene affected-Lauf scheitert weiterhin an bereits vorhandenen, issue-fremden Frontend-Typecheck- und Backend-/Frontend-Testfehlern. Produktänderungen wurden gemäß Ralph-Abbruchregel verworfen.
