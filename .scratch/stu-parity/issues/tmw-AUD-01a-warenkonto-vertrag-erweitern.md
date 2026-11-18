# Warenkonto-Vertrag für die STU-Kontobox erweitern

**Status:** ready-for-agent
**Priority:** P1
**Size:** M
**Blocked by:** —

## Ziel

Die STU-Warenkontobox (`tradeAccounts.twig`) braucht je Konto Daten, die `GET trade/overview` heute nicht liefert. `TradeOverviewDto` enthält je Konto nur Ware und Menge. Dieses Ticket erweitert den Vertrag und das Backend so, dass tmw-AUD-01b die Box ohne weitere Abfragen rendern kann:

- Standort des Postens (Ebene, Koordinaten bzw. System) und Handelsnetz mit Netzname.
- NPC-Kennung des Postens (für Rassen-/Fraktionsicon, Transferkapazität und Transfer nur an NPC-Posten wie STU).
- Waren in Angeboten je Ware (Summe der Angebotsreserven, STU `TradeAccountWrapper::getOfferStorage`).
- Belegung wie STU: nur der Bestand zählt gegen das Limit, in Anzeige **und** Platzprüfung. Die Angebotsreserve zählt nicht mehr gegen den Kontoplatz (`TradeStorageService.capacity` anpassen; ersetzt die tmw-T4a-Regel „Reserve zählt weiter gegen den Kontoplatz“).
- Anzahl gültiger ausgestellter Lizenzen am Posten (STU `getLicenseCount`).
- Aktuelle Lizenzbedingung (Ware, Menge, Tage) bzw. „keine“, und ob der Spieler Eigentümer ist (Gebühr „Bearbeiten“ statt „Anzeigen“).

## STU-Quellen

- `src/html/trade/tradeAccounts.twig` (Z. 21–114: Bild, Waren lagernd, Waren in Angeboten, Standort, Netz, Schwarzes Brett, Transferkapazität nur NPC, Lagerraum rot/grün, Lizenzen, Gebühren)
- `src/Module/Trade/View/ShowAccounts/`
- `src/Module/Trade/Lib/TradeAccountWrapper.php` (`getOfferStorage`, `getFreeTransferCapacity`, `isOverStorage` Z. 111–114, `getStorageSum` Z. 71–78)
- `src/Module/Trade/Lib/TradePostStorageManager.php` (Z. 38–52)

## SWU-Pfade

- `packages/shared/src/lib/trade/index.ts` (`TradeOverviewDto` Z. 36–41, `TradePostListItemDto`, `TradeAccountStorageDto`)
- `apps/backend/src/modules/trade/trade-query.service.ts` (`getOverview`, `listPosts`)
- `apps/backend/src/modules/trade/trade.controller.ts` (`GET trade/overview` Z. 64–69)
- `apps/backend/src/modules/trade/trade-storage.service.ts` (`capacity` Z. 96–116: Bestand + Reserve)
- `apps/backend/src/modules/trade/trade-network-transfer.service.ts` (`capacities`)
- `apps/backend/src/modules/trade/entities/trade-license.entity.ts`, `trade-license-condition.entity.ts`, `trade-offer.entity.ts`
- Tests: `apps/backend/src/modules/trade/trade-query.service.spec.ts`, `trade.controller.spec.ts`

## Akzeptanzkriterien

- [ ] `TradeOverviewDto` liefert je eigenem Konto einen Eintrag `accountBoxes[]` (oder gleichwertig benannt) mit: `tradePostId`, Name, `isNpcPost`, Standort, `networkId`/`networkName`, `stock[]` (Ware, Menge), `offerStock[]` (Ware, Summe `reservedAmount`), `storage { stock, limit, isOverStorage }` (Reserve nur als `offerStock[]` angezeigt), `issuedLicenseCount`, `licenseCondition` (Ware, Menge, Tage oder `null`), `isOwner`, Transferkapazität (frei/gesamt) nur für NPC-Posten.
- [ ] `storage.occupied` und `isOverStorage` kommen aus derselben Berechnung wie die Platzprüfung bei Transfer, Kontoeinbuchung und Angebot (`TradeStorageService`); es gibt keine zweite Summenlogik.
- [ ] `issuedLicenseCount` zählt nur nicht abgelaufene Lizenzen (inkl. Eigentümerlizenz), wie STU.
- [ ] Standort respektiert die bestehende Ortsdarstellung von `listPosts` (keine neuen Informationslecks gegenüber `TradePostListItemDto.location`).
- [ ] Bestehende Felder bleiben kompatibel, bis tmw-AUD-01b die alte `AccountsTab`-Nutzung ersetzt; nicht mehr genutzte Felder werden dort entfernt.
- [ ] Platzprüfung und Anzeige zählen nur den Bestand; Angebotsreserve belegt keinen Kontoplatz.
- [ ] Backend-Tests: Reserve zählt nicht gegen den Platz; überfülltes Konto liefert `isOverStorage = true`; Lizenzanzahl ignoriert abgelaufene Lizenzen; Transferkapazität fehlt an Spielerposten; Bedingung `null` ohne Lizenzinfo.

## Herkunft

- Audit: [README.md](../audit-2026-11-17/README.md) Abschnitt C „Handel – Warenkonto“, Abschnitt H „Warenkonto: Anzeige `x / Limit` zählt nur den Bestand …“; [trade-map-world.md](../audit-2026-11-17/trade-map-world.md) „Große Abweichungen 1“ und „Gegenprüfung Große Abweichung 1“.
- tmw-T1d, tmw-T2d und tmw-T4a sind `resolved`, die Kontobox erfüllt die STU-Vorlage aber nicht (README Abschnitt D).
- PO 2026-11-17: nur Bestand wie STU, in Anzeige und Prüfung; ersetzt die tmw-T4a-Regel zur Reserve.

## Comments

- 2026-11-17 Product Owner: Nur Bestand zählt (wie STU), auch in der Platzprüfung.
