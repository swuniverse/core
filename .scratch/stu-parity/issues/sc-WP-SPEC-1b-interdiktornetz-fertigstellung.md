# Interdiktornetz: Fertigstellung, Bewegungssperre und Auflösung

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** sc-WP-SPEC-1a

## Ziel

Das Projekt aus 1a wird idempotent fertiggestellt und bindet seine verbleibenden Ziele an das Feld. Alle normalen und besonderen Bewegungspfade respektieren die Bindung; Auflösung und Verlustpfade geben sie frei.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Tick/Process/FinishTholianWebs.php`
- `Module/Ship/Action/TholianWeb/RemoveTholianWeb.php`
- `Module/Ship/Lib/TholianWebUtil.php`
- `Module/Spacecraft/Lib/Movement/ShipMover.php`

## SWU-Pfade

`field-transition-executor.ts`, `spacecraft.service.ts` (navigate/flyGalaxy/enterSystem/leaveSystem), `wormhole-passage.service.ts`, `navicomputer-jump.service.ts`, Traktor-/Flotten-/Zerstörungsdienste, Tickorchestrierung, Netzmodell aus 1a, Shared-DTOs.

## Verbindliche Grenze

Die in 1a freizugebende Erzeugungs-/Verlustregel ist Voraussetzung. Dieses Kind fügt keine zusätzlichen regulären Kampf-/Transfersperren an der Netzgrenze hinzu. Es gibt keinen eigenen Bewegungsexecutor und keinen zeitbasierten Warpflug.

## Akzeptanzkriterien

- [ ] Ein Tick stellt jedes fällige aktive Projekt genau einmal fertig, nachdem Teilnehmer, Ziele, Ort und Schutzstatus erneut geprüft wurden. Nicht mehr zulässige/entkommene/zerstörte Ziele werden entfernt; ein leeres Netz wird aufgelöst. Projektoren verlassen Aufbauzustand, Zielbindung wird aktiv.
- [ ] Teilweise gefangene Flotten trennen die gefangenen Mitglieder nach den vorhandenen Flotten-/Nachfolgeregeln ab; vollständig gefangene Flotten bleiben bestehen. Traktorverbindungen der gebundenen Ziele werden auf beiden Seiten beendet und gemeldet.
- [ ] Zentrale Bindungsprüfung sperrt aktive Ziele bei System-/Galaxieflug, Ein-/Austritt, Wurmloch, Navicomputer-Sprung und Schleppbewegung. Die Prüfung läuft auch innerhalb der jeweiligen Bewegungs-/Schiffssperre. Kein Direkt-API- oder Flottenweg umgeht die Bindung, keine EPS/Signaturen vor einer verweigerten Transition.
- [ ] Unfertige Bindung verhindert Navigation noch nicht: erfolgreicher Feldwechsel löst den Zielverweis und entfernt fliegende Unterstützer, niemals nach einer fehlgeschlagenen Bewegung.
- [ ] Schadlose Auflösung verlangt Netz-Eigentum und fertigen Status; sie bereinigt alle Ziel-/Erbauer-/Systemverweise und publiziert Meldungen nach Commit. Parallel zu Fertigstellung, Bewegung oder Implosion ist nur eine terminale Aktion möglich.
- [ ] Freigegebene Verlustregel aus 1a, Kontolöschung/Reset und Zerstörung gefangener Ziele können keine unauflösbaren Verweise hinterlassen; Urlaubsschutz bei Fertigstellung wird nicht umgangen.
- [ ] Status/Öffnen-Gründe in Feld-/Schiff-UI unterscheiden Aufbau, Bindung und Auflösung. Tests mit echter PostgreSQL-Transaktion prüfen Tick-Doppelaufruf, Teil-/Gesamtflotte, Traktor, jeden Bewegungspfad, geänderte Rechte/Ziele und Race/Rollback.

## Comments

- 2026-11-16 – Triage: Kind des Tracking-Splits [SPEC-1](sc-WP-SPEC-1-interdiktornetz.md). Vorschläge sind erst nach Freigabe verbindlich; kein Produktcode geändert. Siehe [Audit](../triage-2026-11-16.md).
