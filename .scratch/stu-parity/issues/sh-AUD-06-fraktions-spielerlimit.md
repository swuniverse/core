# Spielerlimit je Fraktion wie STU, Registrierung prüft Wählbarkeit

**Status:** claimed
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

STU hat je Fraktion zwei Steuerwerte: `chooseable` (wählbar ja/nein) und `player_limit` (maximale Spielerzahl, `0` = unbegrenzt). Bei der Registrierung zählt STU die Spieler je Fraktion. Ist das Limit erreicht, zeigt die Fraktionswahl die Fraktion als voll an und die Registrierung wird abgelehnt.

SWU hat in tmw-FA1b1 (Option 1c) nur `isSelectable` übernommen, ohne Spielerlimit. Außerdem prüft `POST auth/register` `isSelectable` nicht: Die Fraktion wird schon bei der Registrierung gesetzt, nur die Existenz wird geprüft. Das Onboarding lehnt danach mit „Faction is already selected“ ab. `register.tsx` kennt `isSelectable` nicht und bietet alle Fraktionen an. Die Admin-Sperre ist für neue Spieler damit wirkungslos.

Der Product Owner hat am 2026-11-17 entschieden: **`playerLimit` wie STU einführen**. Das ersetzt Option 1c aus tmw-FA1b1.

Hinweis: `auth.service.ts#register` wird durch `origin/main` (`da02e52f`) umgeschrieben. Die Prüfung muss auf dem Stand nach dem Merge sitzen; sh-AUD-01 regelt den Merge. Wenn der Merge noch nicht erfolgt ist, die Prüfung in einer kleinen, gut mergebaren Hilfsfunktion im `faction`-Modul ablegen und in `register` nur aufrufen.

## STU-Quellen

- `src/Orm/Entity/Faction.php` (`chooseable`, `player_limit`)
- `src/Orm/Repository/FactionRepository.php` (Z. ~26–47, `getPlayableFactionsPlayerCount`: nur wählbare Fraktionen, Spieler ab erster Spieler-ID)
- `src/Module/Index/Lib/FactionItem.php` (Z. ~27–33, `hasFreePlayerSlots`)
- `src/Module/Index/Action/Register/Register.php` (Z. 40–54, Ablehnung bei unbekannter/nicht wählbarer oder voller Fraktion)
- `src/html/index/factionEntry.twig` (Anzeige `count/limit`, Hinweis „alle vorgesehenen Spielerslots belegt“)

## SWU-Pfade

- `apps/backend/src/modules/faction/entities/faction.entity.ts` (`isSelectable`, neues Feld `playerLimit`)
- `apps/backend/src/modules/faction/faction.service.ts`, `faction.controller.ts` (`GET`, `PATCH :id/selectability`), `faction/dto/*`
- `apps/backend/src/database/migrations/` (neue Migration: Spalte `playerLimit int not null default 0`)
- `apps/backend/src/modules/auth/auth.service.ts#register` (Z. ~333–410; nach Merge von `origin/main` andere Zeilen)
- `apps/backend/src/modules/onboarding/onboarding.service.ts` (Z. ~100–124, `selectFaction`)
- `apps/frontend/src/pages/register.tsx` (Fraktionsauswahl Z. ~28–35, ~250–276)
- `apps/frontend/src/pages/onboarding.tsx` (Fraktionswahl)
- `apps/frontend/src/pages/admin-factions.tsx` (Admin-Pflege)
- `packages/shared/src/lib/` (Fraktions-DTO um `playerLimit`, `playerCount`, `hasFreePlayerSlots`)

## Akzeptanzkriterien

