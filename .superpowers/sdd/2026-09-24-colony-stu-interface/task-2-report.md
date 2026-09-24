# Task 2 Report: STU-nahe Informationsansicht und Umgebungsscan

## Status

Implementiert. Die Informationsansicht zeigt die freigegebene STU-Reihenfolge,
lädt den Umgebungsscan unabhängig von den Koloniedetails und bindet die
bestehende Ereigniskomponente ein. Der vollständige Frontend-Testlauf ist grün.

## Umsetzung

- `colonyApi.fetchSystemGrid(systemId)` verwendet den bestehenden Endpunkt
  `GET /starmap/systems/:id/grid` und gibt `StarmapSystemGridDto` zurück.
- Die `Colony.starSystem`-Projektion enthält nun `id`, `systemTypeId`,
  `systemTypeName`, `maxX` und `maxY`.
- `ColoniesPage` lädt das Systemgrid erst nach erfolgreichem Laden der
  Koloniedetails. Der Grid-Request wird nicht awaited, blockiert die
  Detailansicht daher nicht und besitzt getrennte Zustände für Daten und Fehler.
- Request-Sequenzen verhindern, dass verspätete Scanantworten einer zuvor
  ausgewählten Kolonie den aktuellen Zustand überschreiben.
- `PanelInfo` akzeptiert `{ colony; detail; systemGrid; systemGridError;
  onOpenOrbitManagement; eventProps }`.
- Die Ansicht rendert kompakte, aktionsfreie Orbit-Schiffszeilen, Planet mit dem
  einzigen lokalen `Orbitalmanagement`-Button, Umgebungsscan, Sternensystem,
  Bevölkerung, Effekte und Ereignisse in der genehmigten Reihenfolge.
- Der Umgebungsscan zeigt einen um `posX|posY` zentrierten, maximal 5x5 großen
  Ausschnitt und clippt auf die 1-basierten Systemgrenzen. Nicht gelieferte
  Felder werden explizit als `Nicht verfügbar` dargestellt und nicht erzeugt.
- Gridfehler erscheinen ausschließlich im Scanabschnitt; Koloniedetail,
  Bevölkerung, Lager und Ereignisse bleiben sichtbar.
- Bestehende Schilde, planetare Verteidigung, Asteroidenwarnung und Vorkommen
  bleiben erhalten.
- Der bisher separat vor `PanelInfo` eingebettete kompakte `PanelOrbit` wurde
  entfernt, damit keine Transfer-/Auswahlaktionen in der Informationsansicht
  erscheinen und der Managementeinstieg im Planetbereich liegt.

## TDD-Evidenz

### RED: Informationshierarchie und lokaler Scanfehler

Command:

```text
npx nx test frontend --run src/pages/colonies/components/PanelInfo.spec.tsx
```

Resultat vor Produktionsänderungen:

```text
Test Files  1 failed (1)
Tests       2 failed (2)
```

Erwartete Ursachen:

- `renders the STU information hierarchy and opens orbit management` fand
  `Schiffe im Orbit` nicht.
- `keeps colony information visible when the local scan fails` fand
  `Ereignisse` nicht.

Damit scheiterten die Tests an der fehlenden Panel-Schnittstelle und den
fehlenden Informationsabschnitten, nicht an Testsyntax oder Fixture-Aufbau.

### GREEN: Informationshierarchie

Command:

```text
npx nx test frontend --run src/pages/colonies/components/PanelInfo.spec.tsx
```

Resultat nach der ersten minimalen Panelimplementierung:

```text
Test Files  1 passed (1)
Tests       2 passed (2)
```

### RED: Systemgrenze

Nach der Selbstprüfung wurde der vorhandene Test um die bestätigte
1-basierte Systemgrenze ergänzt.

Command:

```text
npx nx test frontend --run src/pages/colonies/components/PanelInfo.spec.tsx
```

Resultat:

```text
Test Files  1 failed (1)
Tests       1 failed | 1 passed (2)
AssertionError: expected [...] to have a length of 0 but got 5
```

Der Test fand fünf ungültige `0|y`-Zellen. Die Untergrenze wurde anschließend
von `0` auf `1` korrigiert.

### RED: Scan darf Detail nicht blockieren

Der Seitentest verwendet einen dauerhaft ausstehenden Grid-Promise und prüft,
dass Lager und Bevölkerung trotzdem erscheinen.

Command:

```text
npx nx test frontend --run src/pages/colonies.spec.tsx -t "does not block colony detail"
```

Nx leitete den Dateifilter weiter und führte die sechs Tests der Datei aus.
Resultat vor der Korrektur:

