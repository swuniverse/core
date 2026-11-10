# Wurmlochpassage: Frontend und Oberflächenverträge

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** tmw-K7a2

## Ziel

Macht Wurmlochpassagen in den passenden Spieleroberflächen auffindbar und nutzbar. Das Backend- und Flottenverhalten aus `tmw-K7a1`/`tmw-K7a2` wird über stabile Shared-DTOs und Endpunkte abgebildet.

## STU-Quellen

- `src/Module/Spacecraft/View/ShowWormholeControl/*`
- `src/html/spacecraft/wormholecontrol.twig`

## SWU-Pfade

- `packages/shared/src/lib/spacecraft/`
- `apps/frontend/src/components/spacecraft/FieldContextPanel.tsx`
- `apps/frontend/src/components/spacecraft/ShipQuickActions.tsx`
- `apps/frontend/src/components/spacecraft/ship-action-registry.ts`
- `apps/frontend/src/components/starmap/StarmapCanvas.tsx`

## Akzeptanzkriterien

- [x] Shared-Verträge repräsentieren verfügbare aktive Wurmlochpassagen einschließlich Name und Zielebene, ohne interne Backend-Details offenzulegen.
- [x] Feldkontext beziehungsweise Schnellaktionen bieten auf einem Wurmlochfeld „Wurmloch betreten“ mit passendem Namen und Ziel.
- [x] Nach erfolgreicher Passage aktualisieren sich Schiffsdetail und Karte auf die vom Backend bestätigte Position; Fehler werden verständlich angezeigt.
- [x] Frontend-Tests decken Sichtbarkeit nur am passenden Ort, mehrere Ausgänge, API-Aufruf und Zustandsaktualisierung ab.
- [x] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Frontend folgt den stabilen Backend-Verträgen aus `tmw-K7a1`/`tmw-K7a2`; keine eigene Bewegungs- oder Validierungslogik.

## Comments

- 2026-11-06: Aus `tmw-K7a` als letzter geordneter Teilauftrag extrahiert; blockiert durch `tmw-K7a2`.
- 2026-11-10: Shared-/Frontend-Implementierung und Frontend-Gates abgeschlossen; Backend-Projektionseinheitstest 3/3 grün. Der neue PostgreSQL-HTTP-Test für die Feldkontext-Projektion wurde nicht ausgeführt: die erlaubte Bestätigung, dass `DATABASE_URL` und `INTEGRATION_DATABASE_URL` beide unset sind, wurde vom Auto-Mode-Classifier für `env | grep -E '^(DATABASE_URL|INTEGRATION_DATABASE_URL)=' || true` abgelehnt, weil der Befehl Werte mit Zugangsdaten ausgeben könnte. Keine Umgehung, kein Test gegen eine andere Datenbank. Implementierungskriterien sind markiert; diesen HTTP-Nachweis sowie unabhängigen Sol Standards+Spec-Review und serielle Integration vor Abschluss nachholen. Backend-Typecheck, -Build und -Lint liefen grün; vollständige Backend-/PostgreSQL-Suite für K7a3 nicht erneut ausgeführt.
- 2026-11-10: Shared-/Frontend-Implementierung und fünf Akzeptanzkriterien abgeschlossen. Final accepted review disposition for the reviewed 16-path snapshot: Standards PASS (0 findings), Spec PASS (0 remaining findings; both prior P2 findings FIXED), and final-gate evidence closure PASS. Accepted execution evidence includes frontend 93/663, spec-inclusive frontend/backend types, lint (0 errors; 110/1438 warnings), builds, and backend full suite 214/1996/1 with actual subprocess exit 0; the previously flawed wrappers remain historical and are not relabeled. The targeted HTTP/PostgreSQL integration spec passed 10/10, exit 0, with both DB URL variables unset and the existing disposable PostgreSQL 16 Testcontainers harness. No private transcript/tool-result access or export was performed. At comment time the local candidate commit was pending; binding that commit to the reviewed source identity and Sol serial integration were still pending. Acceptance evidence transfers by exact source identity; no gates are being rerun.
