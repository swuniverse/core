# Transfers zwischen Posten im Handelsnetz

**Status:** resolved
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

- [x] `POST trade/posts/:id/transfer { targetPostId, commodityId, amount }` setzt alle STU-Prüfungen um und kürzt wie STU. Die Meldung nennt die tatsächlich übertragene Menge.
- [x] Die Kontobox zeigt „Transferkapazität: frei/gesamt (24 h)“ und einen Transferdialog mit der Zielauswahl (nur lizenzierte Posten desselben Netzes).
- [x] Backend-Tests: Netzprüfung, Lizenz am Ziel, 24-h-Fenster, Kürzung auf Platz und Kapazität. Frontend-Test: Dialog und Zielauswahl.

## Comments

- 2026-11-13: Umgesetzt.
  - `POST trade/posts/:id/transfer { targetPostId, commodityId, amount }` (`TradeNetworkTransferService`) nach STU `TransferCommodities`: freie Kapazität = Transferkapazität des Quellpostens − eigene Transfers von dort in den letzten 24 h; Menge = min(Wunsch, Bestand, freier Platz am Ziel, freie Kapazität); Meldung „Es wurde N Ware zum Posten transferiert“ mit der tatsächlichen Menge; `TradeTransfer` wird gespeichert. Beide Posten werden in ID-Reihenfolge gesperrt, sodass gleichzeitige Transfers verschiedener Waren die Kapazität nicht überschreiten.
  - Abweichungen von STU: STU prüft nur die Lizenz am Quellposten; SWU verlangt wie im Issue auch eine gültige Lizenz am Ziel. Stille Abbrüche in STU (Ziel fehlt, anderes Netz, keine Lizenz, leeres Konto) melden jetzt einen Fehler; Quell- und Zielposten müssen verschieden sein (Schema-Check). Tippfehler „Transferkapaziztät“ korrigiert.
  - `GET trade/posts/:id/transfer-targets` liefert freie/gesamte Kapazität und die lizenzierten Posten desselben Netzes mit freiem Platz; `GET trade/overview` enthält `transferCapacities` je Kontoposten.
  - Frontend: Kontobox zeigt „Transferkapazität: frei / gesamt (24 h)“, jede Warenzeile hat „Transferieren“; der Dialog lädt die Ziele, kürzt serverseitig und lädt die Übersicht danach neu.
  - Tests: `trade-network-transfer.int-spec.ts` (Transfer und Protokoll, Kürzung auf Bestand/Platz/Kapazität, 24-h-Fenster nur für eigene Transfers vom Posten, Lizenz an Quelle und Ziel, Netzprüfung, gleicher Posten, volle Ziele, Eingaben, Parallelität mit verschiedenen Waren, Zielliste), `trade.controller.spec.ts`, `trade.spec.tsx` (Kapazitätsanzeige, Dialog, Zielauswahl, leere Zielliste). Mutationsproben: 48-h-Fenster und fehlende Postensperre lassen Tests scheitern.
