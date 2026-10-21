# Deal-Auktionen des Hutten-Kartells

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** tmw-T8a

## Ziel

Deals vom Typ Auktion werden nach STU-Muster mit Maximalgebot versteigert. Der Einsatz ist Prestige (STU: „Auktion des Großen Nagus“), wahlweise je Deal auch Aurodium. Überbotene Spieler erhalten ihren Einsatz zurück. Nach Auktionsende holt der Höchstbietende seinen Gewinn ab.

## STU-Quellen

- `src/Module/Trade/Action/DealsBidAuction/DealsBidAuction.php`: Erstgebot, eigenes Maximalgebot erhöhen, Überbieten fremder Maximalgebote. Prestige wird beim Bieten abgezogen und beim Überbotenwerden zurückgegeben (Prestigelog-Texte `BID_TYPE_*`). Nachricht an den Überbotenen.
- `src/Module/Trade/Action/DealsTakeAuction/DealsTakeAuction.php` (Gewinn abholen, Kontoplatz, Rückerstattung der Differenz)
- `src/Orm/Entity/AuctionBid.php`, `Deals.php` (`auction_user`, `auction_amount`)
- `src/Orm/Repository/DealsRepository.php#getOwnEndedAuctions*`

## SWU-Pfade

- Modul `apps/backend/src/modules/trade/` (Deals aus tmw-T8a)
- `apps/backend/src/modules/prestige/prestige.service.ts`, `messaging.service.ts`
- Frontend: `apps/frontend/src/pages/trade.tsx` (Bereich „Auktionen“ und „Gewonnene Auktionen“)

## Akzeptanzkriterien

- [ ] Die Entität `TradeAuctionBid` (Deal, Spieler, Maximalgebot, Zeit) ist angelegt. Der Deal speichert Höchstbietenden und aktuellen Preis.
- [ ] `POST trade/deals/:id/bid { maxAmount }` setzt die STU-Gebotslogik um (Erstgebot, Erhöhung, Überbieten mit Preis = fremdes Maximum + 1 bzw. eigenes Maximum). Der Einsatz wird reserviert bzw. abgezogen, überbotene Spieler bekommen ihn zurück. Jede Buchung erzeugt einen Prestigelog-Eintrag, der Überbotene erhält eine Nachricht. Alles läuft transaktional und nebenläufigkeitssicher.
- [ ] Nach `end` sind keine Gebote mehr möglich. `POST trade/deals/:id/claim` liefert den Gewinn wie bei tmw-T8a aus, nur für den Höchstbietenden und nur einmal.
- [ ] Die UI zeigt laufende Auktionen (aktueller Preis, eigenes Maximum, Restzeit), ein Gebotsformular und „Gewonnene Auktionen“ mit Abholknopf.
- [ ] Backend-Tests: alle Gebotsfälle einschließlich Rückerstattung, Gebot nach Ende, Doppelabholung, paralleles Bieten. Frontend-Tests: Gebotsformular und Abholen.

## Comments
