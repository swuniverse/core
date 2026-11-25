# Worktree über just up mit bestehenden Daten starten

Type: task
Status: resolved
Label: ready-for-agent

## Acceptance criteria

- [x] Lokale Konfiguration verfügbar, ohne Zugangsdaten auszugeben.
- [x] just up verwendet standardmäßig das vorhandene Entwicklungsdatenverzeichnis.
- [x] Explizit ein eigener Datenpfad möglich.
- [x] Bestehende Fraktionen und Sternenkartendaten vorhanden; Backend ONLINE.

## Answer

Die `.env` ist lokal verknüpft. `Justfile` ermittelt den ursprünglichen Checkout über `git --git-common-dir` und exportiert `SWU_DEV_POSTGRES_DATA`; Docker Compose verwendet diesen Pfad. Das versehentlich angelegte leere Worktree-Datenverzeichnis bleibt erhalten. Der Datenbankcontainer wurde mit dem ursprünglichen PostgreSQL-16-Verzeichnis neu erstellt. Keine Migrationen, keine Datenlöschung und keine Kartenänderungen.

## Comments

2026-11-25: Vom Hauptagenten direkt umgesetzt (laufende Sitzung, sensible Daten-/Startkonfiguration). Geprüft: Just-Dry-Run, Compose-Bind-Pfad, Schema und Bestandszählungen (2 Fraktionen, 40 Systeme, 1.600 Galaxiefelder), Backend HTTP 200 / ONLINE und Nebel-Endpunkt ohne Anmeldung HTTP 401. Keine breite Testsuite wiederholt, da ausschließlich lokale Startkonfiguration verändert wurde. [Nachweise](../verification.md). Commit-Subject: `fix(dev): reuse existing database when starting a worktree`.
