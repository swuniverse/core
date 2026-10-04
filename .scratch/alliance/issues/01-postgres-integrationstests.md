# 01: Integrationstests gegen Postgres einrichten

**What to build:** Entwickler können Backend-Tests gegen eine echte Postgres-16-Datenbank schreiben, auf der alle Migrationen ausgeführt sind. Damit lassen sich Datenbank-Constraints und gleichzeitige Zugriffe prüfen, was mit Mocks nicht geht. Spezifikation: `.scratch/alliance/spec.md` (Testing Decisions, Teststelle 2).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Es gibt ein eigenes Jest-Target für Integrationstests im Backend. Es ist vom normalen `test`-Target getrennt, und das normale Target läuft weiterhin ohne Datenbank.
- [x] Die Datenbank kommt bevorzugt aus Testcontainers (Postgres 16 wie in docker-compose). Alternativ lässt sich über eine Umgebungsvariable eine vorhandene Postgres-Instanz angeben.
- [x] Vor der Suite laufen alle bestehenden Migrationen. Jeder Test startet mit sauberem Zustand, z. B. per Transaktion mit Rollback oder per Truncate.
- [x] Ein Smoke-Test gegen eine bestehende Tabelle (z. B. Spieler anlegen und lesen) ist grün.
- [x] Ein kurzer Hinweis in der Entwickler-Doku bzw. im Repo erklärt, wie man das Target lokal ausführt.

## Comments

Implemented in commit 13590f6 (feat(alliance): add alliances).
