# Werft: Rumpfauswahl mit Bild, Zählern und deutschen Labels

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** —

## Ziel

Die Rumpfkacheln der SWU-Werft zeigen kein Rumpfbild, keinen Typ, nicht „Im Einsatz“ und nicht die Zahl der Baupläne. Dafür stehen englische Labels („Hull/Shields/Cargo“, „No modules available“) in der UI. STU zeigt je Rumpf das Bild, „Typ“, die Zahl der eingesetzten Schiffe und die Zahl der Baupläne. Dieses Ticket gleicht die Rumpfauswahl an.

## STU-Quellen

- `src/html/colony/menu/shipyard.twig` (Z. ~15–30: Bild, „Typ“, Icon „Im Einsatz“, Icon „Baupläne“)
- `src/Module/Colony/Lib/Gui/Component/ShipyardProvider.php`
- `src/Module/Colony/Lib/BuildableRumpListItem.php`

## SWU-Pfade

- `apps/frontend/src/pages/colonies/components/PanelShipyard.tsx` (Rumpfkacheln Z. 1527–1536, „No modules available“ Z. 320)
- `apps/backend/src/modules/colony/colony-shipyard.service.ts` (baubare Rümpfe der Werft)
- vorhandene Rumpfbild-Komponente bzw. Asset-Pfad der Schiffsliste (wiederverwenden)

## Akzeptanzkriterien

- [x] Jede Rumpfkachel zeigt das Rumpfbild, „Typ: <Kategorie>“ (deutsch), „Im Einsatz: n“ (eigene nicht zerstörte Schiffe dieses Rumpfs) und „Baupläne: n“ (eigene Baupläne dieses Rumpfs).
- [x] Die Zahlen liefert das Backend gesammelt mit der Rumpfliste (keine Abfrage je Rumpf).
- [x] Alle Labels sind deutsch: „Hülle“, „Schilde“, „Crew“, „Laderaum“, „Keine Module verfügbar“ usw. Im Panel bleibt kein englischer Text.
- [x] Backend-Test für die Zähler.
- [x] Frontend-Test `PanelShipyard.spec.tsx`: Bild, Typ, Zähler, deutsche Labels.

## Herkunft

- [`../audit-2026-11-17/README.md`](../audit-2026-11-17/README.md), Abschnitt C (Zeile „Modulfabrik / Werft“).
- [`../audit-2026-11-17/colony.md`](../audit-2026-11-17/colony.md), Seitenabgleich „Werft“ und „Modulbildschirm“, kleine Abweichung „Werft-Rumpfauswahl ohne Rumpfbild …“.
- Audit vom 2026-11-17, Paritätsvorgabe „wie STU“.

## Comments

- 2026-11-17: Aus dem Audit angelegt. Die Baupläne stehen in col-AUD-05b.
- 2026-11-19 – umgesetzt, Prüfung ausstehend. Umsetzung an Sonnet-Agent delegiert, Review durch Opus 5.5. Commits `33050bad` und „fix(colony): keep RPG-hidden ships out of the hull in-use count (col-AUD-05a)“.
  - Rumpfkachel mit Bild (`shipImage`), „Typ“ (deutsche Kategorie), „Im Einsatz“ und „Baupläne“. Zähler in `ColonyProjectionService` (dort entsteht `shipClassLayouts`): eine gruppierte Abfrage je Spieler; Baupläne aus der bereits geladenen Bauplanliste.
  - Zählregel wie STU `SpacecraftRepository::getAmountByUserAndRump` (alle Schiffe des Rumpfs, auch im Bau); SWU schließt `DESTROYED` aus (STU löscht zerstörte Schiffe). Review-Befund behoben: RPG-versteckte Schiffe sind auch für den Eigentümer verborgen und werden nicht mitgezählt.
  - Alle englischen Texte im Werft-Panel übersetzt, darüber hinaus „Buildplan“→„Bauplan“, „Retrofit“→„Umrüstung“ (auch der Standardname neuer Umrüstungspläne), „Ressourcen-only“→„Reine Ressourcenrümpfe“. Zähler als Text statt STU-Icons.
  - Checks: Jest `colony-shipyard colony-tick` 243/243, Vitest `src/pages/colonies` 128/128, `tsc` sauber, `nx lint` 0 Fehler, PostgreSQL `shipbuilding-workflow` 21/21.
  - Offen für den Prüfpass: Browserprüfung der Kacheln, gemeinsamer Build.
- 2026-11-19 – Prüfpass (Opus 5.5): `app.spec.tsx` erwartete noch den alten Standardnamen „Buildplan“ (Agent hatte nur `src/pages/colonies` geprüft); angepasst. Gesamtlauf auf `fe482b29` (+ Korrektur): Build erfolgreich, Lint 0 Fehler, Backend-Unit 2611/2611, Frontend 935/935 nach Korrektur, PostgreSQL 908/1047 – die 139 Fehlschläge sind identisch mit den vorigen Prüfpässen, keine Regression. Offen: Browserprüfung – Rumpfkacheln mit Bild, Typ, Zählern; deutsche Texte. Status bleibt `claimed`.
- 2026-11-19 – Abschluss (Opus 5.5): Browserprüfung vom Product Owner als bestanden gesetzt (nicht von Opus selbst im Browser gesehen). Prüflauf auf `7924fb96`: `nx typecheck backend frontend` grün, Build und Lint 0 Fehler, Backend-Unit 2625/2625, Frontend 943/943, PostgreSQL 1048/1048. resolved.
