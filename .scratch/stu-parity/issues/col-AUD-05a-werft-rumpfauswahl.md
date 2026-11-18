# Werft: Rumpfauswahl mit Bild, Zählern und deutschen Labels

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Die Rumpfkacheln der SWU-Werft zeigen kein Rumpfbild, keinen Typ, nicht „Im Einsatz“ und nicht die Zahl der Baupläne. Dafür stehen englische Labels („Hull/Shields/Cargo“, „No modules available“) in der UI. STU zeigt je Rumpf das Bild, „Typ“, die Zahl der eingesetzten Schiffe und die Zahl der Baupläne. Dieses Ticket gleicht die Rumpfauswahl an.

## STU-Quellen

- `src/html/colony/menu/shipyard.twig` (Z. ~15–30: Bild, „Typ“, Icon „Im Einsatz“, Icon „Baupläne“)
- `src/Module/Colony/Lib/Gui/Component/ShipyardProvider.php`
- `src/Module/Colony/Lib/BuildableRumpListItem.php`

## SWU-Pfade

- `apps/frontend/src/pages/colonies/components/PanelShipyard.tsx` (Rumpfkacheln Z. 1527–1536, „No modules available“ Z. 320)
- `apps/backend/src/modules/colony/colony-shipyard.service.ts` (baubare Rümpfe der Werft)
- vorhandene Rumpfbild-Komponente bzw. Asset-Pfad der Schiffsliste (wiederverwenden)

## Akzeptanzkriterien

- [ ] Jede Rumpfkachel zeigt das Rumpfbild, „Typ: <Kategorie>“ (deutsch), „Im Einsatz: n“ (eigene nicht zerstörte Schiffe dieses Rumpfs) und „Baupläne: n“ (eigene Baupläne dieses Rumpfs).
- [ ] Die Zahlen liefert das Backend gesammelt mit der Rumpfliste (keine Abfrage je Rumpf).
- [ ] Alle Labels sind deutsch: „Hülle“, „Schilde“, „Crew“, „Laderaum“, „Keine Module verfügbar“ usw. Im Panel bleibt kein englischer Text.
- [ ] Backend-Test für die Zähler.
- [ ] Frontend-Test `PanelShipyard.spec.tsx`: Bild, Typ, Zähler, deutsche Labels.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt C (Zeile „Modulfabrik / Werft“).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Seitenabgleich „Werft“ und „Modulbildschirm“, kleine Abweichung „Werft-Rumpfauswahl ohne Rumpfbild …“.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt. Die Baupläne stehen in col-AUD-05b.
