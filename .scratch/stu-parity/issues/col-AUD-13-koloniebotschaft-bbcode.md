# Koloniebotschaft mit BBCode, Schiffsaktion als umgesetzt führen

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** —

## Ziel

Fremde sehen die Koloniebotschaft in SWU wie in STU, aber nur als reinen Text. STU wertet BBCode mit einem eigenen Regelsatz aus. In der Schiffsaktions-Registry steht die Aktion „Koloniebotschaft anzeigen“ noch als `planned`, obwohl sie umgesetzt ist.

## STU-Quellen

- `src/Module/Spacecraft/View/ShowColonyMessage/ShowColonyMessage.php` (Z. 46–55)
- `src/Component/Colony/ColonyMessageBbCodeParser.php`, `ColonyMessageBbCodeDefinitionSet.php`

## SWU-Pfade

- `apps/frontend/src/components/spacecraft/FieldContextPanel.tsx` (Dialog Z. 839–848)
- `apps/frontend/src/components/BbCodeText.tsx` (vorhandene BBCode-Darstellung)
- `apps/frontend/src/components/spacecraft/ship-action-registry.ts` (`colonyMessage`, Z. 268–275)
- `apps/frontend/src/pages/colonies/components/PanelSettings.tsx` (Eingabe der Botschaft, ggf. Hinweis auf BBCode)

## Akzeptanzkriterien

- [ ] Die Koloniebotschaft wird für Fremde mit `BbCodeText` dargestellt. Erlaubt sind die Tags, die STU `ColonyMessageBbCodeDefinitionSet` zulässt; andere bleiben als Text sichtbar. Es entsteht kein HTML-Injection-Risiko.
- [ ] Die Einstellungen zur Koloniebotschaft weisen auf die erlaubten BBCode-Tags hin.
- [ ] `colonyMessage` in `ship-action-registry.ts` hat den Status `existing`.
- [ ] Die „[translate]“-Übersetzung aus STU wird nicht übernommen (SWU hat keinen Übersetzungsdienst); das steht als Kommentar im Code oder unter Comments.
- [ ] Frontend-Tests: BBCode wird formatiert, Skript-Tags werden nicht ausgeführt, Registry-Status (bestehender Registry-Test angepasst).

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt H „Kolonie“ (Koloniebotschaft).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), kleine Abweichung „Koloniebotschaft für Fremde“, Unsicherheit Nr. 3.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt.
