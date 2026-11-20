# Kolonie-Sandbox nur per Freigabe wie STU (Feature-Freigabe `COLONY_SANDBOX`)

**Status:** resolved
**Priority:** P2
**Size:** M
**Blocked by:** —

## Ziel

In SWU kann jeder Spieler bis zu 3 Sandboxen anlegen (col-G3a). In STU ist die Sandbox kein allgemeines Spielerfeature. Alle Sandbox-Aktionen und -Views prüfen `AccessGrantedFeatureEnum::COLONY_SANDBOX`. Freigeschaltet sind nur Admins und Spieler-IDs aus der Spielkonfiguration (`game.grantedFeatures`). Ein Mengenlimit gibt es nicht.

Der PO hat am 2026-11-17 entschieden: Freigabe wie STU, aber im Admin pflegbar statt per Config-Datei. Dieses Ticket baut die Feature-Freigabe je Spieler, prüft sie an allen Sandbox-Endpunkten, blendet die UI ohne Freigabe aus und entfernt das Limit. Die Bindung an die Quellkolonie folgt in col-AUD-16b.

## STU-Quellen

- `src/Module/Control/AccessCheck.php` (`isFeatureGranted` Z. 80–98: Admin oder Eintrag in `grantedFeatures`)
- `src/Module/Control/AccessGrantedFeatureEnum.php`, `AccessCheckControllerInterface.php`
- `src/Module/Config/Model/GameSettings.php` (`getGrantedFeatures`)
- `src/Module/Colony/Action/Sandbox/CreateSandbox.php`, `src/Module/Colony/View/Sandbox/ShowNewSandbox.php`, `ShowColonySandbox.php` (`getFeatureIdentifier`)
- `src/html/view/colonylist.twig` (Sandbox-Knopf nur mit Freigabe)

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-sandbox.controller.ts`, `colony-sandbox.service.ts` (`limit()` Z. 34–39, Prüfung Z. 142–149), `colony-sandbox-planning.service.ts`, `colony-sandbox-preview.service.ts`
- `apps/backend/src/modules/auth/user.entity.ts` (`isAdmin` Z. 51), `apps/backend/src/modules/auth/auth.controller.ts` (`admin/users` Z. 133–167)
- `packages/shared/src/lib/colony/sandbox.ts` (`ColonySandboxListDto.limit`)
- `apps/frontend/src/pages/colonies/ColoniesPage.tsx` (Umschalter `sandboxMode` Z. 869–873), `components/ColonySandboxPanel.tsx`
- `apps/frontend/src/pages/admin-users.tsx` (Freigabe pflegen)
- Konfiguration `COLONY_SANDBOX_LIMIT` (entfällt)

## Akzeptanzkriterien

- [x] Es gibt eine allgemeine Feature-Freigabe je Spieler (z. B. Tabelle `user_feature_grant` mit `userId`, `feature`, `grantedAt`, `grantedBy`, Enum mit erstem Wert `COLONY_SANDBOX`). Admins haben jede Freigabe implizit (wie STU).
- [x] Admins können die Freigabe in der Admin-Spielerverwaltung je Spieler setzen und entziehen. Die Endpunkte verlangen Adminrechte.
- [x] Ein wiederverwendbarer Guard bzw. Decorator (z. B. `@RequiresFeature('COLONY_SANDBOX')`) schützt alle Sandbox-Endpunkte (Liste, Anlegen, Lesen, Umbenennen, Löschen, Planen, Vorschau). Ohne Freigabe antwortet er mit 403 und der deutschen Meldung „Aktion nicht möglich, Spieler ist nicht berechtigt“.
- [x] Das Limit `COLONY_SANDBOX_LIMIT` entfällt samt Prüfung, Konfiguration und `limit` im DTO.
- [x] Das Frontend erfährt die Freigaben des Spielers (z. B. über das Profil-/Me-DTO). Ohne Freigabe sind der Umschalter „Kolonie/Sandbox“ und alle Sandbox-Einstiege ausgeblendet.
- [x] Kein Bestandsschutz nötig: Es gibt noch keine produktiven Sandboxen. Vorhandene Entwicklungs-/Testdaten dürfen verworfen werden; keine Migrations- oder Sichtbarkeitslogik für Altbestand.
- [x] Backend-Tests: ohne Freigabe 403 an jedem Sandbox-Endpunkt, mit Freigabe ok, Admin ohne Eintrag ok, kein Limit mehr (mehr als 3 Sandboxen möglich), Admin-Endpunkt Freigabe setzen/entziehen.
- [x] Frontend-Tests: Umschalter nur mit Freigabe (`ColonySandboxPanel.spec.tsx` bzw. `colonies.spec.tsx`), Admin-Seite setzt Freigabe (`admin-users.spec.tsx`).

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt J3 (Kolonie-Sandbox) mit „Entscheidung PO (2026-11-17): nur per Freigabe, wie STU“ und Abschnitt N2 (Zeile „Sandbox für alle, Limit 3“).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Seitenabgleich „Sandbox“, Abschnitt „Bewusste/entschiedene Abweichungen“ (Limit 3).
- Ersetzt die `map.md`-Entscheidungen „2026-10-21 – col-G3a – Option a“ (Höchstzahl 3 je Spieler) sowie col-G3b/col-G3c, soweit sie Zugang für alle voraussetzen. Bau, Schaltung und Vorschau aus col-G3b/c bleiben fachlich gültig.

## Comments

- 2026-11-17: Aus dem Audit angelegt. Bindung an die Quellkolonie in col-AUD-16b.

- 2026-11-17 Product Owner: Es gibt noch keine Sandboxen im Betrieb; Altbestand kann verworfen werden.

- 2026-11-20 umgesetzt, Prüfung ausstehend (Commit „feat(colony): gate colony sandbox behind COLONY_SANDBOX grant (stu-parity col-AUD-16a)“). Umsetzung mit Claude Opus 5.5 direkt (Sol/Luna in dieser Session nicht verfügbar; Ticket ist ohnehin Autorisierung → Sol-Route).
  - Statt neuer Tabelle `user_feature_grant` das vorhandene Spieler-Rechtesystem genutzt: `Permission.COLONY_SANDBOX` in `User.permissions`, Admin-Endpunkt `PATCH /auth/admin/users/:id/permissions` (AdminGuard, nimmt jetzt nur bekannte Rechte an), `PermissionGuard` (Admins implizit) mit STU-Meldung „Aktion nicht möglich, Spieler ist nicht berechtigt“ auf dem ganzen `ColonySandboxController`. `JwtStrategy` liest Rechte aus der DB, damit ein Entzug sofort greift. `grantedAt`/`grantedBy` werden damit nicht gespeichert.
  - Limit `COLONY_SANDBOX_LIMIT` samt Quota-Lock, Config (`.env.example`, docker-compose) und `ColonySandboxListDto.limit` entfernt; Panel zeigt keinen Zähler mehr.
  - Frontend: Umschalter Kolonie/Sandbox nur mit Admin oder `COLONY_SANDBOX` (aus Profil/`user.permissions`); Admin-Spielerverwaltung hat je Recht eine Spalte mit Checkbox.
  - Checks gelaufen: Backend-Unit `colony-sandbox*` + `auth/*` (18 Suites, 100 Tests), Integration `colony-sandbox*` (10 Tests), Frontend `colonies.spec`, `admin-users.spec`, `ColonySandboxPanel.spec` (26 Tests), `nx typecheck lint` für backend/frontend/shared grün.
  - Ausstehend: Verifikationsdurchlauf (Diff-Review, Browsercheck Umschalter/Admin-Seite mit/ohne Freigabe).
- 2026-11-20 Verifikation: Diff-Review ohne Befund (alle Sandbox-Einstiege laufen über den Umschalter; Profil wird per `/auth/me` aufgefrischt). Browsercheck Umschalter/Admin-Seite vom PO bestätigt. Kein Gesamt-Build/Gesamtlauf in diesem Durchlauf. → resolved.
