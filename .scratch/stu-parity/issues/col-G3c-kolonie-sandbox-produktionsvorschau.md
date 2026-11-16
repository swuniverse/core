# Kolonie-Sandbox: Produktions- und Energievorschau

**Status:** resolved
**Priority:** P3
**Size:** S
**Blocked by:** col-G3b

## Ziel

Die Sandbox zeigt dieselbe Bilanz wie die echte Kolonie: Energie, Warenproduktion je Ware, Wohnraum, Arbeiter und Lebensstandard. So sieht der Spieler die Folgen seiner Planung. Die Entscheidung über die Sandbox steht in col-G3a.

## STU-Quellen

- `src/html/colony/sandbox/*.twig`
- `src/Module/Colony/Lib/ColonyProductionPreviewWrapper.php`, `ColonyEpsProductionPreviewWrapper.php`

## SWU-Pfade

- `apps/backend/src/modules/colony/colony-stats.service.ts` (`calculateSummary`, `resolveEpsProc` für Sandbox-Felder nutzbar machen)
- `apps/frontend/src/pages/colonies/components/PanelInfo.tsx`, `SupplyDock.tsx` (Sandbox-Modus)

## Akzeptanzkriterien

- [x] Die Sandbox zeigt Energiebilanz, Produktion je Ware, Wohnraum, Arbeiter und Lebensstandard, berechnet mit derselben Logik wie die echte Kolonie.
- [x] Ein Vergleich „Kolonie vs. Sandbox“ zeigt die Differenz je Kennzahl.
- [x] Backend-Test: gleiche Felder ergeben gleiche Bilanz wie die Kolonie; Frontend-Test für die Differenzanzeige.

## Answer

Eigentümergeschützte Vorschau unter `GET /colonies/sandboxes/:sandboxId/preview`. Statistik- und Sozialdienst berechnen Energieproduktion/-verbrauch/-bilanz, Energiekapazität, Bevölkerung, Wohnraum, belegte/freie Arbeiter, Lebensstandard und Produktion je Ware/Effekt/Vorkommen. Die Planungsberechnung verwendet dieselbe Bilanzlogik einschließlich Solarertrag und Bonusmarkern; Wohnraum und Beschäftigung werden aus dem aktuellen Plan neu abgeleitet, ohne Tick oder persistente Live-Änderungen.

Neue Kopien speichern den Basiswohnraum als Differenz zwischen ursprünglicher Kapazität und aktiven Gebäude-Beiträgen, damit bestehende Wohngebäude nicht doppelt zählen. Kopien ohne diesen Wert verwenden ihre gespeicherte Kapazität und den aktuellen Feldzustand als Ausgangspunkt; vor der nächsten Planänderung wird dieser Ausgangspunkt im Snapshot gesichert. Der Basiswert bleibt auch für importierte Altzustände mit abweichender Kapazität erhalten. Energie-/Lagerbasis und Bevölkerung werden beim Kopieren aus dem maßgeblichen veränderlichen Koloniezustand übernommen.

Die Vergleichstabelle zeigt „Kolonie“, „Sandbox“ und „Differenz“ (Sandbox minus Kolonie); Prozentangaben werden in Prozentpunkten verglichen. Waren, die nur auf einer Seite vorkommen, werden auf der anderen als 0 behandelt. Die Vorschau aktualisiert sich nach Planänderungen und über „Vergleich aktualisieren“; Antworten zu einer alten Auswahl werden verworfen. Der Vergleich liest die aktuelle, weiterhin eigene und nicht aufgegebene Quellkolonie in einer konsistenten Datenbank-Sicht. Bei Eigentümerwechsel, Aufgabe oder Löschung entfällt der Vergleich, während die Sandbox-Bilanz verfügbar bleibt.

## Entscheidung

Vorgabe: Folgt col-G3a, Option (a) – die Kolonie-Sandbox wird vollständig umgesetzt; dieses Teilpaket ist Teil davon.

## Comments

- 2026-10-21 Product Owner: Option a (über col-G3a) – Folgt der Entscheidung zu col-G3a: Die Kolonie-Sandbox wird vollständig umgesetzt; dieses Teilpaket ist damit freigegeben.
- 2026-11-16: Abgeschlossen. `nx affected -t lint typecheck test --base=HEAD --parallel=2` grün: Backend 230 Suites / 2174 Tests, Frontend 110 Dateien / 787 Tests. Gezielt: 23 Sandbox-Service-Tests (5 neue Vorschautests), 11 Frontend-Tests für Vorschau und Panel (3 neue Vergleichstests). PostgreSQL/HTTP: 10 Tests, einschließlich identischer kopierter Bilanz, Aktualisierung nach Bau/Abreißen, Basiswohnraum ohne Doppelzählung und Vertraulichkeit nach Besitzerwechsel. `nx run-many --targets=build` grün. Keine Produktionsdatenbank verändert; keine neue Schema-Migration erforderlich.
