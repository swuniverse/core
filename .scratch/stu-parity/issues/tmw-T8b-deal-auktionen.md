# Deal-Auktionen des Hutten-Kartells

**Status:** resolved
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

- [x] Die Entität `TradeAuctionBid` (Deal, Spieler, Maximalgebot, Zeit) ist angelegt. Der Deal speichert Höchstbietenden und aktuellen Preis.
- [x] `POST trade/deals/:id/bid { maxAmount }` setzt die STU-Gebotslogik um (Erstgebot, Erhöhung, Überbieten mit Preis = fremdes Maximum + 1 bzw. eigenes Maximum). Der Einsatz wird reserviert bzw. abgezogen, überbotene Spieler bekommen ihn zurück. Jede Buchung erzeugt einen Prestigelog-Eintrag, der Überbotene erhält eine Nachricht. Alles läuft transaktional und nebenläufigkeitssicher.
- [x] Nach `end` sind keine Gebote mehr möglich. `POST trade/deals/:id/claim` liefert den Gewinn wie bei tmw-T8a aus, nur für den Höchstbietenden und nur einmal.
- [x] Die UI zeigt laufende Auktionen (aktueller Preis, eigenes Maximum, Restzeit), ein Gebotsformular und „Gewonnene Auktionen“ mit Abholknopf.
- [x] Backend-Tests: alle Gebotsfälle einschließlich Rückerstattung, Gebot nach Ende, Doppelabholung, paralleles Bieten. Frontend-Tests: Gebotsformular und Abholen.

## Comments

- 2026-11-13: Umgesetzt.
  - Migration `20261113150000-add-trade-auctions`: `trade_deals` erhält `auctionUserId` (Höchstbietender, bei Löschung NULL), `auctionAmount` (aktueller Preis) und `takenAt` (abgeholt); Checks erlauben diese Felder nur bei Auktionen. Neue Entität `TradeAuctionBid` (Deal, Spieler, Maximalgebot, Zeit). Das Höchstgebot ist das neueste Gebot des Höchstbietenden.
  - `POST trade/deals/:id/bid { maxAmount }` (`TradeAuctionService`) nach STU `DealsBidAuction`: Erstgebot (volles Maximum reserviert, Preis 1), eigenes Maximum erhöhen (nur Differenz), fremdes Gebot bis zum bestehenden Maximum (nichts reserviert, Preis = min(Gebot + 1, Maximum), Nachricht an den Höchstbietenden; Gleichstand behält den Früheren), Überbieten (volles neues Maximum reserviert, alter Höchstbietender erhält sein ganzes Maximum zurück plus Nachricht, Preis = altes Maximum + 1). Währung ist Prestige (`wantPrestige`, Prestigelog-Texte wie STU `BID_TYPE_*` mit „Hutten-Kartell“) oder die verlangte Ware auf dem Konto am Hutten-Posten; die Mengenfelder des Preises haben bei Auktionen keine Bedeutung. Gebote nur im Laufzeitfenster, für die eigene Fraktion, mit Lizenz, über dem aktuellen Preis; nach dem Ende „Die Auktion ist bereits beendet“. Sperren: Hutten-Posten → Auktion → Spieler → Kontozeilen.
  - `POST trade/deals/:id/claim` nach STU `DealsTakeAuction`: nur der Höchstbietende, nur nach dem Ende, nur einmal (`takenAt`); die Differenz Maximum − Preis wird zurückerstattet, die Lieferung läuft über dieselbe Auslieferung wie tmw-T8a (`TradeDealService.deliver`: Ware aufs Konto ohne Platzprüfung wie STU, Schiff am Posten, Bauplan).
  - `GET trade/deals` liefert zusätzlich laufende Auktionen (Preis, Höchstbietender, eigenes Maximum, Ende) und gewonnene, noch nicht abgeholte Auktionen (Preis, Rückerstattung). Admins legen Auktionen über das Deal-Formular an (Schalter „Auktion“; die Art ist danach nicht änderbar); die Admin-Liste zeigt Preis und Abholstatus.
  - Kontolöschung (tmw-T11b): Überbotene Einsätze sind bereits vollständig erstattet, daher hält kein anderes Gebot mehr eine Reserve. Führt der gelöschte Spieler eine Auktion, wird sie gebotslos (Höchstbietender und Preis zurückgesetzt) und neu bietbar; seine Gebote werden entfernt.
  - Frontend: Im Tab „Hutten-Deals“ die Bereiche „Auktionen“ (Preis, eigenes Maximum, Restzeit, Gebotsformular) und „Gewonnene Auktionen“ mit Abholknopf.
  - Tests: `trade-auctions.int-spec.ts` (alle Gebotsfälle inkl. Rückerstattung und Nachrichten, Warenwährung, Ablehnungen inkl. Gebot nach Ende, paralleles Bieten von 5 Spielern, Abholen mit Rückerstattung, Doppel- und paralleles Abholen, Schiff, Liste, Kontolöschung), `trade-deletion.int-spec.ts`, `TradeDealsTab.spec.tsx`, `admin-trade-deals.spec.tsx`. Mutationsproben (Erstattung beim Überbieten, Sperren entfernt) lassen Tests scheitern.
