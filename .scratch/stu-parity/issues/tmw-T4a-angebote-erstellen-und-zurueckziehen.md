# Angebote erstellen, auflisten und zurückziehen

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** tmw-T3

## Ziel

Spieler mit Lizenz erstellen an einem Posten Tauschangebote aus ihrem Warenkonto („gebe x Ware A gegen y Ware B, n-mal“). Die Waren gehen in eine Angebotsreserve und zählen weiter gegen den Kontoplatz. Angebote können zurückgezogen werden, dann fließt der Rest der Reserve zurück. Es gelten alle STU-Regeln.

## STU-Quellen

- `src/Module/Trade/Action/CreateOffer/CreateOffer.php`: Ware muss im Konto vorhanden sein; Posten nicht verlassen; nicht dieselbe Ware; angebotene und verlangte Menge ≥ 1; Anzahl ≥ 1 und ≤ 99; kontogebundene oder nicht handelbare Ware verboten; Kürzung der Anzahl auf den Bestand; vergleichbares Angebot (Verhältnis auf 2 Nachkommastellen gleich) verboten; Kontoplatz.
- `src/Module/Trade/Action/CancelOffer/*`, `src/Module/Trade/View/ShowOfferMenu/*`, `ShowOfferMenuNewOffer/*`
- `src/Orm/Entity/TradeOffer.php`, `Storage.php` (`tradeoffer_id`)

## SWU-Pfade

- Modul `apps/backend/src/modules/trade/` (Entität `TradeOffer`, Speicherdienst aus tmw-T1)
- Lagerort-Erweiterungspunkt aus tmw-D1 (Angebotsreserven als Quelle)
- Waren-Flags (col-F2 bzw. `isTradeOnly`)
- Frontend: `apps/frontend/src/pages/trade.tsx`

## Akzeptanzkriterien

- [ ] `POST trade/posts/:id/offers` setzt alle STU-Regeln mit verständlichen deutschen Fehlermeldungen um (siehe STU-Quellen). Die Reserve wird transaktional vom Konto abgebucht.
- [ ] `DELETE trade/offers/:id` (nur der Anbieter) bucht den Rest der Reserve aufs Konto zurück. Bei vollem Konto wird trotzdem zurückgebucht, wie in STU. Das Konto darf also überlaufen und sperrt dann weitere Einbuchungen.
- [ ] `GET trade/offers/mine` listet die eigenen Angebote je Posten. Die Handelsseite zeigt den Tab „Meine Angebote“ und einen Dialog „Neues Angebot“ (Warenwahl aus dem Konto, Mengen, Anzahl, Vorschau des Verhältnisses).
- [ ] Angebotsreserven erscheinen als Lagerort in der Warenübersicht (tmw-D1).
- [ ] Backend-Tests für jede Regel, für Zurückziehen und für den Kontoplatz. Frontend-Tests: Formularvalidierung und Liste.

## Comments

- col-F2 exposes canonical `isTradeable` on commodity definitions; offer creation must reject commodities where it is false.
