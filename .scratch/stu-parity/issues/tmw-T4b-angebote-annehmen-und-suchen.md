# Angebote annehmen und suchen

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** tmw-T4a

## Ziel

Spieler mit Lizenz am Posten nehmen fremde Angebote n-fach an und bezahlen aus ihrem Warenkonto. Gekürzt wird automatisch auf Bestand, freien Platz und Restanzahl. Die Angebotssuche filtert nach Ware als Angebot, Nachfrage oder beides und listet die Angebote je Ware. Der Anbieter erhält eine Handelsnachricht. Abgeschlossene Handel werden als Transaktion gespeichert (Grundlage für tmw-T11a), und Angebote älter als zwei Wochen verfallen in der Wartung.

## STU-Quellen

- `src/Module/Trade/Action/TakeOffer/TakeOffer.php`: Lizenz am Posten des Angebots, Posten nicht verlassen, Kürzung auf `floor(Bestand / verlangt)`, `floor(frei / (angeboten − verlangt))` und Restanzahl, `TradeTransaction`, Nachricht an den Anbieter.
- `src/Module/Trade/Action/SearchOffers/*` (`TradeEnum::FILTER_COMMODITY_IN_BOTH/IN_OFFER/IN_DEMAND`), `View/ShowTakeOffer/*`, `ShowOfferCommodity/*`
- `src/Module/Maintenance/OldTradeOffersDeletion.php` (`OFFER_MAX_AGE` = 2 Wochen, Rückbuchung und Nachricht)

## SWU-Pfade

- Modul `apps/backend/src/modules/trade/`, `messaging.service.ts` (Ordner `TRADE`)
- Wartungsgerüst sh-AP-07 (falls vorhanden), sonst täglicher Cron
- Frontend: `apps/frontend/src/pages/trade.tsx`

## Akzeptanzkriterien

- [ ] `POST trade/offers/:id/take { amount }` setzt alle STU-Prüfungen und Kürzungen um. Gebucht wird transaktional mit Sperre auf dem Angebot, damit parallele Annahmen nicht überbuchen. Eine Transaktion wird gespeichert, und der Anbieter erhält eine Nachricht („x-mal angenommen: …“).
- [ ] Eigene Angebote können nicht angenommen werden. NPC-Konten können nicht annehmen.
- [ ] `GET trade/offers?commodityId=&mode=offer|demand|both&postId=` liefert die Angebote aller lizenzierten Posten, mit Paginierung. `GET trade/offers/by-commodity/:id` liefert die Übersicht je Ware.
- [ ] Die Handelsseite hat den Tab „Angebote“ mit Filterleiste (Ware als Icon-Auswahl, Modus, Posten), einer Tabelle im STU-Stil und dem Dialog „Annehmen“ mit Mengenfeld und Maximalwert.
- [ ] Ein täglicher Job löscht Angebote älter als 14 Tage, bucht die Reserve zurück und benachrichtigt den Anbieter.
- [ ] Backend-Tests: Kürzungen, Lizenzpflicht, Nebenläufigkeit, Suche je Modus, Verfall. Frontend-Tests: Filter, Annehmen-Dialog.

## Comments
