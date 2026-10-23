# Handels-Domänenmodell und Warenkontenspeicher

**Status:** resolved
**Priority:** P1
**Size:** S
**Blocked by:** tmw-W1

## Ziel
Persistentes Handelsmodell und transaktionssicherer Speicher. Lizenzen gehören ausschließlich tmw-T2.

## Akzeptanzkriterien
- [x] Entitäten für Posten, Konten, Angebote, Transfers und Transaktionen samt Migration.
- [x] Bestand, Belegung, freier Platz sowie Schutz vor Überlauf/Nebenläufigkeit.
- [x] Posten-Defaults: Level 1, Lagerlimit 10000, Transferkapazität 200.

## Comments

- Persistentes Handelsfundament unter `apps/backend/src/modules/trade/` ergänzt: Posten, Warenkonten, reservierte Angebote, Transfers und Transaktionen samt Migration und Modulregistrierung. Der transaktionale `TradeStorageService` sperrt Posten und Kontenzeile pessimistisch, zählt Kontobestand plus Angebotsreserve und verhindert Unter- sowie Überlauf; vier fokussierte Tests decken Kapazität und Sperrpfad ab. Lizenzen und NPC-Posten bleiben wie geplant in tmw-T2 bzw. tmw-T1b.
