# Handelsranglisten: aktivste Handelsposten, Aurodium aus Konten

**Status:** ready-for-agent
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

- [ ] `GET database/rankings/trade-posts` liefert die Top 10 Posten nach Transaktionen der letzten 7 Tage (Postenname, Netz, Anzahl).
- [ ] Die Aurodium-Rangliste summiert Kolonien, Schiffe, Warenkonten und Angebotsreserven. NPCs sind ausgeschlossen.
- [ ] Der Hub-Eintrag „Die 10 aktivsten Handelsposten“ steht unter „Handel“.
- [ ] Backend-Tests: 7-Tage-Fenster, Sortierung, Kontobestände in der Aurodium-Rangliste. Frontend-Test: Hub-Eintrag und Tabelle.

## Comments
