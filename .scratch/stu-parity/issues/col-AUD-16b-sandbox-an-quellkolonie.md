# Kolonie-Sandbox an Quellkolonie gebunden und mit ihr gelöscht

**Status:** claimed
**Priority:** P2
**Size:** S
**Blocked by:** col-AUD-16a

## Ziel

In STU hängt eine Sandbox fest an ihrer Quellkolonie (`colony_id NOT NULL`). Wird die Kolonie zurückgesetzt, löscht `ColonyResetter` ihre Sandboxen. In SWU überlebt die Sandbox als Snapshot die Quellkolonie (`sourceColonyId` nullable, `onDelete: SET NULL`). Nach PO-Entscheidung vom 2026-11-17 wird das an STU angeglichen.

## STU-Quellen

- `src/Orm/Entity/ColonySandbox.php` (`colony_id` NOT NULL, Z. 34/62)
- `src/Module/Colony/Lib/ColonyResetter.php` (Z. 76, `truncateByColony`)
- `src/Orm/Repository/ColonySandboxRepository.php`

## SWU-Pfade

- `apps/backend/src/modules/colony/entities/colony-sandbox.entity.ts` (`sourceColonyId` nullable, `onDelete: 'SET NULL'` Z. 28–32)
- `apps/backend/src/modules/colony/colony-sandbox.service.ts`, `colony-sandbox-preview.service.ts` (Sonderfall „ohne Quellkolonie“)
- `apps/backend/src/modules/colony/colony-abandonment.service.ts` (Kolonieaufgabe/Ruine, ADR-0007)
- Besitzerwechsel der Kolonie (Übernahme, Kolonieabgabe)
- `packages/shared/src/lib/colony/sandbox.ts` (`sourceColonyId: number | null`)
- `apps/backend/src/database/migrations` (neue Migration)

## Akzeptanzkriterien

- [x] `sourceColonyId` ist Pflicht. Die Fremdschlüsselregel ist `ON DELETE CASCADE`.
- [x] Wird eine Kolonie aufgegeben (Ruine), verliert sie ihren Besitzer oder wird sie gelöscht, werden alle Sandboxen dieser Kolonie gelöscht, wie STU `ColonyResetter`.
- [x] Die Migration löscht bestehende Sandboxen ohne Quellkolonie oder mit Quellkolonie eines anderen Besitzers. Die Anzahl wird im Migrationslog ausgegeben.
- [x] Sonderfälle „Sandbox ohne Quellkolonie“ in Service, Vorschau, DTO und UI werden entfernt (`sourceColonyId: number`).
- [x] Backend-Tests: Aufgabe der Kolonie löscht Sandboxen, Besitzerwechsel löscht Sandboxen, Migration (Integrationstest, falls Migrationstests vorhanden).
- [x] Frontend-Tests angepasst (`ColonySandboxPanel.spec.tsx`, `ColonySandboxPreview.spec.tsx`) ohne den Fall „Quelle entfernt“.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt J3 (Kolonie-Sandbox, Ticketpunkt „hängt an der Quellkolonie wie STU und wird mit ihr gelöscht“) und Abschnitt N2.
- PO-Entscheidung 2026-11-17: nur per Freigabe, wie STU.
- Ersetzt die `map.md`-Ergebnisnotiz zu col-G3a („Kopien … überleben die Quellkolonie“) und den Teil von col-G3c („Besitzerwechsel/Aufgabe/Löschung entfernen den Live-Vergleich“).

## Comments

- 2026-11-17: Aus dem Audit angelegt.

- 2026-11-20 umgesetzt, Prüfung ausstehend (Commit „feat(colony): bind sandboxes to their source colony (stu-parity col-AUD-16b)“). Umsetzung Claude Opus 5.5 direkt (Migration/Datenintegrität → Sol-Route; Sol/Luna nicht verfügbar).
  - Migration `20261120100000-bind-colony-sandboxes-to-source-colony`: löscht Sandboxen ohne eigene, nicht aufgegebene Quellkolonie (Anzahl per Nest-Logger), `sourceColonyId` NOT NULL, FK `ON DELETE CASCADE`, Index. Down stellt nullable/SET NULL wieder her.
  - Besitzverlust läuft in SWU ausschließlich über `ColonyAbandonmentService.abandonInManager` (Aufgabe und Kontolöschung; Neubesiedlung setzt eine Ruine voraus). Dort werden die Sandboxen der Kolonie gelöscht; gesäuberte Kolonien (`purgeColonies`) nehmen sie per FK mit.
  - Vorschau ohne Sonderfall „Quelle fehlt“: fremde/aufgegebene Quelle → 404; DTOs `sourceColonyId: number`, `ColonySandboxPreviewDto` ohne `null`; UI-Fallback „Quellkolonie … nicht verfügbar“ entfernt.
  - Checks: Backend-Unit `colony-sandbox*`, `colony-abandon*`, `colony-tick` (293 Tests), Integration `colony-sandbox*` (11 Tests, inkl. Migration hin/zurück, Bereinigung 3 von 4, Kaskade), Frontend `ColonySandbox*` (11 Tests), `nx typecheck lint` backend/frontend/shared grün.
  - Aufgabe als Ruine nur per Unit-Test (Löschaufruf mit `sourceColonyId`) abgedeckt, da der Integrations-DataSource die Queue-Entities nicht lädt.
  - Ausstehend: Verifikation (Diff-Review, Browsercheck Sandbox-Vorschau, Migration gegen Dev-DB).

