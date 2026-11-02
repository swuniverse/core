# Erkundete Ebene: vollständige Darstellung und ADR

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** tmw-K5b, tmw-K5d

## Ziel

Eine Spieler-Ebene im Status `EXPLORED` wird nach dem Löschen ihrer persönlichen Nebeldaten dauerhaft vollständig dargestellt. Frontend, Tests und Architekturdokumentation verwenden dieselbe Semantik.

## STU-Quellen

- `src/Lib/Trait/LayerExplorationTrait.php#hasExplored`
- `src/Module/Starmap/View/ShowUserStarmapData/*`
- `src/Module/Starmap/View/ShowUserStarmapImage/*`
- `src/Module/Maintenance/MapCycle.php`

## SWU-Pfade

- Kartenabfragen unter `apps/backend/src/modules/starmap/`
- `apps/frontend/src/pages/starmap.tsx`
- `docs/adr/`
- `CONTEXT.md`

## Akzeptanzkriterien

- [ ] Für `EXPLORED` liefern alle Kartenabfragen sämtliche Felder der Ebene, obwohl keine persönlichen Felderkundungszeilen mehr existieren.
- [ ] Für `KNOWN` bleibt die persönliche Nebel- und Felderkundungssemantik erhalten.
- [ ] Persönliche Systementdeckung wird durch `EXPLORED` nicht ersetzt: geschützte Systemdetails bleiben von der bestehenden Systemkenntnis abhängig.
- [ ] Kartographiepläne und ihre Abschlusslogik gemäß ADR-0002/0003 bleiben unverändert.
- [ ] Das Frontend zeigt vollständig erkundete Ebenen ohne Nebellücken und wechselt nach aktualisiertem Status ohne erforderliche Neuanlage von Felderkundungsdaten.
- [ ] Eine ADR `docs/adr/<nächste freie Nummer>-ebenenkenntnis-und-kartenzyklus.md` beschreibt `KNOWN`, `EXPLORED`, Bekanntwerden, Zugriff, Zyklus, Ereignis und das Verhältnis zu ADR-0002/0003.
- [ ] `CONTEXT.md` definiert die Begriffe „bekannte Ebene“ und „erkundete Ebene“ konsistent mit der ADR.
- [ ] Backend- und Frontend-Tests decken vollständige Darstellung nach Nebellöschung sowie unveränderte Systementdeckung ab.

## Entscheidung

`EXPLORED` ist eine Darstellungseigenschaft der Ebene, keine pauschale Entdeckung aller darin enthaltenen Sternensysteme.
