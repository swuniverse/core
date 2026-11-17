# Interdiktornetz für Schiffe

**Status:** wontfix
**Priority:** P3
**Size:** M
**Blocked by:** sc-WP-ENG-2a, sc-WP-COMBAT-3

## Entscheidung – keine Umsetzung

Auf ausdrückliche Nutzerentscheidung vom 2026-11-17 wird dieses Ticket nicht umgesetzt: Das STU-Tholianische Netz erhält kein Interdiktornetz-Pendant in SWU, weil ein passendes Star-Wars-Äquivalent für diesen Spielumfang fehlt. Das gesamte Feature einschließlich Aufbau, Bewegungssperre und Implosion ist `wontfix`; die bisherigen Spezifikationen und ungecheckten Kriterien bleiben als historische Planung erhalten.

## Ziel

Ein kanonnahes Interdiktornetz bildet das STU-Energienetz ab: geeignete Schiffe können an einem Ort gemeinsam ein zeitverzögertes Fangfeld um sichtbare Ziele aufbauen, es abbrechen oder nach Fertigstellung auflösen beziehungsweise implodieren lassen. Gefangene Schiffe sind bis zur Freigabe bewegungsunfähig; die Implosion verursacht Kampfschaden und meldet die Folgen den Eigentümern.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Ship/Action/TholianWeb/CreateTholianWeb.php`
- `Module/Ship/Action/TholianWeb/SupportTholianWeb.php`
- `Module/Ship/Action/TholianWeb/UnsupportTholianWeb.php`
- `Module/Ship/Action/TholianWeb/CancelTholianWeb.php`
- `Module/Ship/Action/TholianWeb/RemoveTholianWeb.php`
- `Module/Ship/Action/TholianWeb/ImplodeTholianWeb.php`
- `Component/Spacecraft/System/Type/WebEmitterShipSystem.php`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/`
- `apps/backend/src/modules/combat/`
- `apps/frontend/src/pages/spacecraft/`
- `packages/shared/`
- `game-data/data/modules/special.yaml`

## Akzeptanzkriterien

- [ ] Persistentes Interdiktornetz und Interdiktorprojekt mit Erbauer, Unterstützern, Fertigstellungszeit und gefangenen Spacecrafts.
- [ ] Aufbau erfasst nur sichtbare, kopräsente, nicht urlaubsgeschützte Ziele und verhindert ein zweites Netz am Ort.
- [ ] Mehrere geeignete Schiffe können den Aufbau unterstützen; Abbruch, Systemausfall oder Zerstörung berechnen die Fertigstellungszeit neu beziehungsweise lösen den Aufbau sicher auf.
- [ ] Gefangene Spacecrafts können nicht navigieren, bis das Netz aufgelöst oder implodiert ist.
- [ ] Fertige Netze können vom Eigentümer schadlos aufgelöst oder mit Kampfschaden implodiert werden; alle betroffenen Eigentümer erhalten Meldungen.
- [ ] Interdiktornetz-Modul, Shared-DTOs, API und verdichtete Schiff-UI sind vorhanden.
- [ ] Service- und Integrationstests decken Aufbau, Unterstützung, Sperre, Auflösung, Implosion und Berechtigungen ab.

## Historische Answer – Tracking-Split nach Triage

Das Parent ist als **Tracking-Split** abgeschlossen, nicht als fertige Funktion. Die ursprünglichen Feature-Kriterien oben bleiben zur Übersicht ungecheckt; verbindliche Umsetzung und Nachweise liegen in drei Kindtickets:

1. [SPEC-1a – Datenmodell und Aufbau](sc-WP-SPEC-1a-interdiktornetz-aufbau.md): Ausstattungsentscheidung und konkretes Aufbau-/Unterstützungsmodell (`needs-info`).
2. [SPEC-1b – Fertigstellung und Bewegungsbindung](sc-WP-SPEC-1b-interdiktornetz-fertigstellung.md): Tick, Flotten-/Traktorbereinigung, Bewegungssperre und Auflösung (`ready-for-agent`, abhängig von 1a).
3. [SPEC-1c – Implosion und Gesamtabnahme](sc-WP-SPEC-1c-interdiktornetz-implosion.md): Kampfschaden, Historie/Meldungen und vollständige Schiff-UI (`ready-for-agent`, abhängig von 1b).

STU-Belege: `WebEmitterShipSystem` (30 EPS Aktivierung, 10/Tick, 24 h Cooldown), `TholianWebUtil.updateWebFinishTime` (Massenverhältnis und Unterstützer-Neuberechnung), `TholianWebConsequence` (Entkommen aus unfertigem Netz), `FinishTholianWebs` (Teilflotten/Traktoren), `TholianWebWeaponPhase` (65–85 % Maxhülle, 25 % kritischer Energiewaffenschaden). SWU hat Interaction Policy, destruktionssichere Persistenz, Flottennachfolge und explizite `anomalyMass`, aber kein Netzmodell/-System. Verfügbarkeit und dauerhafter Netzverlust sind im Kind 1a als konkrete Empfehlung vorbereitet.

## Comments

- 2026-11-16 – Triage: Autorisierter Tracking-Split in SPEC-1a/b/c; keine Netzfunktion umgesetzt. Siehe [Audit](../triage-2026-11-16.md).

- 2026-11-17 – Nutzerentscheidung: Das STU-Tholianische Netz hat für diesen Spielumfang kein passendes Star-Wars-Pendant. Interdiktornetz, Projektor, Fangzustand und Implosion werden nicht umgesetzt. Bewusste Ausnahme von der STU-Parität; keine alternative Fangmechanik ableiten.

## Answer

Das Parent und alle drei Kindtickets SPEC-1a/b/c sind `wontfix`. Der frühere `resolved`-Status bezeichnete ausschließlich den Tracking-Split. Die Funktion wurde nicht implementiert und wird auf Nutzerentscheidung nicht gebaut.
