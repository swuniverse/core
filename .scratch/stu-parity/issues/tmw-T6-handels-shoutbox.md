# Handels-Shoutbox je Netzwerk

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** tmw-T2c

## Ziel

Jedes Handelsnetz hat eine Shoutbox: eine kurze Chatliste mit den letzten Einträgen. Schreiben und Lesen darf, wer eine Lizenz an einem Posten des Netzes hat.

## STU-Quellen

- `src/Module/Trade/Action/AddShoutBoxEntry/*` (`hasLicenseByUserAndNetwork`, Länge, Bereinigung alter Einträge)
- `src/Module/Trade/View/ShowShoutBox/*`, `ShowShoutBoxList/*`
- `src/Orm/Entity/TradeShoutbox.php`

## SWU-Pfade

- Modul `apps/backend/src/modules/trade/`
- BBCode bzw. Textbereinigung: `apps/frontend/src/components/BbCodeText.tsx`, Muster aus `apps/backend/src/modules/holonet/`
- Frontend: `apps/frontend/src/pages/trade.tsx`

## Akzeptanzkriterien

- [x] Entität `TradeShoutboxEntry` (Netz, Spieler, Zeit, Text ≤ 200 Zeichen). `POST/GET trade/networks/:id/shoutbox` nur mit Lizenz im Netz. Je Netz werden die letzten 30 Einträge aufbewahrt (ältere werden gelöscht). Es gibt eine Ratenbegrenzung, und der Text wird von HTML bereinigt.
- [x] Die Handelsseite zeigt je Netz eine Shoutbox-Box (Zeit, Spielerlink, Text) mit Eingabefeld. Sie aktualisiert sich beim Öffnen und nach dem Senden.
- [x] Backend-Tests: Lizenzpflicht, Längen- und Anzahlgrenze, Bereinigung. Frontend-Test: Senden und Anzeige.

## Comments

- 2026-11-02: Umsetzung lokal vollständig (Entity/Migration, lizenzgeschützte GET/POST-API, HTML-Bereinigung, 200-Zeichen-/30-Einträge-Grenze, Rate-Limit und Handelsseiten-UI). Fokussierte Backend- und Frontend-Tests sowie alle Builds sind grün. Der verpflichtende `nx affected`-Gate bleibt nach zwei ernsthaften Läufen an fachfremden, bereits vorhandenen Backend-Baselinefehlern rot: Typecheck in `field-effect-consequence.spec.ts`, `wreck-decay.service.spec.ts` und `tutorial.service.spec.ts`; außerdem sechs bestehende Spacecraft-/Tick-Tests. Produktcode wurde gemäß Abbruchregel verworfen. Bitte Baseline reparieren und Issue erneut auf `ready-for-agent` setzen.
- 2026-11-09: Die integrierte Baseline 14b86081/c8e14f1c beseitigt den zuletzt dokumentierten fachfremden Blocker (Backend-Typecheck und Spacecraft-/Tick-Testbaseline); reguläre Nx-Lint-/Typecheck-/Build-Gates und vollständige Tests sind laut Baseline-Review grün, lokale Test-Spieldaten waren dafür vorhanden. Status ready-for-agent; vorhandene Issue-Abhängigkeiten bleiben verbindlich. Dies belegt keine Feature-Fertigstellung: verworfene Änderungen müssen neu umgesetzt und die aktuellen Issue-Tests und Pflicht-Gates erneut ausgeführt werden; keine Ausnahme.
- 2026-11-09: Die Netzberechtigung benötigt den Gültigkeits-/Ablaufvertrag aus tmw-T2c; dessen Kauf- und Modellvoraussetzungen gelten transitiv.
- 2026-11-13: Umgesetzt (neu, die Fassung vom 2026-11-02 war verworfen).
  - Entität `TradeShoutboxEntry` (Migration `20261113130000-add-trade-shoutbox`): Netz, Spieler (Löschung kaskadiert), Text ≤ 200 Zeichen, Zeit.
  - `GET`/`POST trade/networks/:id/shoutbox` (`TradeShoutboxService`) nur mit gültiger Lizenz an einem Posten des Netzes (STU `hasLicenseByUserAndNetwork`), sonst 403. Text wie STU `substr(strip_tags(...), 0, 200)`, aber in Zeichen statt Bytes, ohne Steuerzeichen und getrimmt; leere Nachrichten werden abgewiesen (STU verwirft sie still). Je Netz bleiben die neuesten 30 Einträge (STU `deleteHistory`). Ratenbegrenzung: höchstens 5 Einträge je Spieler und Netz pro Minute. Schreibvorgänge eines Netzes laufen unter einer Advisory-Sperre, damit Grenze und Rate auch bei Parallelität exakt sind. Netznamen kommen jetzt aus `trade/trade-network.ts`, das auch die Datenbank-Rangliste nutzt.
  - Kontolöschung: `TradeDeletionHandler` (tmw-T11b) entfernt auch die Shoutbox-Einträge des Spielers; der Hinweis am Handler nennt nur noch tmw-T8b und tmw-T9.
  - Frontend: Tab „Shoutbox“ mit einer Box je lizenziertem Netz (Zeit, Spielerlink `/players/:id`, Text, Eingabefeld mit 200 Zeichen); lädt beim Öffnen und zeigt nach dem Senden die vom Server gelieferte Liste.
  - Tests: `trade-shoutbox.int-spec.ts` (Liste, Lizenzpflicht inkl. abgelaufener Lizenz, HTML-Bereinigung und Kürzung, leere Nachricht, 30er-Grenze je Netz, Ratenbegrenzung, Grenze bei 8 parallelen Posts), `trade-deletion.int-spec.ts` erweitert, `trade.controller.spec.ts`, `TradeShoutboxTab.spec.tsx`. Mutationsproben (Netzsperre, HTML-Bereinigung entfernt) lassen Tests scheitern.
