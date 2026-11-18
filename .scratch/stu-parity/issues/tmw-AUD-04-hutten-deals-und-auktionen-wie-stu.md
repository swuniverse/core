# Hutten-Deals und Auktionen wie STU deals.twig

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

`TradeDealsTab` zeigt Deals und Auktionen als Text („Schiff: Name (Klasse)“). STU zeigt Schiffs- und Bauplanangebote mit Rumpfbild, Modulicons und benötigter Crew, nennt bei Auktionen den Höchstbietenden und listet beendete Auktionen für alle Spieler. Ergänzt werden:

- **Deals und Auktionen nach Typ getrennt** wie STU: Waren, Schiffe, Baupläne, jeweils gegen Ware bzw. gegen Prestige.
- **Schiffs-/Bauplaneinträge** mit Rumpfbild, Modulicons des Bauplans (mit Namen als Tooltip) und benötigter Crew.
- **Auktionen** mit „Höchstgebot“ und „Höchstbietender“ (Name, verlinkt auf das Profil) und Ende. Der eigene Maximalgebotshinweis bleibt.
- **Beendete Auktionen** für alle Spieler: Angebot, Endpreis, Höchstbietender, Enddatum (STU `HASENDEDAUCTIONS`). „Gewonnene Auktionen“ (eigenes Abholen) bleibt bestehen.

## STU-Quellen

- `src/html/trade/deals.twig` (Rumpfbild Z. 132, Module Z. 134, Crew Z. 139; „Höchstbietender“ Z. 265; beendete Auktionen)
- `src/Module/Trade/View/ShowDeals/ShowDeals.php` (Template-Variablen `ACTIVEDEALS*`, `ACTIVEAUCTIONS*`, `OWNENDEDAUCTIONS*`, `HASENDEDAUCTIONS`)
- `src/Module/Trade/Action/DealsBidAuction/`, `DealsTakeAuction/`

## SWU-Pfade

- `packages/shared/src/lib/trade/index.ts` (`TradeDealDto` Z. 307, `TradeAuctionDto` Z. 340, `TradeDealsDto`)
- `apps/backend/src/modules/trade/trade-deal.service.ts` (Übersicht, `wonAuctions`), `trade-auction.service.ts`, `trade-deal.controller.ts`
- `apps/backend/src/modules/trade/entities/trade-deal.entity.ts` (`auctionUserId`, `endsAt`), `trade-auction-bid.entity.ts`
- Bauplan-/Moduldaten: `apps/backend/src/modules/shipbuilding/`, `apps/backend/src/modules/game-data/game-data.service.ts`
- `apps/frontend/src/components/trade/TradeDealsTab.tsx`, `apps/frontend/src/lib/assets.ts` (`shipImage`)
- Tests: `apps/frontend/src/components/trade/TradeDealsTab.spec.tsx`, Backend-Tests zum Deal-Service

## Akzeptanzkriterien

- [ ] `TradeDealDto`/`TradeAuctionDto` liefern für Schiffs- und Bauplanangebote Rumpf-Id/-Key, Module (Id, Name, Typ) und Crewbedarf.
- [ ] `TradeAuctionDto` liefert Höchstgebot und Höchstbietenden (Id, Name) für alle Spieler; das Maximalgebot anderer Spieler bleibt geheim.
- [ ] Neue Liste beendeter Auktionen (z. B. letzte 30 Tage oder letzte n, Wert im Kommentar festhalten) mit Höchstbietendem und Enddatum, sichtbar für alle Spieler mit Lizenz am Hutten-Posten.
- [ ] Die Oberfläche trennt nach Typ und Währung und zeigt Bild, Module und Crew.
- [ ] Backend-Tests: Höchstbietender sichtbar, fremdes Maximalgebot nicht; beendete Auktionen enthalten Name und Enddatum. Frontend-Tests: Schiffsdeal mit Bild/Modulen/Crew, Auktion mit Höchstbietendem, Liste beendeter Auktionen.

## Herkunft

- Audit: [README.md](../audit-2026-11-17/README.md) Abschnitt C „Hutten-Deals / Auktionen“; [trade-map-world.md](../audit-2026-11-17/trade-map-world.md) „Große Abweichungen 4“.
- tmw-T8a und tmw-T8b sind `resolved`; tmw-T8b nennt „Höchstbietender“ als Datenbankfeld, die UI zeigt ihn nicht.

## Comments
