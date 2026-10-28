# Handelslizenzen: Bedingungen, Kauf, Verlängerung, Ablauf

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** tmw-T1a

## Verbindlicher Alpha-Default

Die NPC-Lizenz kostet 10 Aurodium und gilt 30 Tage. Lizenzbedingungen und -entitäten gehören vollständig in dieses Issue, nicht in tmw-T1a.

## Ziel

Handel an einem Posten setzt eine gültige Lizenz voraus. Der Eigentümer legt die Lizenzbedingung fest (Ware, Menge, 1–365 Tage). Ein eigenes Schiff am Posten kauft die Lizenz aus dem eigenen Frachtraum. Alternativ wird über ein Warenkonto desselben Netzes bezahlt. Lizenzen lassen sich verlängern und laufen ab, mit Warnung 7 Tage vorher. Dieses Issue führt die Anwesenheitsprüfung `TradePostPresencePolicy` ein, die auch tmw-T3 nutzt.

## STU-Quellen

- `src/Module/Trade/Action/CreateLicense/*` (1–365 Tage, Ware und Menge Pflicht), `View/ShowLicenseMenu/*`
- `src/Module/Ship/Action/BuyTradeLicense/BuyTradeLicense.php` (Zahlart `ship`: Schiff und Zahlschiff am Postenort, eigenes Zahlschiff. Zahlart `account`: Konto auf einem Posten desselben Netzes. Keine Doppel-Lizenz. Nachricht an den Eigentümer), `src/Module/Ship/View/ShowTradeMenuPayment/*`
- `src/Module/Trade/Action/RenewTradeLicense/*`, `View/ShowLicenseList/*`, `ShowLicenseInfo/*`
- `src/Module/Maintenance/OldTradeLicenseDeletion.php` (`INFORM_ABOUT_ALMOST_EXPIRED_IN_DAYS = 7`)
- `src/Module/Spacecraft/Lib/Interaction/InteractionChecker.php#checkPosition` (gleicher Ort)

## SWU-Pfade

- Modul `apps/backend/src/modules/trade/` aus tmw-T1a
- `apps/backend/src/modules/spacecraft/transfer.service.ts`, `entities/cargo-item.entity.ts` (Zahlung aus dem Frachtraum)
- `apps/backend/src/modules/messaging/messaging.service.ts` (Ordner `TRADE`)
- Wartung: sh-AP-07 (falls vorhanden), sonst eigener täglicher Cron in `apps/backend/src/modules/tick/`
- Frontend: `apps/frontend/src/pages/trade.tsx`, `apps/frontend/src/pages/spacecraft-detail.tsx` (Handelsmenü-Einstieg)

## Akzeptanzkriterien

- [ ] `TradePostPresencePolicy.isAt(ship, post)` ist erfüllt, wenn das Schiff am selben `SpaceLocation` wie der Posten steht, nicht im Hyperraum bzw. `IN_FLIGHT` ist und nicht getarnt (sobald Tarnung existiert). Laut Entscheidung in tmw-T3 (Option a, 2026-10-21) genügt Feld-Kopräsenz; Docking wird nicht verlangt.
- [ ] Der Eigentümer setzt per `PUT trade/posts/:id/license-info` die Lizenzbedingung (Validierung 1–365 Tage, Menge ≥ 1, handelbare Ware). Neue Bedingungen gelten nur für neue Käufe.
- [ ] Mit `POST trade/posts/:id/licenses` kauft der Spieler eine Lizenz, entweder per `{ method: 'ship', shipId, payShipId }` oder per `{ method: 'account', accountPostId }`. Alle STU-Prüfungen gelten. Die Bezahlung wird dem Konto des Eigentümers gutgeschrieben, die Lizenz läuft bis `jetzt + Tage`, und der Eigentümer erhält eine Nachricht. Ist der Eigentümer ein NPC, wird nichts gutgeschrieben, ein Log genügt.
- [ ] Verlängern ist nur aus dem Konto am Posten möglich und verlängert ab dem aktuellen Ablauf.
- [ ] Ein täglicher Job löscht abgelaufene Lizenzen und schickt 7 Tage vor Ablauf eine Warnnachricht (einmalig).
- [ ] `GET trade/licenses` (eigene Lizenzen mit Ablauf) und `GET trade/posts/:id/licenses` (für den Eigentümer: Lizenznehmer). Die Handelsseite zeigt „Lizenzen“ und „Lizenz kaufen bzw. verlängern“. Das Schiffsdetail zeigt am Posten „Handelsmenü“ mit Lizenzkauf.
- [ ] Backend-Tests: alle Ablehnungsfälle (falscher Ort, fremdes Zahlschiff, zu wenig Ware, falsches Netz, Doppel-Lizenz), Verlängerung, Ablauf und Warnung. Frontend-Tests: Lizenzliste und Kaufdialog.

## Comments
