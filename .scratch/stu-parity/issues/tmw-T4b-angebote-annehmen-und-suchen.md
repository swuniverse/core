# Angebote annehmen und suchen

**Status:** resolved
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

- [x] `POST trade/offers/:id/take { amount }` setzt alle STU-Prüfungen und Kürzungen um. Gebucht wird transaktional mit Sperre auf dem Angebot, damit parallele Annahmen nicht überbuchen. Eine Transaktion wird gespeichert, und der Anbieter erhält eine Nachricht („x-mal angenommen: …“).
- [x] Eigene Angebote können nicht angenommen werden. NPC-Konten können nicht annehmen.
- [x] `GET trade/offers?commodityId=&mode=offer|demand|both&postId=` liefert die Angebote aller lizenzierten Posten, mit Paginierung. `GET trade/offers/by-commodity/:id` liefert die Übersicht je Ware.
- [x] Die Handelsseite hat den Tab „Angebote“ mit Filterleiste (Ware als Icon-Auswahl, Modus, Posten), einer Tabelle im STU-Stil und dem Dialog „Annehmen“ mit Mengenfeld und Maximalwert.
- [x] Ein täglicher Job löscht Angebote älter als 14 Tage, bucht die Reserve zurück und benachrichtigt den Anbieter.
- [x] Backend-Tests: Kürzungen, Lizenzpflicht, Nebenläufigkeit, Suche je Modus, Verfall. Frontend-Tests: Filter, Annehmen-Dialog.

## Comments

- 2026-11-12: Umgesetzt.
  - Annehmen: `TradeOfferMarketService.take` und `POST trade/offers/:id/take { amount }` nach STU `TakeOffer` in einer Transaktion mit Sperren auf Posten, Angebot und Kontozeilen. Lizenzpflicht am Posten des Angebots, keine eigenen Angebote, NPC-Konten können nicht annehmen. Kürzung auf `floor(Bestand / verlangt)`, `floor(frei / (angeboten − verlangt))` und die Restanzahl; die Meldungen „Nicht genügend … vorhanden“, „Warenkonto … voll“ und „nicht genügend Platz“ wie STU. Der Anbieter wird wie STU ohne Platzprüfung gutgeschrieben; ein aufgebrauchtes Angebot wird gelöscht, sonst sinken Anzahl und Reserve. Jede Annahme speichert eine `TradeTransaction` (Käufer, Verkäufer, Mengen; Grundlage für `tmw-T11a`), der Anbieter erhält nach Commit eine Handelsnachricht („x-mal angenommen: Am … wurden insgesamt … getauscht“).
  - Suche: `GET trade/offers?commodityId=&mode=offer|demand|both&postId=&page=` über alle Posten mit gültiger eigener Lizenz, neueste zuerst, 25 je Seite; liefert zusätzlich die lizenzierten Posten und handelbaren Waren für die Filter sowie je Angebot `isOwn` und die mögliche Annahmeanzahl `maxTake`. `GET trade/offers/by-commodity/:id` liefert Angebote, die die Ware geben oder verlangen, beste Verhältnisse zuerst.
  - Verfall: `TradeOfferMaintenanceService` (Handler `trade-offers`, im `TickModule` registriert) löscht Angebote älter als 14 Tage (STU `OFFER_MAX_AGE`), bucht die Reserve ohne Platzprüfung zurück und schickt je Spieler eine gesammelte Handelsnachricht im STU-Wortlaut.
  - Frontend: Tab „Angebote“ (`TradeMarketTab`) mit Filterleiste (Ware als Icon-Auswahl, Modus, Posten), Tabelle im STU-Stil, Seitenwechsel und Dialog „Annehmen“ mit Mengenfeld, „max“, Vorschau und Fehleranzeige; eigene Angebote sind markiert und nicht annehmbar.
  - Prüfungen: `trade-offer-market.int-spec.ts` (7 Tests: Buchungen, Transaktion und Nachricht; alle drei Kürzungen; Ablehnungen inkl. beider Platzfälle, Lizenz, eigenes Angebot, NPC, verschwundenes Angebot; Nebenläufigkeit ohne Überbuchung; Suche je Modus, Postenfilter, Paginierung, `maxTake`; Übersicht je Ware; Verfall mit Rückbuchung und Nachricht); Mutationsprobe (Platzkürzung entfernt) lässt zwei Tests scheitern. Frontend `TradeMarketTab.spec.tsx` (Filter, eigenes Angebot, Annehmen mit Maximalwert, Serverfehler, ohne Lizenz). Alle Handels-Integrationssuiten und App-Boot 7/47 grün. `nx run-many -t lint typecheck build -p shared backend frontend` grün (Warnungen unverändert); Backend 2030/2030; Frontend 714/714.
