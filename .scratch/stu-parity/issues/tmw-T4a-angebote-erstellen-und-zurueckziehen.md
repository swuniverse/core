# Angebote erstellen, auflisten und zurückziehen

**Status:** resolved
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

- [x] `POST trade/posts/:id/offers` setzt alle STU-Regeln mit verständlichen deutschen Fehlermeldungen um (siehe STU-Quellen). Die Reserve wird transaktional vom Konto abgebucht.
- [x] `DELETE trade/offers/:id` (nur der Anbieter) bucht den Rest der Reserve aufs Konto zurück. Bei vollem Konto wird trotzdem zurückgebucht, wie in STU. Das Konto darf also überlaufen und sperrt dann weitere Einbuchungen.
- [x] `GET trade/offers/mine` listet die eigenen Angebote je Posten. Die Handelsseite zeigt den Tab „Meine Angebote“ und einen Dialog „Neues Angebot“ (Warenwahl aus dem Konto, Mengen, Anzahl, Vorschau des Verhältnisses).
- [x] Angebotsreserven erscheinen als Lagerort in der Warenübersicht (tmw-D1).
- [x] Backend-Tests für jede Regel, für Zurückziehen und für den Kontoplatz. Frontend-Tests: Formularvalidierung und Liste.

## Comments

- col-F2 exposes canonical `isTradeable` on commodity definitions; offer creation must reject commodities where it is false.
- 2026-11-12: Umgesetzt.
  - Backend: `TradeOfferService` mit `POST trade/posts/:id/offers`, `DELETE trade/offers/:id`, `GET trade/offers/mine` und `GET trade/posts/:id/offer-options` (serverseitige Auswahl für den Dialog: Lizenz, freier Kontoplatz, handelbare Kontowaren, handelbare Zielwaren). Erstellen nach STU `CreateOffer` in einer Transaktion mit Sperre auf Posten und Kontozeile: gleiche Ware, Mengen ≥ 1, Anzahl ≥ 1, nur handelbare Waren (`isTradeable`, col-F2), vergleichbares Angebot (Verhältnis auf 2 Nachkommastellen), überfülltes Konto, Ware im Konto, Kürzung der Anzahl auf den Bestand mit Hinweis. Die Reserve (`reservedAmount`) wird vom Konto abgebucht und zählt über `TradeStorageService` weiter gegen den Kontoplatz. Zurückziehen nur durch den Anbieter (sonst 403) bucht die Reserve auch über das Kontolimit zurück; ein überlaufendes Konto sperrt danach weitere Einbuchungen.
  - Abweichungen von STU: Eine Anzahl über 99 wird mit Meldung abgelehnt statt stillschweigend auf 1 gesetzt (STU-Fehlverhalten, Akzeptanzkriterium „≤ 99“). Eine gültige Lizenz am Posten ist Pflicht (Issue-Ziel; STU erreicht das über das Handelsmenü). Den Zustand „verlassener Posten“ gibt es in SWU noch nicht (`tmw-T12c`).
  - Warenübersicht: neuer Lagerort-Typ `TRADE_OFFER` („Angebotsreserve“) über `TradeOfferCommodityLocationSource`, Link auf `/trade?tab=offers`.
  - Frontend: Tab „Meine Angebote“ (`TradeOffersTab`) mit Angeboten je Posten und „Zurückziehen“; Dialog „Neues Angebot“ mit Postenwahl aus den gültigen Lizenzen, Warenwahl aus dem Konto, Mengen, Anzahl, Clientvalidierung, Vorschau von Verhältnis, Reserve und Kürzung sowie Anzeige von Serverfehlern.
  - Prüfungen: `trade-offer.int-spec.ts` (9 Tests: Reserve und Kontoplatz, Kürzung, jede Erstellregel ohne Seiteneffekte, vergleichbares Angebot, Lizenz und Kontoplatz, Zurückziehen mit Überlauf und Einbuchungssperre, nur Anbieter, Nebenläufigkeit, Listen/Optionen/Lagerort); Mutationsprobe (Vergleichsregel entfernt) lässt den Test scheitern. Frontend `TradeOffersTab.spec.tsx` (Liste und Zurückziehen, Formularvalidierung, Vorschau und Erstellen, Serverfehler, ohne Lizenz). Alle Handels-Integrationssuiten und App-Boot 6/40 grün. `nx run-many -t lint typecheck build -p shared backend frontend` grün (Warnungen unverändert); Backend 2029/2029; Frontend 709/709.