- [x] Fraktion hat `playerLimit` (ganzzahlig, `0` = unbegrenzt, Default `0`), per Migration angelegt.
- [x] Gezählt werden Spieler der Fraktion ohne NPC (Spieler-IDs ab der ersten Spieler-ID, wie STU). Eine gemeinsame Funktion liefert `playerCount` und `hasFreePlayerSlots` (`limit = 0 || count < limit`).
- [x] Der Admin kann `playerLimit` je Fraktion in `admin-factions.tsx` setzen, neben `isSelectable`; Validierung `>= 0`.
- [x] Die öffentliche Fraktionsliste liefert `playerCount`, `playerLimit`, `isSelectable` und `hasFreePlayerSlots`. Registrierung und Onboarding zeigen bei gesetztem Limit „n/Limit“ und markieren volle Fraktionen mit „voll“ (Hinweis wie STU: alle vorgesehenen Spielerplätze belegt); volle oder nicht wählbare Fraktionen sind nicht auswählbar.
- [x] `POST auth/register` lehnt nicht wählbare und volle Fraktionen serverseitig ab, mit deutscher Meldung. Die Prüfung läuft in derselben Transaktion wie das Anlegen des Kontos (kein Überbuchen bei gleichzeitigen Registrierungen, z. B. Sperre auf der Fraktionszeile).
- [x] `POST onboarding/faction` prüft dieselben Bedingungen über dieselbe Funktion.
- [x] `map.md`: Entscheidung tmw-FA1b1 (Option 1c, „kein playerLimit“) ersetzt, mit Verweis auf dieses Ticket.
- [x] Backend-Tests: Limit 0 unbegrenzt; Limit erreicht ⇒ Ablehnung bei Registrierung und Onboarding; `isSelectable = false` ⇒ Ablehnung bei direktem `POST auth/register`; gleichzeitige Registrierungen überbuchen nicht (PostgreSQL-Integrationstest); Admin-Validierung.
- [x] Frontend-Tests: Registrierung zeigt „n/Limit“ und „voll“, nicht wählbare/volle Fraktion nicht auswählbar; Admin-Feld speichert.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt B6, Abschnitt D (tmw-FA1b1), Abschnitt G (Zeile „Fraktionen ohne `playerLimit`“ und Erläuterung) und Abschnitt N2.
- [`../audit-2026-11-17/shell-admin-runtime.md`](../audit-2026-11-17/shell-admin-runtime.md), G4 und Seitenabgleich `registration.twig`.
- PO-Entscheidung 2026-11-17: `playerLimit` wie STU, ersetzt Option 1c. Das resolved Ticket tmw-FA1b1 erfüllt sein AK „direkte Requests können die Sperre nicht umgehen“ nicht für `POST auth/register`.

## Comments

### 2026-11-24 — umgesetzt, Prüfung ausstehend

- Commit: `feat(faction): STU player limit per faction (stu-parity sh-AUD-06)`.
- Backend: Migration `20261124140000-add-faction-player-limit` (`playerLimit int not null default 0`); `lockJoinableFaction` in `faction.service.ts` lädt die Fraktion mit `pessimistic_write`, lehnt unbekannte, nicht wählbare und volle Fraktionen deutsch ab; `register` (in seiner Transaktion) und `onboarding.selectFaction` (jetzt in Transaktion) rufen sie auf. `PATCH factions/:id/player-limit` (Admin, `IsInt`, `Min(0)`). `GET factions` liefert `playerLimit`, `playerCount`, `isSelectable`, `hasFreePlayerSlots`.
- Zählung geändert: `playerCount` zählt jetzt wie STU alle Nicht-NPC-Konten der Fraktion (vorher ohne Admins und unbestätigte Konten; der alte Filter überschrieb zudem per `.where` den NPC-Ausschluss). Unbestätigte Konten belegen damit Plätze, bis die Inaktivitätslöschung sie entfernt (wie STU).
- Fraktionsdaten bleiben lokale Frontend-Typen wie bisher, kein neuer Shared-DTO.
- Frontend: Registrierung blendet nicht wählbare Fraktionen aus, zeigt „n/Limit Siedler – voll“ und sperrt volle; Onboarding zeigt „n/Limit – voll“ samt Hinweis und sperrt; Admin-Seite mit Feld „Spielerlimit“ (Speichern beim Verlassen, Prüfung ≥ 0).
- Tests: Backend-Unit `auth.service.spec` (+3: nicht wählbar, voll, unter Limit/Limit 0), `onboarding.service.spec` (angepasst), `faction.service.spec` (+4 DTO-Validierung) – 33/33; PostgreSQL `faction-player-limit.int-spec.ts` (paralleles Überbuchen, Limit 0) 2/2; Vitest `register`, `onboarding`, `admin-factions` 9/9; `nx typecheck backend frontend` ✓; ESLint 0 Fehler.
- Ausstehend: gesammelter Verifikationslauf.
- Modell: Claude Opus 5.5 direkt (Transaktion/Nebenläufigkeit, kein Delegieren).
