# Handelsranglisten: aktivste Handelsposten, Aurodium aus Konten

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** tmw-T4b, tmw-D2

## Ziel

Die Datenbank-Rangliste „Die 10 aktivsten Handelsposten“ zählt die Angebotsannahmen der letzten 7 Tage je Posten. Die Aurodium-Rangliste aus tmw-D2 („Die 10 Günstlinge der Hutten“) bezieht zusätzlich die Aurodium-Bestände in Warenkonten und Angebotsreserven ein.

## STU-Quellen

- `src/Module/Database/View/TradePostActivity/*`, `src/Module/Database/Lib/DatabaseTopActivTradePost.php`
- `src/Orm/Repository/TradeTransactionRepository.php` (Transaktionen der letzten 7 Tage je Posten, Top 10)
- `src/Module/Database/View/LatinumRanking/*` (Konten werden einbezogen)

## SWU-Pfade

- `apps/backend/src/modules/database/database.service.ts` (`rankings/:key`), Quellenliste der Aurodium-Rangliste aus tmw-D2
- `TradeTransaction` und Speicherdienst aus tmw-T1/T4b
- `apps/frontend/src/pages/database.tsx` (Untergruppe „Handel“)

## Akzeptanzkriterien

- [x] `GET database/rankings/trade-posts` liefert die Top 10 Posten nach Transaktionen der letzten 7 Tage (Postenname, Netz, Anzahl).
- [x] Die Aurodium-Rangliste summiert Kolonien, Schiffe, Warenkonten und Angebotsreserven. NPCs sind ausgeschlossen.
- [x] Der Hub-Eintrag „Die 10 aktivsten Handelsposten“ steht unter „Handel“.
- [x] Backend-Tests: 7-Tage-Fenster, Sortierung, Kontobestände in der Aurodium-Rangliste. Frontend-Test: Hub-Eintrag und Tabelle.

## Comments

- 2026-11-13: Umgesetzt.
  - `GET database/rankings/trade-posts` („Die 10 aktivsten Handelsposten“): `TradePostActivityRanking` zählt `trade_transactions` der letzten 7 Tage je Posten, sortiert nach Anzahl, bei Gleichstand nach Posten-ID, Top 10. Die Antwort ist anonym (`kind: 'trade-posts'`, Postenname, Handelsnetz, Anzahl, kein eigener Platz).
  - Aurodium-Rangliste: neue Quellen `TradeAccountAurodiumRankingSource` (Warenkonten) und `TradeOfferAurodiumRankingSource` (Angebotsreserven `reservedAmount` offener Angebote über Ware 50) im Quellen-Port aus tmw-D2; NPCs ausgeschlossen.
  - Fund nebenbei: Der Controller ließ `rpg` und `aurodium` aus tmw-D2 nie durch (HTTP 404 trotz Hub-Eintrag). Beide sind jetzt zusammen mit `trade-posts` freigeschaltet und per Controller-Test abgesichert.
  - Frontend: Hub-Eintrag „Die 10 aktivsten Handelsposten“ unter „Handel“; die Tabelle zeigt #, Handelsposten, Handelsnetz und Transaktionen (7 Tage). Die Netznamen kommen aus derselben Hilfsfunktion wie die Liste der Handelsstationen.
  - Tests: `trade-rankings.int-spec.ts` (7-Tage-Fenster mit Grenzfällen, Sortierung, Limit 10, Konto- und Reservesummen ohne NPC und ohne andere Waren), `database-ranking.spec.ts`, Controller-Test, `database.spec.tsx`. Die Mutationsprobe (8- statt 7-Tage-Fenster) lässt den Fenstertest scheitern.
