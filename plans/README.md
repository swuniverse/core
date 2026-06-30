# Kolonie: SWU-modernisierte STU-Parität

Ziel: Kolonie-System in SWU gegen STU vervollständigen, aber nicht 1:1 UI/PHP kopieren. Regeln und Gameplay-Parität bleiben wichtig; API, React-UI und Service-Schnitt bleiben SWU-modern.

Nicht-Ziel: STU Colony Sandbox bleibt erstmal ignoriert.

Priorität hoch → niedrig:

1. `01-colony-options-message.md` — Kolonie-Optionen: Bevölkerungslimit, Einwanderung, Nachricht, Rename-UX.
2. `02-colony-buildplans.md` — Schiffbau-Baupläne: create/rename/delete/reuse.
3. `03-colony-demolition-activation-effects.md` — Abriss/Recycling, Aktivierungsprüfungen, abhängige Deaktivierungen.
4. `04-colony-orbit-shuttle-management.md` — Orbit-/Shuttle-/Station-Management und Blockade/Defense-Anbindung.
5. `05-colony-shipyard-fabrication-depth.md` — Werft/Fabrication-Tiefe: FighterShipyard, Module Screens, Repair/Retrofit Edge Cases.
6. `06-colony-waste-scan-specials.md` — Waste, Sector Scan, Subspace Telescope, Pods.
7. `07-colony-visual-database-intel.md` — Visual panel/time/rotation, database/alliance/player-profile intelligence views.

Abarbeitung mit Pi Agent: siehe `automation-pi-agent.md` und `pi-plan-queue.json`.

Globale Guardrails:

- Vor jedem Slice STU-Referenzdateien lesen und aktuelle SWU-Dateien prüfen.
- Keine Sandbox-Arbeit.
- Keine breite `ColonyService`-Neuschreibung. Nur gezielt extrahieren, wenn Slice dadurch kleiner/sicherer wird.
- UI lebt unter `apps/frontend/src/pages/colonies/`.
- Backend lebt unter `apps/backend/src/modules/colony/`.
- STU-Namen nur für Mapping/IDs, UI nutzt kuratierte SWU-Namen.
- Bevölkerung: aktuell = `stats.workers + stats.workless`, fallback `colony.population`.
- Verification pro Slice: relevante Jest-Tests + `NX_SOCKET_DIR=/tmp/nx-tmp npx nx run backend:typecheck`; bei UI `npx nx run frontend:typecheck`.
