# Verifikation — 2026-11-24

Workspace: `/Users/TMUNDIN/.codex/worktrees/f185/core`, Branch `codex/starmap-nebula`.

## Ergebnis

- Frontend vollständig: **148 Dateien, 1.046 Tests erfolgreich** (Vitest, maxWorkers=4).
- Backend vollständig: **272 Suites, 2.781 Tests, 1 Snapshot erfolgreich** (Jest, runInBand).
- PostgreSQL: **6 Nebel-Integrationstests** und **53 vorhandene Tests** für Ressourcensammlung/-umwandlung erfolgreich.
- Typprüfung: `tsc -b packages/shared/tsconfig.lib.json apps/backend/tsconfig.app.json apps/frontend/tsconfig.app.json` erfolgreich.
- Produktionsbuilds: `vite build --config apps/frontend/vite.config.mts` und `nx build backend --skip-nx-cache` einschließlich Shared-Build erfolgreich.
- ESLint der betroffenen Implementierungsdateien ohne Fehler; bestehende und interne Non-null-Assertion-Warnungen. Diffprüfung ohne Whitespacefehler.

## Nachgewiesenes Verhalten

Reproduzierbare, zusammenhängende Wolken; begrenzte Dichtestufen; kleine und rechteckige Karten; Schutzabstände für Startsysteme, Routen, Wurmlöcher, Objekte, belegte Felder und Systemränder. Vorschau ohne Schreibzugriff; MAP_EDITOR-Berechtigung; konsistente Feldwerte; Ablehnung veralteter Vorschauen; wiederholtes Anwenden ohne Erweiterung; vollständiger Rollback; höchstens eine Anwendung bei gleichzeitigen Requests. Einheitliche Terrainbilder; Nebel unter Objektmarkierungen; keine Bilder auf unbekannten Feldern; kein Galaxiebild-Ladevorgang; keine verspäteten Inserts in zerstörte Karten. Editor-Vorschau und Apply-Vertrag, Invalidierung nach Einstellungen, Schichtbindung, Sternmarker und Fehlerzustände automatisiert geprüft.

## Ablauf und Grenzen

Die Tests liefen in der schreibbaren Staging-Kopie `/private/tmp/swu-starmap-nebula-stage`, deren geänderte Dateien mit dem verwalteten Workspace byteweise verglichen wurden. Assets (`e13201cf`) und Game-Data (`18e5dc96`) wurden aus den lokalen Repositories auf den Gitlink-Ständen initialisiert; keine Submodule verändert. Abhängigkeiten werden aus dem vorhandenen `node_modules` verwendet.

Der erste breite Backend-Lauf wurde wegen fehlender Submodule abgebrochen und nach Initialisierung vollständig erfolgreich wiederholt. Der erste breite Frontend-Lauf erkannte eine Asteroiden-Bildreihenfolgeänderung; diese wurde korrigiert, gezielt und im vollständigen Lauf erfolgreich nachgeprüft. Der lokale Headless-Browser konnte auch mit Sandbox-Freigabe nicht gestartet werden; ein optionaler Screenshot liegt daher nicht vor. Ein Test-inclusive TypeScript-Lauf des Coding-Agenten meldete vorhandene Canvas-Kontexttypen in anderen Specs; die erforderliche App-Typprüfung ist erfolgreich. Keine manuellen Nutzerprüfungen ausstehend.

Keine Bestandsmigration, kein Weltreset und keine Anwendung auf eine Live-Karte durchgeführt.

## Worktree-Startkorrektur — 2026-11-25

Beim ersten lokalen Start fehlte die ignorierte `.env` im neuen Workspace; sie wurde mit der vorhandenen lokalen Konfiguration des ursprünglichen Checkouts verknüpft. Die Verbindung wurde ohne Ausgabe von Zugangsdaten durch `SELECT 1` geprüft. Anschließend zeigte sich, dass der relative Docker-Bind-Mount ein neues, leeres Datenverzeichnis im Worktree angelegt hatte. Das ursprüngliche PostgreSQL-16-Datenverzeichnis blieb erhalten.

`Justfile` exportiert nun `SWU_DEV_POSTGRES_DATA` standardmäßig aus dem gemeinsamen Git-Verzeichnis des ursprünglichen Checkouts. `docker-compose.dev.yml` verwendet diesen einstellbaren Pfad. Nur `swuniverse-dev-db` wurde mit dem vorhandenen Datenverzeichnis neu erstellt; keine Datenverzeichnisse gelöscht, keine Migrationen oder Kartenänderungen ausgeführt. Ein explizites `SWU_DEV_POSTGRES_DATA` erlaubt weiterhin eine eigene Entwicklungsdatenbank.

Nachweise: `just --dry-run infra-detached`; ausgewerteter Just-Pfad und Docker-Compose-Konfiguration zeigen das ursprüngliche Verzeichnis; PostgreSQL enthält `factions`, `migrations`, `star_systems` und 2 Fraktionen / 40 Sternensysteme / 1.600 Galaxiefelder. Der laufende Backend-Prozess antwortet auf `/api/game-status` mit HTTP 200 und `ONLINE`; der Nebel-Vorschau-Endpunkt antwortet ohne Anmeldung mit HTTP 401. Der eigene wartende Startversuch wurde beendet, der bereits laufende Backend-Prozess blieb online. Diffprüfung erfolgreich.