```text
Test Files  1 failed (1)
Tests       1 failed | 5 passed (6)
Unable to find an element with the text: Versorgung / Lager
Rendered state: Laden...
```

Der Grid-Request wurde daraufhin aus dem awaited Detail-Ladevorgang gelöst.

### Finales GREEN

Command:

```text
npx nx test frontend --run src/pages/colonies/components/PanelInfo.spec.tsx src/pages/colonies.spec.tsx
```

Resultat:

```text
Test Files  2 passed (2)
Tests       8 passed (8)
```

## Weitere Verifikation

### Vollständige Frontend-Suite

Command:

```text
npx nx test frontend
```

Resultat:

```text
Test Files  38 passed (38)
Tests       139 passed (139)
```

Bekannte Warnungen ohne Testfehler:

- bestehende React-`act(...)`-Warnung in `ReactorPanel.spec.tsx`;
- bestehende React-`act(...)`-Warnungen in `app.spec.tsx` für `PanelShipyard`;
- bestehende `NaN`-Warnung für `strokeDashoffset` in `holonet.spec.tsx`.

### Produktionsquellen-Typecheck

Command:

```text
cd apps/frontend
npx tsc --build tsconfig.app.json --emitDeclarationOnly
```

Resultat: Exit 0, keine Ausgabe. Die Produktionsquellen bestehen den
Typecheck.

### Angeforderter Nx-Typecheck

Command:

```text
npx nx typecheck frontend
```

Resultat: Exit 1 ausschließlich wegen der bekannten, unveränderten
Test-Fixture-Fehler außerhalb der Task-Dateien:

- `src/pages/colonies/utils.spec.ts`: drei fehlende `ColonyStorageItem.id` und
  zwei absichtlich unvollständige `BuildingDef`-Casts;
- `src/pages/dashboard/DashboardColonies.spec.tsx`: unvollständiger
  `DashboardData`-Cast.

Es wurden keine Produktionsquellenfehler ausgegeben.

### Diff-Prüfung

Command:

```text
git diff --check
```

Resultat: Exit 0, keine Whitespacefehler.

## Dateien

- Neu: `apps/frontend/src/pages/colonies/components/PanelInfo.spec.tsx`
- Geändert: `apps/frontend/src/pages/colonies/components/PanelInfo.tsx`
- Geändert: `apps/frontend/src/pages/colonies/api.ts`
- Geändert: `apps/frontend/src/pages/colonies/types.ts`
- Geändert: `apps/frontend/src/pages/colonies/ColoniesPage.tsx`
- Geändert: `apps/frontend/src/pages/colonies.spec.tsx`
- Geändert: `apps/frontend/src/app/app.spec.tsx`
- Neu: `.superpowers/sdd/2026-09-24-colony-stu-interface/task-2-report.md`

## Selbstprüfung

- Die Panel-Reihenfolge entspricht dem Brief.
- `PanelEvents` wird mit allen vier bestehenden Eingaben eingebettet.
- Scanfehler verändern oder löschen `selected` nicht und blockieren den
  initialen Detail-Render nicht.
- Veraltete Gridantworten werden über dieselbe Request-Sequenz wie Details
  verworfen.
- Der Scan verwendet nur gelieferte `StarmapSystemFieldDto`-Daten; Lücken sind
  sichtbar als nicht verfügbar markiert.
- Die Systemgrenzen sind entsprechend Backend-Erzeugung `1..maxX/maxY`.
- In der Informationsansicht gibt es keine Transfer-, Auswahl- oder sonstigen
  Orbit-Managementaktionen.
- Der bestehende separate Orbit-Tab bleibt absichtlich bestehen, da Task 2 laut
  Brief noch nicht den vollständigen neuen Workspace integriert; Task 5 wird
  den neuen Callback an die Kontextnavigation anbinden.
- Keine Dateien außerhalb des freigegebenen Task-Schnitts wurden geändert.

## Bedenken

- `npx nx typecheck frontend` bleibt wegen der bekannten Test-Fixtures rot;
  `tsconfig.app.json` bestätigt, dass die Produktionsquellen typkorrekt sind.
- Der alte Orbit-Tab und `PanelOrbit` enthalten weiterhin ihre bestehende
  Managementoberfläche. Das ist für den Zwischenstand beabsichtigt; die finale
  alleinige Erreichbarkeit über die Kontextansicht gehört zur späteren
  Workspace-Integration.
- Die vollständige Testsuite ist grün, gibt aber die oben dokumentierten,
  bereits vorhandenen React-/SVG-Warnungen aus.
