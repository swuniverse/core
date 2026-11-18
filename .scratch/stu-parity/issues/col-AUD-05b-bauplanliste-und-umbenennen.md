# Baupläne: eigene Liste mit Schiffsanzahl, Bauzeit, Modulen und Umbenennen

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

col-A4 ist resolved, aber Baupläne lassen sich in SWU nicht umbenennen. Endpunkt und Callback existieren, der State `renamingBuildplanId`/`startRenameBuildplan` wird jedoch nie gerendert. Die Bauplanliste zeigt außerdem weder die Zahl der gebauten Schiffe noch Bauzeit, Module oder Crewbedarf. STU hat dafür einen eigenen Tab: Name, Anzahl Schiffe, Bauzeit, „Bauplan auswählen“, Löschen nur wenn erlaubt und ein Detail mit Rumpf, Modulsymbolen, Crewbedarf und „noch n mal baubar“. Im Modulbildschirm gibt es „Name ändern“.

## STU-Quellen

- `src/html/colony/menu/shipBuildplans.twig`
- `src/Module/Colony/Lib/Gui/Component/SpacecraftBuildplansProvider.php`
- `src/Module/Colony/View/ShowBuildPlans/`
- `src/Module/Colony/Action/RenameBuildplan/RenameBuildplan.php`
- `src/html/ship/construction/moduleScreen.twig` („Name ändern“)

## SWU-Pfade

- `apps/frontend/src/pages/colonies/components/PanelShipyard.tsx` („Baupläne dieser Werft“ Z. 1407–1495; toter State Z. 794/962; `onRenameBuildplan`)
- `apps/backend/src/modules/colony/colony.controller.ts` (`PATCH :id/buildplans/:planId` Z. 750, `DELETE` Z. 765, `build` Z. 774)
- `apps/backend/src/modules/colony/colony-shipyard.service.ts`, `entities/colony-ship-buildplan.entity.ts`

## Akzeptanzkriterien

- [ ] Ein Bauplan lässt sich in der Bauplanliste und im Bauplan-Editor umbenennen (Eingabefeld, Speichern, Abbrechen). Die Validierungsfehler aus col-A4 (leer, zu lang, doppelt) erscheinen auf Deutsch. Der tote State ist entweder benutzt oder entfernt.
- [ ] Die Bauplanliste zeigt je Bauplan Name, Rumpf, Zahl der Schiffe mit diesem Bauplan, Bauzeit, Crewbedarf und die Module (Symbol oder Name je Slot).
- [ ] Wie bisher: Bauplan auswählen/bearbeiten, direkt bauen, Löschen nur wenn erlaubt (Sperre aus col-A4).
- [ ] Das Backend liefert Schiffsanzahl, Bauzeit und Crewbedarf je Bauplan gesammelt.
- [ ] Backend-Test: Schiffsanzahl und Bauzeit im Listen-DTO.
- [ ] Frontend-Tests `PanelShipyard.spec.tsx`: Umbenennen (Erfolg und Fehler), Listenspalten, Löschsperre.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt A (Zeile „Bauplan umbenennen“) und Abschnitt D (col-A4).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Seitenabgleich „Baupläne“, kleine Abweichung „Baupläne: kein Umbenennen in der UI“.
- col-A4 (resolved): Das Backend ist gehärtet, die Rename-UI fehlt. Dieses Ticket erfüllt den offenen Teil.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt. Die Rumpfauswahl steht in col-AUD-05a; beide ändern `PanelShipyard.tsx`.
