# Lizenznehmerliste für alle Lizenzinhaber, Dauerlizenz des Eigentümers

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

In STU sieht die „Liste ausgestellter Handelslizenzen“ eines Postens jeder, der selbst eine gültige Lizenz an diesem Posten hat (sonst `AccessViolationException`). Der Eigentümer sieht sie, weil er beim Postenbau automatisch eine unbefristete Lizenz erhält. Die Liste zeigt Siedler (mit PM-Link), Kaufdatum und Ablaufdatum. In SWU sieht nur der Eigentümer die Liste (`listIssued` prüft `ownedPost`), ohne Kaufdatum und PM-Link.

- `GET trade/posts/:id/licenses` erlaubt jedem Spieler mit gültiger Lizenz am Posten den Zugriff; ohne Lizenz 403. Der Eigentümer wird nicht mehr gesondert geprüft, sondern über seine Lizenz.
- Spalten: Siedler (Name, Schnell-PM), Kaufdatum, Ablaufdatum; unbefristete Lizenzen als „unbefristet“.
- Die Liste ist aus Posteninfo, Lizenzinfo/-panel und Warenkontobox (tmw-AUD-01b „Liste anzeigen“) erreichbar.
- **Eigentümerlizenz:** `PlayerTradePostService.createForStation` legt sie bereits an (`UNLIMITED_LICENSE_EXPIRY`, STU `StationUtility::createTradepostAndLicense`). Das wird per Test abgesichert. Eine Migration legt für bestehende Spielerposten mit Eigentümer, aber ohne gültige Eigentümerlizenz, eine unbefristete Lizenz an. NPC-Posten werden nicht verändert (STU vergibt die Dauerlizenz nur beim Bau durch Spieler).
- Verlassene Posten (ohne Eigentümer) erhalten keine neue Lizenz.

## STU-Quellen

- `src/Module/Trade/View/ShowLicenseList/ShowLicenseList.php` (Z. 25–34)
- `src/html/trade/license/list.twig` (Siedler mit `pmWindow`, Kaufdatum, Ablaufdatum)
- `src/Component/Station/StationUtility.php` (`createTradepostAndLicense`, Ablauf 2038)

## SWU-Pfade

- `apps/backend/src/modules/trade/trade-license.service.ts` (`listIssued` Z. 77, `ownedPost` Z. 93)
- `apps/backend/src/modules/trade/player-trade-post.service.ts` (`createForStation` Z. 49–83, `UNLIMITED_LICENSE_EXPIRY` Z. 18)
- `apps/backend/src/modules/trade/trade.controller.ts` (`GET posts/:id/licenses` Z. 118–124)
- `apps/backend/src/database/migrations/` (neue Migration; Bezug `20261030190000-add-trade-licenses.ts`)
- `packages/shared/src/lib/trade/index.ts` (`IssuedTradeLicenseDto`)
- `apps/frontend/src/components/trade/TradeLicensePanel.tsx` (`OwnerLicenseAdmin` Z. 258–269: Liste herauslösen), `apps/frontend/src/pages/trade.tsx` (`PostInfo`)
- Tests: `apps/backend/src/modules/trade/trade-license.service.spec.ts`, `apps/backend/src/testing/integration/player-trade-post.int-spec.ts`, `trade.spec.tsx`

## Akzeptanzkriterien

- [ ] Lizenzinhaber (inkl. Eigentümer) erhalten die Liste; Spieler ohne gültige Lizenz erhalten 403.
- [ ] Liste zeigt Name mit PM-Link (bestehender `PmLink`; die Umstellung auf das Schnell-PM-Popup erfolgt in soc-AUD-07a/07c), Kaufdatum und Ablauf bzw. „unbefristet“.
- [ ] Postenbau legt die unbefristete Eigentümerlizenz an (Test).
- [ ] Migration ergänzt fehlende Eigentümerlizenzen idempotent; verlassene Posten ausgenommen.
- [ ] Backend-Tests: Zugriff Lizenzinhaber/Eigentümer/Fremder, abgelaufene Lizenzen nicht gelistet, Migration idempotent. Frontend-Tests: Liste für Nicht-Eigentümer mit Lizenz sichtbar, Kaufdatum und PM-Link.

## Herkunft

- Audit: [README.md](../audit-2026-11-17/README.md) Abschnitt L3 „Ausgestellte Lizenzen – Sichtbarkeit“ und „Entscheidung PO zu L3“, N2 „Lizenznehmerliste nur Eigentümer → für alle Lizenzinhaber; Eigentümer erhält Dauerlizenz“; [trade-map-world.md](../audit-2026-11-17/trade-map-world.md) Seitenabgleich `license/list.twig`, Kleine Abweichungen „Ausgestellte Lizenzen“.
- PO-Entscheidung L3 vom 2026-11-17: wie STU.
- Ersetzt den PO-Entscheid in tmw-T2 (Comment 2026-10-30: „nur Eigentümer sehen ausgestellte Lizenzen“) und den entsprechenden Teil des `map.md`-Eintrags „2026-10-30 – tmw-T2“.
- Schnell-PM-Einstieg „Lizenzliste“ laut README H/M4 ist kanonisch in soc-AUD-07c.

## Comments
