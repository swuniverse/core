# Handelslizenzen: transaktionaler Kauf

**Status:** resolved
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

- [x] `POST trade/posts/:id/licenses` akzeptiert `{ method: 'ship', shipId, payShipId }` oder `{ method: 'account', accountPostId }`.
- [x] Das initiierende eigene Schiff erfüllt die Presence-Policy aus tmw-T2a; das Zahlschiff gehört dem Käufer und befindet sich ebenfalls am Posten.
- [x] Kontozahlung ist nur aus einem eigenen Warenkonto auf einem Posten desselben Netzes zulässig.
- [x] Unbekannte Zahlart, ungültige Quelle, falsches Netz und unzureichender Bestand brechen ohne Lizenz, Gutschrift oder Erfolgsmeldung ab.
- [x] Abbuchung, Gutschrift und Lizenzerzeugung erfolgen in einer gemeinsamen Datenbanktransaktion mit geeigneten Sperren.
- [x] Die Zahlung wird dem Warenkonto des Posteneigentümers am lizenzierten Posten gutgeschrieben. Das gilt auch für NPC-Eigentümer.
- [x] Der Eigentümer erhält nach erfolgreichem Kauf genau eine Nachricht im Ordner „Handel“.
- [x] Backend-Tests decken beide Zahlarten, falschen Ort, fremde Quelle, falsches Netz, zu wenig Ware, Parallelität und Wiederholung ab.

## Entscheidung

SWU übernimmt das STU-Zahlungsmodell, korrigiert aber fehlende Autorisierungen, unbezahlte Erfolgswege und nicht-atomare Buchungen.

## Comments

Abbruch am verpflichtenden Prüf-Gate: Die fokussierten Handelslizenztests und alle Builds sind grün, aber `npx nx affected -t lint typecheck test --base=HEAD` scheitert auch nach zwei Läufen an fachfremden bestehenden Spacecraft-Tests (`spacecraft-core-controls.spec.ts`: `shipRepo.findOneBy is not a function`; `spacecraft-fleet.service.spec.ts`: `socket failed`). Der Produktcode wurde gemäß Abbruchregel verworfen. Bitte die Testbaseline reparieren oder eine explizite Baseline-Ausnahme für diese beiden Fehler bestätigen.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Spacecraft-Repository- und Flotten-Testbaseline); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
- 2026-11-12: Umgesetzt. `TradeLicensePurchaseService` (`trade/trade-license-purchase.service.ts`) und `POST trade/posts/:id/licenses`. Eine Transaktion mit fester Sperrreihenfolge (Posten → bestehende Lizenz → beteiligte Schiffe nach ID → Zahlquelle → Eigentümerkonto); Abbuchung, Gutschrift auf das Warenkonto des Posteneigentümers (auch NPC, wie STU `upperStorage` ohne Kapazitätsprüfung) und Lizenz werden gemeinsam geschrieben. Die Nachricht im Ordner „Handel" wird in der Transaktion angelegt, die Live-Benachrichtigung folgt nach dem Commit; bei Abbruch entsteht weder Lizenz noch Gutschrift noch Meldung. Leere Fracht- bzw. Kontozeilen werden entfernt.
  - Festlegung 1 (Autorisierung korrigiert): Auch die Kontozahlung verlangt ein initiierendes eigenes Schiff am Posten, Body `{ method: 'account', shipId, accountPostId }`. In STU lief der Kauf immer aus dem Handelsmenü eines Schiffs am Posten; ohne diese Bedingung wäre ein Fernkauf möglich.
  - Festlegung 2: Eine noch gültige Lizenz bricht den Kauf ab (Verlängerung ist `tmw-T2c`). Eine abgelaufene, noch nicht bereinigte Lizenz wird in derselben Zeile neu ausgestellt (Beginn, Ablauf, Warnzeitpunkt zurückgesetzt). Kein globaler Lizenzdeckel, wie in `tmw-T2a` entschieden.
  - Prüfungen: `trade-license-purchase.int-spec.ts` (10 Tests gegen PostgreSQL: beide Zahlarten, Selbstzahlung, falscher Ort/Flug/Hyperantrieb, fremde Quelle, falsches Netz, zu wenig Ware, unbekannte Zahlart, Wiederholung, Parallelität, abgelaufene Lizenz, NPC-Eigentümer, Posten ohne Bedingung); Mutationsprobe (Netzprüfung entfernt) lässt den Netztest scheitern. Handels-Entitäten in die Integrations-Datenquelle aufgenommen. `nx run-many -t lint typecheck build -p shared backend frontend` grün (Warnungen unverändert); Backend 2021/2021.
