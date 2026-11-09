# Spielerbetriebene Handelsposten: Stationsbau erzeugt Posten

**Status:** needs-info
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

- [ ] Beim Abschluss des Stationsbaus mit Handelsposten-Rolle wird in derselben Transaktion ein Posten mit den STU-Werten und eine unbefristete Eigentümerlizenz angelegt. Bei anderen Rollen entsteht kein Posten.
- [ ] Die Postenposition folgt der Station. Ortsabfragen nutzen den Ort der Station.
- [ ] Der Posten erscheint in `/trade`, in der Datenbankkategorie „Handelsstationen“ (tmw-D6a) und im Postennetz des Eigentümers.
- [ ] Der Eigentümer kann die Lizenzbedingung setzen (tmw-T2). Andere Spieler können am Posten Lizenzen kaufen.
- [ ] Backend-Tests: Postenerzeugung nur für die passende Rolle, Werte, Eigentümerlizenz, Handel am Spielerposten Ende zu Ende (Lizenz kaufen, einzahlen, Angebot).

## Comments

- 2026-10-30: Blockiert durch die noch nicht umgesetzten Child-Issues `tmw-T2a` bis `tmw-T2d` (alle `ready-for-agent`). Im aktuellen Produktcode existieren weder `TradeLicense`/Lizenzbedingung noch `TradePostPresencePolicy`, Kauf- oder Angebots-API. Damit können die geforderte unbefristete Eigentümerlizenz, die konfigurierbare Lizenzbedingung, Fremdkäufe und der Ende-zu-Ende-Handel nicht implementiert oder getestet werden, ohne den Scope der ausgewählten Issue zu verlassen. Bitte `Blocked by` auf die tatsächlich benötigten Child-Issues umstellen und T12a erst nach deren Auflösung wieder freigeben.
- 2026-11-09: needs-info bleibt: Lizenzkauf, Einzahlung und Angebot für den geforderten End-to-End-Test fehlen. tmw-T4a setzt tmw-T3 und damit tmw-T2d samt Lizenzkauf und Presence-Policy voraus; der Parent-Split ist keine Implementierung.
