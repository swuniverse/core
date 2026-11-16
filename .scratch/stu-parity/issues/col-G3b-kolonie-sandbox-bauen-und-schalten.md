# Kolonie-Sandbox: Bauen, Abreißen und Schalten

**Status:** resolved
**Priority:** P3
**Size:** M
**Blocked by:** col-G3a

## Ziel

In der Sandbox kann der Spieler wie in der echten Kolonie bauen, abreißen, upgraden und Gebäude schalten, aber ohne Kosten, Bauzeit, Queues oder Ereignisse. Regeln zu Feldtyp, Forschung, Limits und Energie gelten wie in der Kolonie. Die Entscheidung über die Sandbox steht in col-G3a.

## STU-Quellen

- `src/Module/Colony/View/Sandbox/`, `src/html/colony/sandbox/*.twig`
- `src/Component/Building/BuildingRemovalHandler.php`, `BuildingPostAction.php` (polymorph für `ColonySandbox`; Building-Action-Handler tun bei Sandboxen nichts)

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-construction.service.ts` (Regelprüfungen herauslösen und für Sandbox wiederverwenden)
- `colony-sandbox.service.ts` aus col-G3a
- `apps/frontend/src/pages/colonies/components/ColonyFieldDialog.tsx`, `PanelBuild.tsx`, `PanelBuildingManagement.tsx` (Sandbox-Modus)

## Akzeptanzkriterien

- [x] Bauen, Abreißen, Upgrade, Terraforming und (Massen-)Schaltung funktionieren in der Sandbox sofort und kostenlos.
- [x] Feldtyp-, Forschungs-, Gebäudelimit- und Atmosphärenregeln werden wie in der echten Kolonie geprüft (gemeinsamer Code, keine Kopie).
- [x] Sandbox-Aktionen erzeugen keine Nachrichten, Queues oder Hook-Effekte (col-A1a/b).
- [x] Backend- und Frontend-Tests.

## Answer

Die Sandbox bietet sofortiges, kostenloses Bauen/Ersetzen, Abreißen, Upgrade, Terraforming und Einzel-/Massenschaltung. Feldoptionen und Aktionen verwenden die aus dem Live-Baudienst herausgelösten Prüfungen für Terrain, Feldalternativen, Atmosphäre, Forschung, Limits und geschützte Zentralgebäude. Auch reale Upgrades prüfen jetzt die Platzierungsregeln ihres Zielgebäudes. Aktivierung nutzt dieselben Arbeiter-, Energie-, Integritäts- und Versorgungsvoraussetzungen; Effekt-Abhängigkeiten werden beim Abschalten/Abreißen berücksichtigt.

Ein eigener Planungsdienst verändert ausschließlich den JSONB-Snapshot unter einem Sandbox-Zeilenlock. Er ruft keine Live-Bauaktionen, Lifecycle-Hooks, Lageränderungen oder Nachrichtendienste auf. Spielerweite Limits zählen die anderen echten Kolonien plus den Plan als Ersatz seiner Quellkolonie; andere Sandboxen zählen nicht. Freie Arbeiter werden nach jeder Planänderung aus aktiven Gebäuden abgeleitet. Eigentümerrechte und Untergrundwissen gelten auch für Feldoptionen und Massenschaltung; übersprungene Felder erhalten eine sichtbare Begründung.

Die Sandbox nutzt die vorhandene Karte, den Felddialog und das Baumenü. Kosten/Bauzeiten und Live-Gebäudefunktionen entfallen im Sandbox-Modus; Upgrade, Terraforming, Schaltgruppen und Feldwahl sind bedienbar. Neue Kopien sichern auch Energievorrat und Himmelskörperkontext (Atmosphäre, Rotation/Ring) unabhängig von der Quelle. Produktionsvorschau und Vergleich bleiben col-G3c.

## Entscheidung

Vorgabe: Folgt col-G3a, Option (a) – die Kolonie-Sandbox wird vollständig umgesetzt; dieses Teilpaket ist Teil davon.

## Comments

- 2026-10-21 Product Owner: Option a (über col-G3a) – Folgt der Entscheidung zu col-G3a: Die Kolonie-Sandbox wird vollständig umgesetzt; dieses Teilpaket ist damit freigegeben.
- 2026-11-16: Umsetzung abgeschlossen. `nx affected -t lint typecheck test --base=HEAD --parallel=2` grün: Backend 229 Suites / 2169 Tests, Frontend 109 Dateien / 784 Tests. Gezielter Frontend-Lauf: 37 Tests, darunter 8 Sandbox-Tests für Bau, Schaltung, Upgrade, Terraforming und Fehlermeldungen. Planungsdienst: 8 Tests mit gemeinsamen Live-Regeln, Arbeiterlimit, Versorgung, Eigentümerrechten und ohne Lifecycle-Aufrufe. PostgreSQL/HTTP: 8 Tests inklusive der Snapshot-Baseline, Payload-Validierung, vier parallelen Änderungen ohne verlorene Felder sowie unveränderten Live-Feldern/Ressourcen/Nachrichten. `nx run-many --targets=build` grün; keine Produktionsdatenbank geändert.
