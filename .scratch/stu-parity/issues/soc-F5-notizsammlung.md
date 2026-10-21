# Notizen als Notizsammlung

**Status:** ready-for-agent
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

- [ ] Entity `notes` (Titel 1–100, Text, Datum), CRUD und Mehrfachlöschen.
- [ ] Migration übernimmt den bisherigen Zettel als erste Notiz „Notizzettel“ (nur wenn nicht leer); `User.notes` entfällt danach.
- [ ] Autosave bleibt; der Header-Button öffnet die Notizsammlung.
- [ ] Backend- und Frontend-Tests.

## Entscheidung

Vorgabe: Variante (a). Notizsammlung wie STU (Titel, Text, Datum, Liste, Anlegen, Bearbeiten, Mehrfachlöschen); verlustfreie Migration des bisherigen Zettels.

## Comments

- 2026-10-21 Product Owner: Option a – Der Einzelzettel wird durch eine Notizsammlung wie in STU ersetzt; der bestehende Zettel wird als erste Notiz migriert.
