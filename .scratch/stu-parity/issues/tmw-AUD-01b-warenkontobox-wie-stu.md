# Warenkontobox wie STU tradeAccounts.twig

**Status:** ready-for-agent
**Priority:** P1
**Size:** M
**Blocked by:** tmw-AUD-01a

## Ziel

Der Tab „Warenkonten“ (`AccountsTab`) zeigt je Konto heute nur Name, `x / Limit`, Transferkapazität und eine Warenliste mit „Transferieren“. Er wird zur STU-Kontobox mit allem Kontext und dem STU-Arbeitsablauf „Ware anklicken → Angebot erstellen / Transferieren“.

Je Konto zeigt die Box:

- Postenname (Link auf Posteninfo); für eigene Posten Umbenennen direkt in der Box (STU `ChangeTradePostName`, Backend `PATCH trade/posts/:id` existiert).
- Raster „Waren lagernd“ (Icon + Menge). Klick öffnet ein Menü mit „Angebot erstellen“ (vorbelegt mit Posten und Ware) und – nur an NPC-Posten – „Transferieren“.
- Raster „Waren in Angeboten“ (Icon + Summe der Reserve). Klick öffnet die eigenen Angebote dieser Ware an diesem Posten (STU `offerByCommodity.twig`) mit „Zurückziehen“.
- Standort mit Knopf „Schiffe vor Ort“ (eigene Schiffe am Posten, wie STU `tradePostShipList.twig`).
- Handelsnetz mit Fraktions-/Netzicon an NPC-Posten und Link „Schwarzes Brett“ (öffnet die Shoutbox dieses Netzes).
- Transferkapazität „frei (n pro Tag)“ nur an NPC-Posten.
- Lagerraum `belegt / Limit`, rot bei Überfüllung, sonst grün. Belegt = nur Bestand wie STU (gleich der Platzprüfung aus tmw-AUD-01a).
- „Ausgestellte Lizenzen n (Liste anzeigen)“ → Lizenznehmerliste (tmw-AUD-10).
- „Handelslizenz Gebühren: Anzeigen“ bzw. für den Eigentümer „Bearbeiten“ → bestehendes `TradeLicensePanel`.

## STU-Quellen

- `src/html/trade/tradeAccounts.twig`
- `src/html/trade/tradeOfferMenu.twig` (Z. 15–21: „Transferieren“ nur an NPC-Posten), `src/html/trade/offerByCommodity.twig`, `src/html/trade/tradePostShipList.twig`
- `src/Module/Trade/View/ShowAccounts/`, `ShowOfferMenu/`, `ShowOfferCommodity/`, `ShowShiplist/`, `ShowShoutBox/`
- `src/Module/Trade/Action/ChangeTradePostName/`

## SWU-Pfade

- `apps/frontend/src/pages/trade.tsx` (`AccountsTab` Z. 216–327, `PostInfo` Z. 428–503)
- `apps/frontend/src/components/trade/TradeOffersTab.tsx` (`NewOfferDialog`: Vorbelegung von Posten und Ware ergänzen)
- `apps/frontend/src/components/trade/TradeNetworkTransferDialog.tsx`, `TradeShoutboxTab.tsx`, `TradeLicensePanel.tsx`
- `apps/frontend/src/components/spacecraft/StationTradePostPanel.tsx` (Umbenennen; Logik wiederverwenden)
- `apps/frontend/src/lib/assets.ts` (`commodityImage`)
- Tests: `apps/frontend/src/pages/trade.spec.tsx`

## Akzeptanzkriterien

- [ ] Die Box zeigt alle oben genannten Elemente aus den Daten von tmw-AUD-01a; keine zusätzlichen Abfragen je Konto außer beim Öffnen von Untermenüs.
- [ ] Klick auf eine lagernde Ware öffnet „Angebot erstellen“ mit vorbelegtem Posten und Ware; an NPC-Posten zusätzlich „Transferieren“. An Spielerposten gibt es weder Transferknopf noch Kapazitätszeile (die Sofortkorrektur dafür liefert tmw-AUD-06a; die neue Box muss sie beibehalten).
- [ ] Klick auf eine Ware in Angeboten zeigt die eigenen Angebote dieser Ware am Posten mit Zurückziehen.
- [ ] Lagerraum wird rot bei `isOverStorage`, sonst grün; die Zahl ist nur der Bestand.
- [ ] „Liste anzeigen“ öffnet die Lizenznehmerliste aus tmw-AUD-10 (bis dahin: Link nur für den Eigentümer aktiv).
- [ ] „Schwarzes Brett“ öffnet die Shoutbox des Netzes; „Schiffe vor Ort“ listet eigene Schiffe am Posten.
- [ ] Umbenennen eigener Posten aus der Box; Fehlertexte des Servers werden angezeigt.
- [ ] Frontend-Tests: NPC- vs. Spielerposten (Transfer sichtbar/unsichtbar), Überfüllungsfarbe, Ware-Klick öffnet vorbelegten Angebotsdialog, Angebotsreserve-Klick, Lizenzanzahl und Gebührenlink (Eigentümer vs. Lizenznehmer).

## Herkunft

- Audit: [README.md](../audit-2026-11-17/README.md) Abschnitt C „Handel – Warenkonto“, H „Warenkonto“ und „Handel und Datenbank: Transferknopf“; [trade-map-world.md](../audit-2026-11-17/trade-map-world.md) „Große Abweichungen 1“, Kleine Abweichungen „Transferknopf an Spielerposten“, „Belegungsanzeige der Kontobox“, „Umbenennen von Handelsposten“.
- tmw-T1d, tmw-T2d und tmw-T4a sind `resolved`, ihre Akzeptanz (STU-Kontobox/-Arbeitsablauf) ist nicht erfüllt (README Abschnitt D).
- Der Transferknopf an Spielerposten wird vorab in tmw-AUD-06a ausgeblendet (kleine Korrektur in der heutigen `AccountsTab`); dieses Ticket übernimmt die Regel in die neue Box.

## Comments
