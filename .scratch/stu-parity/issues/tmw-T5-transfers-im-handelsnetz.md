# Transfers zwischen Posten im Handelsnetz

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** tmw-T3

## Ziel

Spieler senden Waren aus ihrem Konto an einem Posten auf ihr Konto an einem anderen Posten desselben Handelsnetzes. Begrenzt wird durch die Transferkapazität des Quellpostens je Spieler in 24 Stunden und durch den freien Platz am Ziel.

## STU-Quellen

- `src/Module/Trade/Action/TransferCommodities/TransferCommodities.php`: Lizenz am Quell- und Zielposten, gleiches Netz, freie Kapazität = `transfer_capacity − Summe der eigenen Transfers der letzten 24 h`, Menge = min(Wunsch, frei am Ziel, Kapazität), Speicherung `TradeTransfer`.
- `src/Module/Trade/View/ShowTransferMenu/*`
- `src/Orm/Repository/TradeTransferRepository.php#getSumByPostAndUser`

## SWU-Pfade

- Modul `apps/backend/src/modules/trade/` (`TradeTransfer`, Speicherdienst)
- Frontend: `apps/frontend/src/pages/trade.tsx` (Kontobox: „Transferieren“)

## Akzeptanzkriterien

- [ ] `POST trade/posts/:id/transfer { targetPostId, commodityId, amount }` setzt alle STU-Prüfungen um und kürzt wie STU. Die Meldung nennt die tatsächlich übertragene Menge.
- [ ] Die Kontobox zeigt „Transferkapazität: frei/gesamt (24 h)“ und einen Transferdialog mit der Zielauswahl (nur lizenzierte Posten desselben Netzes).
- [ ] Backend-Tests: Netzprüfung, Lizenz am Ziel, 24-h-Fenster, Kürzung auf Platz und Kapazität. Frontend-Test: Dialog und Zielauswahl.

## Comments
