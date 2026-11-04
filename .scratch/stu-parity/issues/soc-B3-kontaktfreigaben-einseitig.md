# Kontaktfreigaben „Als Freund behandeln“ und „Live-Position teilen“

**Status:** resolved
**Priority:** P3
**Size:** M
**Blocked by:** soc-B1a

## Ziel

In STU kann ein Spieler einem Kontakt einseitig die Rechte „Als Freund behandeln“ und „Live-Position teilen“ geben; die Starmap zeigt dann geteilte Positionen. SWU kennt solche Freigaben nur als beidseitig ausgehandelte **Beziehungsfreigaben** (Allianz-Etappe 4). Dieses Issue setzt einseitige Kontaktfreigaben um, falls gewünscht.

## STU-Quellen

- `src/Module/Message/Action/UpdateContactPermissions`
- `src/Component/Alliance/Enum/RelationPermissionEnum.php`
- `src/Module/Starmap/View/ShowUserStarmapRealtime.php:576-596`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/starmap-visibility.service.ts` (geteilte Live-Positionen)
- `apps/backend/src/modules/alliance/relationship-resolver.service.ts`
- `CONTEXT.md` (Beziehungsfreigabe)
- `docs/adr/0001-allianzen-abweichungen-von-stu.md`

## Akzeptanzkriterien

- [x] Freigaben „Als Freund behandeln“ und „Live-Position teilen“ sind je Kontakt speicherbar (Migration) und in der Kontaktliste umschaltbar.
- [x] „Als Freund behandeln“ wirkt einseitig über den Relationship-Resolver: Der Freigebende behandelt den Kontakt als Freund (Vorrang wie in `CONTEXT.md`: andere Fraktion und Allianzkrieg gehen vor); die Gegenrichtung bleibt unverändert.
- [x] „Live-Position teilen“ erscheint im Sichtbarkeitsdienst nur für den freigebenden Spieler gegenüber dem Kontakt, gebündelt aufgelöst.
- [x] `CONTEXT.md` (Freund, Beziehungsfreigabe) beschreibt die einseitige Kontaktfreigabe neben der ausgehandelten Beziehungsfreigabe.
- [x] Tests belegen, dass ohne Freigabe nichts sichtbar bzw. wirksam wird, und die Einseitigkeit beider Freigaben.

## Entscheidung

Vorgabe: Variante (a), einseitig wie STU, für **beide** Freigaben („Als Freund behandeln“ und „Live-Position teilen“; die Empfehlung, nur „Live-Position teilen“ zu übernehmen, wurde nicht gewählt). Der Freigebende entscheidet allein; die Wirkung gilt nur in seiner Richtung (er behandelt den Kontakt als Freund bzw. gibt seine eigenen Positionen preis). Die Freigaben ergänzen die ausgehandelten Beziehungsfreigaben, ersetzen sie nicht.

## Comments

- 2026-10-21 Product Owner: Option a – Einseitige Kontaktfreigaben werden wie in STU eingeführt: Der Freigebende entscheidet allein über „Als Freund behandeln“ und „Live-Position teilen“.
- 2026-11-04 Agent: Alle Akzeptanzkriterien erfüllt: Migration mit geschlossenen Defaults und Rückbau, Eigentümer-PATCH mit strikter Boolean-Validierung, unabhängige Kontaktlisten-Toggles, ausgehende Freund- und eingehende Positionsfreigaben über den bestehenden Kontaktport (Batch), Fraktions-/Kriegsvorrang und Koexistenz mit ausgehandelten Freigaben; CONTEXT aktualisiert. RED: `npx jest --config apps/backend/jest.integration.config.cts --runInBand --runTestsByPath apps/backend/src/modules/contacts/contact-permissions.int-spec.ts` scheiterte vor Implementierung an fehlenden `false`-Freigabefeldern; weitere REDs für Freundwirkung, Positionen, Migration und UI beobachtet. GREEN: 7 Postgres/HTTP-/Migrationstests, 113 fokussierte Backendtests, 53 Frontendtests (Messages/Starmap), direktes ESLint (0 Fehler, vorhandene Non-null-Warnung), `npx tsc --build packages/shared/tsconfig.lib.json apps/backend/tsconfig.app.json apps/frontend/tsconfig.app.json`, fokussierte Test-Typechecks und `git diff --check`. Nx unter npm blockiert: `NX_DAEMON=false npx nx test backend --runInBand --testPathPatterns=contact.service.spec.ts` → pnpm-Lockfile erwartet fehlende `node_modules/.modules.yaml`; daher direkte Jest/Vitest/ESLint/TypeScript-Aufrufe, keine Package-Manager-Dateien geändert. Vollständige Integrations-Migrationskette blockiert durch fehlende private `game-data/data/buildings/stu-buildings.yaml` und `.spec.ts` im Migrationsglob; isoliertes Postgres-Testschema, neue Migration separat mit echtem up/down geprüft. Globale Spec-Typechecks haben bestehende Fehler außerhalb dieses Issues (Resolver-Literaltyp/Tutorial und andere Frontendspecs); neue Integration-/Messages-Tests separat erfolgreich typgeprüft. Bestehende Starmap-act- und ts-jest-Deprecation-Warnungen; Nx-Modulgrenzenregel ohne ProjectGraph übersprungen.
