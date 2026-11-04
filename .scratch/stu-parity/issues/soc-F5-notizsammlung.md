# Notizen als Notizsammlung

**Status:** resolved
**Priority:** P3
**Size:** M
**Blocked by:** —

## Ziel

STU bietet mehrere Notizen mit Titel und Datum (Liste, Anlegen, Bearbeiten, Mehrfachlöschen). SWU hat einen einzelnen Freitext-Notizzettel mit Autosave (`User.notes`, max. 100.000 Zeichen). Ob das eine bewusste Vereinfachung ist, muss entschieden werden.

## STU-Quellen

- `src/Module/Notes/Action/SaveNote`, `DeleteNotes`
- `src/Module/Notes/View/Overview`, `ShowNote`, `ShowNewNote`
- `src/Orm/Entity/Note.php`
- `src/html/notes/notes.twig`, `note.twig`

## SWU-Pfade

- `apps/backend/src/modules/settings/settings.controller.ts` (`GET/PATCH user/notes`), `User.notes`
- `apps/frontend/src/pages/notes.tsx`, Header-Button „Notizzettel öffnen“

## Akzeptanzkriterien

- [x] Entity `notes` (Titel 1–100, Text, Datum), CRUD und Mehrfachlöschen.
- [x] Migration übernimmt den bisherigen Zettel als erste Notiz „Notizzettel“ (nur wenn nicht leer); `User.notes` entfällt danach.
- [x] Autosave bleibt; der Header-Button öffnet die Notizsammlung.
- [x] Backend- und Frontend-Tests.

## Entscheidung

Vorgabe: Variante (a). Notizsammlung wie STU (Titel, Text, Datum, Liste, Anlegen, Bearbeiten, Mehrfachlöschen); verlustfreie Migration des bisherigen Zettels.

## Comments

- 2026-10-21 Product Owner: Option a – Der Einzelzettel wird durch eine Notizsammlung wie in STU ersetzt; der bestehende Zettel wird als erste Notiz migriert.
- 2026-11-04 Verification: Alle Akzeptanzkriterien umgesetzt. RED beobachtet für Einzeltext statt Liste, fehlendes Anlegen/Ändern/Löschen, Autosave und Header sowie Migration/Rollback; zusätzliche REDs für Save-Reihenfolge beim Wechsel und Speichern nach Löschen. GREEN: direkte Jest-HTTP-/PostgreSQL-Tests 20/20, Migration/Rollback 5/5 (isolierte PG16-Schemas; Unicode, Leertext, 100.000 Zeichen, Eigentümerschutz); Vitest Notizen 14/14 und Header 10/10; Backend-Regressionen 41/41. `npx tsc -b packages/shared/tsconfig.lib.json apps/backend/tsconfig.app.json apps/frontend/tsconfig.app.json`, fokussierte Test-Typechecks, direkte ESLint-Prüfungen und `git diff --check` erfolgreich. Nx unter npm durch pnpm-Lockfile/fehlende `.modules.yaml` blockiert; keine Paketmanagerdateien verändert. Gesamt-Test-Typechecks melden bestehende Fehler außerhalb soc-F5; ESLint überspringt die Nx-Graph-Regel, bestehende Auth-/Header-Warnungen bleiben. Rollback stellt einen einzelnen „Notizzettel“ exakt wieder her, sonst sämtliche Notizdaten als JSON im alten Textfeld (ohne Kürzung; vorhandener Text wird erhalten).
