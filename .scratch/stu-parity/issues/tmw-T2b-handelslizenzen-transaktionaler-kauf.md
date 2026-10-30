# Handelslizenzen: transaktionaler Kauf

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** tmw-T2a

## Ziel

Ein Spieler kauft eine Handelslizenz am Posten atomar aus dem Frachtraum eines eigenen Schiffs oder aus einem eigenen Warenkonto desselben Handelsnetzes.

## STU-Quellen

- `src/Module/Ship/Action/BuyTradeLicense/BuyTradeLicense.php`
- `src/Module/Ship/View/ShowTradeMenuPayment/*`
- `src/Orm/Repository/StorageRepository.php`

## SWU-Pfade

- `apps/backend/src/modules/trade/`
- `apps/backend/src/modules/spacecraft/transfer.service.ts`
- `apps/backend/src/modules/spacecraft/entities/cargo-item.entity.ts`
- `apps/backend/src/modules/messaging/messaging.service.ts`

## Akzeptanzkriterien

- [ ] `POST trade/posts/:id/licenses` akzeptiert `{ method: 'ship', shipId, payShipId }` oder `{ method: 'account', accountPostId }`.
- [ ] Das initiierende eigene Schiff erfüllt die Presence-Policy aus tmw-T2a; das Zahlschiff gehört dem Käufer und befindet sich ebenfalls am Posten.
- [ ] Kontozahlung ist nur aus einem eigenen Warenkonto auf einem Posten desselben Netzes zulässig.
- [ ] Unbekannte Zahlart, ungültige Quelle, falsches Netz und unzureichender Bestand brechen ohne Lizenz, Gutschrift oder Erfolgsmeldung ab.
- [ ] Abbuchung, Gutschrift und Lizenzerzeugung erfolgen in einer gemeinsamen Datenbanktransaktion mit geeigneten Sperren.
- [ ] Die Zahlung wird dem Warenkonto des Posteneigentümers am lizenzierten Posten gutgeschrieben. Das gilt auch für NPC-Eigentümer.
- [ ] Der Eigentümer erhält nach erfolgreichem Kauf genau eine Nachricht im Ordner „Handel“.
- [ ] Backend-Tests decken beide Zahlarten, falschen Ort, fremde Quelle, falsches Netz, zu wenig Ware, Parallelität und Wiederholung ab.

## Entscheidung

SWU übernimmt das STU-Zahlungsmodell, korrigiert aber fehlende Autorisierungen, unbezahlte Erfolgswege und nicht-atomare Buchungen.
