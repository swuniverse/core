# Spielerbetriebene Handelsposten: Stationsbau erzeugt Posten

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** sc-WP-STAT-0, sc-WP-STAT-1b, tmw-T2

## Ziel

Wird eine Station der Handelsposten-Rolle fertiggestellt (STU: `OUTPOST`; die SWU-Rolle nach der Entscheidung zu sc-WP-STAT-0), entsteht automatisch ein Handelsposten. Er ist an die Station gebunden, das Netz entspricht der Spieler-ID des Eigentümers, mit Level 1, Transferkapazität 0, Lager 10.000 und Name „Handelsposten“. Der Eigentümer erhält eine unbefristete Lizenz. Ab da funktionieren alle Handelsfunktionen (tmw-T2 bis tmw-T6) auch am Spielerposten.

## STU-Quellen

- `src/Component/Station/StationUtility.php#createTradepostAndLicense` (Werte siehe oben, Lizenz bis max. Zeitstempel)
- `src/Orm/Entity/TradePost.php` (`station_id`)

## SWU-Pfade

- Stationsbau aus sc-WP-STAT-1b (Abschluss-Hook), Rollenmodell aus sc-WP-STAT-0
- Modul `apps/backend/src/modules/trade/` (`TradePost.stationId` aus tmw-T1), `TradePostPresencePolicy` (Ort der Station)

## Akzeptanzkriterien

- [ ] Beim Abschluss des Stationsbaus mit Handelsposten-Rolle wird in derselben Transaktion ein Posten mit den STU-Werten und eine unbefristete Eigentümerlizenz angelegt. Bei anderen Rollen entsteht kein Posten.
- [ ] Die Postenposition folgt der Station. Ortsabfragen nutzen den Ort der Station.
- [ ] Der Posten erscheint in `/trade`, in der Datenbankkategorie „Handelsstationen“ (tmw-D6a) und im Postennetz des Eigentümers.
- [ ] Der Eigentümer kann die Lizenzbedingung setzen (tmw-T2). Andere Spieler können am Posten Lizenzen kaufen.
- [ ] Backend-Tests: Postenerzeugung nur für die passende Rolle, Werte, Eigentümerlizenz, Handel am Spielerposten Ende zu Ende (Lizenz kaufen, einzahlen, Angebot).

## Comments
