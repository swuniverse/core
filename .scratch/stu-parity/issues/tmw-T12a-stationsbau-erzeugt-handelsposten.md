# Spielerbetriebene Handelsposten: Stationsbau erzeugt Posten

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-STAT-0, sc-WP-STAT-1b, tmw-T4a

## Ziel

Wird eine Station der Handelsposten-Rolle fertiggestellt (STU: `OUTPOST`; die SWU-Rolle nach der Entscheidung zu sc-WP-STAT-0), entsteht automatisch ein Handelsposten. Er ist an die Station gebunden, das Netz entspricht der Spieler-ID des Eigentümers, mit Level 1, Transferkapazität 0, Lager 10.000 und Name „Handelsposten“. Der Eigentümer erhält eine unbefristete Lizenz. Ab da funktionieren alle Handelsfunktionen (tmw-T2 bis tmw-T6) auch am Spielerposten.

## STU-Quellen

- `src/Component/Station/StationUtility.php#createTradepostAndLicense` (Werte siehe oben, Lizenz bis max. Zeitstempel)
- `src/Orm/Entity/TradePost.php` (`station_id`)

## SWU-Pfade

- Stationsbau aus sc-WP-STAT-1b (Abschluss-Hook), Rollenmodell aus sc-WP-STAT-0
- Modul `apps/backend/src/modules/trade/` (`TradePost.stationId` aus tmw-T1), `TradePostPresencePolicy` (Ort der Station)

## Akzeptanzkriterien

- [x] Beim Abschluss des Stationsbaus mit Handelsposten-Rolle wird in derselben Transaktion ein Posten mit den STU-Werten und eine unbefristete Eigentümerlizenz angelegt. Bei anderen Rollen entsteht kein Posten.
- [x] Die Postenposition folgt der Station. Ortsabfragen nutzen den Ort der Station.
- [x] Der Posten erscheint in `/trade`, in der Datenbankkategorie „Handelsstationen“ (tmw-D6a) und im Postennetz des Eigentümers.
- [x] Der Eigentümer kann die Lizenzbedingung setzen (tmw-T2). Andere Spieler können am Posten Lizenzen kaufen.
- [x] Backend-Tests: Postenerzeugung nur für die passende Rolle, Werte, Eigentümerlizenz, Handel am Spielerposten Ende zu Ende (Lizenz kaufen, einzahlen, Angebot).

## Comments

- 2026-10-30: Blockiert durch die noch nicht umgesetzten Child-Issues `tmw-T2a` bis `tmw-T2d` (alle `ready-for-agent`). Im aktuellen Produktcode existieren weder `TradeLicense`/Lizenzbedingung noch `TradePostPresencePolicy`, Kauf- oder Angebots-API. Damit können die geforderte unbefristete Eigentümerlizenz, die konfigurierbare Lizenzbedingung, Fremdkäufe und der Ende-zu-Ende-Handel nicht implementiert oder getestet werden, ohne den Scope der ausgewählten Issue zu verlassen. Bitte `Blocked by` auf die tatsächlich benötigten Child-Issues umstellen und T12a erst nach deren Auflösung wieder freigeben.
- 2026-11-09: needs-info bleibt: Lizenzkauf, Einzahlung und Angebot für den geforderten End-to-End-Test fehlen. tmw-T4a setzt tmw-T3 und damit tmw-T2d samt Lizenzkauf und Presence-Policy voraus; der Parent-Split ist keine Implementierung.
- 2026-11-13: Entscheidung des Product Owners: wie in STU (`UserConstants::USER_FIRST_ID = 100`) beginnen Spieler-IDs bei 100. Damit kollidiert die Netz-ID eines Spielerpostens (= Spieler-ID) nie mit den NPC-Netzen 1–3. Die Vorarbeiten (tmw-T2a–T2d, T3, T4a, sc-WP-STAT-0/1b) sind erledigt; needs-info aufgehoben.
- 2026-11-13: Umgesetzt (e5e4a545).
  - Migration `20261113160000-start-user-ids-at-100`: Sequenz `users_id_seq` startet bei 100 (bestehende höhere IDs bleiben unberührt).
  - `PlayerTradePostService.createForStation` nach STU `StationUtility#createTradepostAndLicense` in der Abschluss-Transaktion des Stationsausbaus (`StationConstructionService`), nur für die Rolle `OUTPOST`: Name „Handelsposten“, Netz = Eigentümer-ID, Level 1, Transferkapazität 0, Lager 10.000, `stationId`, Ort der Station; unbefristete Eigentümerlizenz (bis 9999-12-31). Idempotent je Station.
  - Ein Posten je Feld (`trade_posts.locationId` eindeutig): Der Ausbau zum Außenposten wird auf einem Feld mit Handelsposten abgelehnt („An diesem Ort befindet sich bereits ein Handelsposten“).
  - Postenposition folgt der Station: Stationen sind wie in STU nicht per Traktorstrahl erfassbar und bewegen sich nicht; Präsenz- und Ortsabfragen nutzen den gemeinsamen Ort.
  - Netzname für Spielernetze: „Handelsnetz von <Eigentümer>“ in der Datenbankkategorie „Handelsstationen“.
  - Tests: `player-trade-post.int-spec.ts` (IDs ab 100, STU-Werte und Eigentümerlizenz, keine Posten für andere Rollen, einmal je Station/Feld, Ende zu Ende: Liste in `/trade`, Lizenzbedingung nur durch den Eigentümer, Lizenzkauf durch Fremde, Einzahlen, Angebot), Unit-Tests für Ortsprüfung und Traktorregel; Mutationsprobe (Posten für jede Rolle) lässt den Rollentest scheitern.
  - Gates: Lint 0 Fehler (Warnungen in geänderten Dateien unverändert), Typecheck und Build grün; Backend-Unit 2083/2084, Frontend 745/746 – die einzelnen Fehler sind die bekannten zeitabhängigen Flakes (`password-reset.service.spec.ts`, wechselnder Frontend-Spec), einzeln grün. Integration: Die Fehler in `starmap-contacts-requests.int-spec.ts` und `statistics.int-spec.ts` (26 Tests, `LayerAccessGuard` nicht auflösbar) bestehen unverändert auf dem Stand vor T12a.
