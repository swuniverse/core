# Kolonieliste: Warenverbrauch, Terraforming, Modulproduktion, Aktivierungshinweis

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

Unter der Kolonieliste zeigt STU Waren mit negativer Bilanz samt Reichweite „(x Runden)“, die laufenden Terraformingvorgänge und die laufende Modulproduktion aller Kolonien. Bei Bauvorgängen steht, ob das Gebäude nach dem Bau aktiviert wird. In SWU fehlt das alles. Engpässe sieht man nur, wenn man jede Kolonie einzeln öffnet. Dieses Ticket ergänzt die Blöcke.

## STU-Quellen

- `src/html/view/colonylist.twig` (Warenverbrauch je Kolonie; `TERRAFORMING_LIST` Z. 122–150; `BUILDINGJOB_LIST`; `MODULE_LIST` Z. 182–200)
- `src/Module/Game/Lib/View/Provider/ColonyListProvider.php`
- `src/Module/Colony/Lib/ColonyListItem.php` (`getCommodityUseView`)
- `src/Module/Colony/Lib/CommodityConsumption.php`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony.service.ts` `findAllByUser` (Z. 202)
- `apps/backend/src/modules/colony/colony-stats.service.ts` (Warenbilanz)
- `apps/backend/src/modules/colony/entities/colony-fabrication-queue.entity.ts`, `colony-fabrication.service.ts` (Modulqueue)
- `apps/backend/src/modules/colony/entities/colony-field.entity.ts` (`terraformingId`, `terraformingFinishesAt`, `activateAfterBuild`)
- `apps/frontend/src/pages/colonies/components/ColonyOverview.tsx` (Bauvorgänge Z. 213–262), `apps/frontend/src/pages/colonies/types.ts`

## Akzeptanzkriterien

- [ ] Je Kolonie listet die Übersicht die Waren mit negativer Bilanz: Ware, Verbrauch je Tick und „(x Runden)“ = `floor(Lagerbestand / |Bilanz|)` wie STU `CommodityConsumption`.
- [ ] Block „Aktuelle Terraformingvorgänge“: Kolonie, Feld, Vorgang, Fertigstellung, Fortschritt. Er fehlt, wenn nichts läuft.
- [ ] Block „Modulproduktion“: Kolonie, Modul, Menge, Fertigstellung. Er fehlt, wenn nichts läuft.
- [ ] Bauvorgänge zeigen „wird nach dem Bau aktiviert“ bzw. „deaktiviert“ anhand von `activateAfterBuild`.
- [ ] Die Daten werden gesammelt für alle Kolonien des Spielers geladen (keine N+1-Abfragen).
- [ ] Backend-Test: Reichweitenberechnung (inkl. Bestand 0 und positiver Bilanz), Terraforming- und Modulliste.
- [ ] Frontend-Test `ColonyOverview.spec.tsx`: alle drei Blöcke und der Aktivierungshinweis, leere Blöcke ausgeblendet.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt C (Zeile „Kolonieliste“).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Seitenabgleich „Kolonieliste“, Große Abweichung Nr. 2, kleine Abweichung „Kolonieliste: Bauvorgänge ohne (de)aktiviert“.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt. Die echten Werte (Signaturen, Verteidigung, Wachstum) stehen in col-AUD-02a.
