# Gebäudereparatur im UI (Vorschau und Reparieren)

**Status:** resolved
**Priority:** P1
**Size:** M
**Blocked by:** —

## Ziel

Beschädigte Gebäude lassen sich in SWU heute nicht reparieren. Das Backend bietet Einzelreparatur, Reparaturvorschau und Sammelreparatur an, aber kein Frontend-Code ruft diese Endpunkte auf. Ab hohem Schaden lässt sich ein Gebäude nicht mehr aktivieren, und dem Spieler bleibt nur Abriss und Neubau. STU zeigt im Felddialog eines beschädigten Gebäudes den Knopf „Reparieren“. Dieses Ticket bindet die vorhandenen Endpunkte an: einen Reparieren-Knopf mit Kostenvorschau im Felddialog und eine Sammelreparatur in der Gebäudeschaltung.

## STU-Quellen

- `src/html/colony/component/fieldAction.twig` (Aktionsblock, Knopf `B_REPAIR` „Reparieren“, Z. ~402)
- `src/Module/Colony/Action/RepairBuilding/RepairBuilding.php`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony.controller.ts`: `GET :id/buildings/repair-preview`, `POST :id/buildings/repair-damaged` (Z. 627–655), `POST :id/fields/:fieldIndex/repair` (Z. 820–827)
- `apps/backend/src/modules/colony/colony-construction.service.ts`: `repairBuilding` (Z. 901), `getBuildingRepairPreview` (Z. 946), `repairDamagedBuildings` (Z. 958)
- `apps/backend/src/modules/colony/colony-building-management.service.ts`: `repairDamagedBuildings` (Z. 217)
- `apps/backend/src/modules/colony/building-lifecycle.service.ts`: `hasHighDamage` (Z. 59/89)
- `apps/frontend/src/pages/colonies/api.ts`: `fetchBuildingRepairPreview`, `repairDamagedBuildings` (Z. 98–110, ohne Aufrufer); Einzelreparatur fehlt
- `apps/frontend/src/pages/colonies/components/ColonyFieldDialog.tsx` (Aktionsblock Z. 521–553)
- `apps/frontend/src/pages/colonies/components/PanelBuildingManagement.tsx` (Zähler „Beschädigt“ Z. 85–90)
- `apps/frontend/src/pages/colonies/ColoniesPage.tsx` (Verdrahtung, Neuladen der Kolonie)

## Akzeptanzkriterien

- [x] `api.ts` hat eine Funktion für `POST :id/fields/:fieldIndex/repair`.
- [x] Der Felddialog zeigt bei einem beschädigten, fertigen Gebäude (Integrität < max) den Knopf „Reparieren“ mit den Reparaturkosten (Waren und Energie, vorhanden/benötigt) aus der Backend-Vorschau. Bei unbeschädigten Gebäuden und Baustellen erscheint er nicht.
- [x] Reichen Waren oder Energie nicht, ist der Knopf deaktiviert und nennt den Grund. Die Backend-Fehlermeldung wird auf Deutsch angezeigt.
- [x] Nach erfolgreicher Reparatur werden Feld, Lager, Energie und Integrität ohne Seitenneuladen aktualisiert.
- [x] Bei stark beschädigtem Gebäude zeigt der Dialog wie STU den Hinweis „Stark beschädigt – kann nicht aktiviert werden“ statt eines Aktivieren-Knopfs, der nur einen Fehler liefert.
- [x] Die Gebäudeschaltung bietet beim Zähler „Beschädigt“ die Aktion „Alle reparieren“ an. Sie zeigt vorab die Vorschau (Anzahl Gebäude, Gesamtkosten, was nicht reparierbar ist) und ruft dann `repair-damaged` auf.
- [x] Die Backend-Endpunkte werden nur angepasst, wenn ein Test eine Lücke zeigt (Besitzerprüfung, Baustelle, Kosten).
- [x] Frontend-Tests: `ColonyFieldDialog.spec.tsx` (Knopf sichtbar/unsichtbar, deaktiviert bei Mangel, Aufruf mit Feldindex, Hinweis stark beschädigt) und `PanelBuildingManagement.spec.tsx` (Vorschau und Sammelreparatur).
- [x] Backend-Test für Einzel- und Sammelreparatur (Besitzerprüfung, Kostenabzug, Integrität auf max), falls noch keiner existiert.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt A (erste Zeile „Gebäudereparatur“) und Abschnitt E (Lücke ohne Ticket).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Seitenabgleich „Felddialog“ und Große Abweichung Nr. 1; kleine Abweichung „Kein Hinweis stark beschädigt“.
- Kein Vorgängerticket. `inventory/colony.md` führte die Reparatur fälschlich als vorhanden.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt. col-AUD-03 und col-AUD-06a ändern ebenfalls `ColonyFieldDialog.tsx`; bei paralleler Arbeit Konflikte beachten.

- 2026-11-18: **Umgesetzt und geprüft.** Einzelreparatur über den vorhandenen Feld-Endpunkt; Felddialog lädt die Backend-Vorschau, zeigt Energie/Waren als vorhanden/benötigt und sperrt Reparaturen bei Mangel. Fertige beschädigte Zentralgebäude sind eingeschlossen, Baustellen/unbeschädigte Gebäude und Sandbox sind ausgeschlossen. Die gerundete Backend-Grenze für starke Beschädigung wird exakt übernommen. Die Gebäudeschaltung bietet eine zweistufige Sammelreparatur mit Gesamtkosten, Ausschlüssen und übersprungenen Feldern an. Kolonie, Lager und Energie aktualisieren sich bei offen bleibendem Felddialog; abgeschlossene Reparaturen überschreiben keine zwischenzeitliche Navigation.
- **Prüfnachweis:** 94 Frontend-Tests in sechs Dateien (API, Felddialog, Gebäudeschaltung, Kolonieseite, bestehende App- und Sandbox-Regressionen); 20 Backend-Tests in `colony-construction-repair.spec.ts` und `colony-building-management.service.spec.ts`, zusätzlich der bestehende Einzelreparaturtest in `colony-tick.spec.ts`. Besitzerprüfung, Baustellen, proportionaler Kostenabzug, Integrität auf Maximum, unveränderte Bestände bei Mangel und sequenzielle Sammelreparaturen sind geprüft. Backend-Produktcode bleibt unverändert. `npx nx typecheck frontend`, `npx tsc -b apps/backend/tsconfig.json`, Frontend-Lint und ESLint für die neue Backend-Testdatei sowie `git diff --check` erfolgreich. Frontend-Lint: 0 Fehler, 124 Warnungen. `npx nx run-many --targets=build` erfolgreich; Frontend nach den Review-Korrekturen erneut erfolgreich gebaut. App-Tests melden bestehende React-act-Warnungen, Builds CSS-/Chunk-Warnungen.
- **Review und Modelle:** Begrenzte Frontend-Implementierung durch `ticket-coder` (GPT-6 Luna, high); Planung, Backend-Testergänzung und abschließendes Diff-/Akzeptanzreview im aktiven Sitzungsmodell, da dieses nicht auf GPT-6.1 Sol umstellbar ist (Workflow-Fallback). Review-Korrekturen: vollständige deutsche Reparaturfehler, Baustellen-Ausschlüsse in der Sammelvorschau, Navigation während laufender Reparatur und fehlende Callbacks bei bestehenden `ColonyDetail`-Aufrufern. Keine gemessenen Token-/Einsparungszahlen verfügbar.
- **Verifikationsgrenze:** Gerenderte Komponenten und Seiten sind durch DOM-Tests geprüft. Eine separate visuelle Browserprüfung konnte nicht ausgeführt werden: Browserzugriff meldete „The browser access host is unavailable“, nativer Edge-Zugriff lief in einen Timeout. Keine Screenshot-Prüfung behauptet.

- 2026-11-18 – **Visuelle Prüfung nachgeholt:** Nach dem Start von Chrome ist der native Zugriff über `cua.getApp("com.google.Chrome")` verfügbar. Mit den echten React-Komponenten in `output/col-AUD-01-browser-review.html` / `.tsx` und lokalen Vorschau-/Mutationsfixtures wurden Screenshots und Accessibility-Zustände geprüft: Kosten samt Waren-/Energie-Icons, starke Beschädigung ohne Aktivieren-Knopf, deaktivierte Reparatur mit deutschem Grund bei Energie- und Warenmangel, deutsche Blockadefehlermeldung, nach Reparatur offen bleibender Dialog mit 100 % Integrität sowie zweistufige Sammelvorschau und Ergebnis mit Ausschluss-/Überspringgründen. Layout und Bedienelemente sind lesbar; keine Korrektur am Produktcode erforderlich. Diese Komponentenprüfung ergänzt die API-/Seitentests und ist kein weiterer Live-Backend-Test. Die frühere offene Browser-Sichtprüfung ist damit nachgeholt; die direkte Browser-Anbindung meldet weiterhin „The browser access host is unavailable“, der native Chrome-Zugriff funktioniert.
