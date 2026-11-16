# Interdiktornetz: Ausstattung, Datenmodell und Aufbau

**Status:** needs-info
**Priority:** P3
**Size:** M
**Blocked by:** sc-WP-ENG-2a, sc-WP-COMBAT-3

## Ziel

Ein persistentes Fangprojekt mit Erbauer, Ort, Unterstützern, Zielen und Fertigstellungszeit aufbauen. Dieses Kind besitzt Aufbau, Unterstützung und Abbruch; Bewegungssperre/Fertigstellung und Implosion folgen in 1b/c.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Component/Spacecraft/System/Type/WebEmitterShipSystem.php`
- `Module/Ship/Action/TholianWeb/{Create,Support,Unsupport,Cancel}TholianWeb.php`
- `Module/Ship/Lib/TholianWebUtil.php`
- `Module/Spacecraft/Lib/Movement/Component/Consequence/Flight/TholianWebConsequence.php`

## SWU-Pfade

`spacecraft/spacecraft-runtime-state.service.ts`, `spacecraft/interaction-policy.ts`, `spacecraft/spacecraft.service.ts`, `spacecraft/entities/ship-class-def.entity.ts`, `spacecraft/spacecraft-destruction.service.ts`, `game-data/data/modules/special.yaml`, passende Waren/Fertigungsdaten, Migration und Shared-DTOs.

## Offene Frage

Welche Schiffe erhalten den Projektor und welche sichere Verlustregel gilt für ein fertiges Netz? SWU hat keinen dedizierten angreifbaren Netz-Spacecraft-Typ wie STU. Ohne explizite Auflösung bei Verlust des Erbauers drohen unauflösbare Fangzustände.

**Empfehlung zur Freigabe:** optionales Spezialmodul **Interdiktorprojektor** für mobile Schiffe beider Fraktionen, maxLevel 1, Forschung Erweiterte Antriebstechnik III. Bauwerte wie Hyperraum-Spule: 25.000 Credits, 500 Durastahl, 150 Kyber-Kristalle, 200 Tibanna-Gas, 30 Beskar, 400 kristallines Silizium, 250 Energiemodule, Bauzeit 250, Basiscrew 2. STU-Betriebswerte übernehmen: 30 EPS Start/Unterstützung, 10 EPS je aktivem Haupttick, 24 Stunden erneute Aktivierungssperre. Zielbindung wird erst bei Fertigstellung zur Bewegungssperre; während Aufbau dürfen Ziele entkommen. Bei Zerstörung/Ausbau/Verlust des Erbauerprojektors wird auch ein fertiges Netz schadlos aufgelöst und gemeldet, statt einen neuen bekämpfbaren Spacecraft-Typ einzuführen. Der Ticketumfang bleibt Bewegungssperre plus explizite Implosion; zusätzliche STU-Barrieren für regulären Kampf/Transfer zwischen Innen/Außen sind nicht enthalten. Neue Bauwerte und die Verlustregel sind Vorschläge, keine beschlossene Abweichung.

## Akzeptanzkriterien nach Freigabe

- [ ] Migration für Netz/Projektstatus, ownerId, builderShipId, locationId, start/finish-Zeit, Unterstützer und Ziele; eindeutiges aktives Projekt je Ort und eindeutige Teilnahme/Zielbindung. Terminale Projekte hinterlassen keine blockierenden Verweise.
- [ ] Ein eigenes qualifiziertes mobiles Schiff kann ein Projekt für deduplizierte sichtbare kopräsente intakte Ziele starten. Urlaubsschutz, Tarnung, Position und bestehende Bindungen werden serverseitig unter geordneten Sperren geprüft; keine geheimen Ziele via Fehlermeldungen offenlegen.
- [ ] Gewicht ist die positive explizite `anomalyMass` der Rümpfe (dieser Wert stammt bei zugeordneten STU-Rümpfen aus `tractor_mass`); keine Kampfwertschätzung, kein Stations-/10-Faktor. Fehlende Werte verweigern den Start mit konkretem Grund. Anfangsdauer = ceil(Summe Zielmassen / Summe Projektormassen) × 3600 Sekunden.
- [ ] Weitere eigene qualifizierte Schiffe dürfen freiwillig am kopräsenten unfertigen Netz unterstützen; kein automatischer Flottenbeitritt zur Unterstützung. Nach Änderung der Unterstützerzahl wie STU verbleibende Zeit × alte Anzahl / neue Anzahl, auf Sekunden aufrunden. Ohne Unterstützer oder Ziele Abbruch und Freigabe. Zielentkommen entfernt seine Bindung; die laufende Uhr wird dadurch nicht still neu gestartet.
- [ ] Start/Unterstützung bucht die freigegebenen EPS und persistierte Cooldownzeit atomar. Beteiligte Projektoren werden im Tick bei Defekt, fehlender Crew/EPS, Flug oder Zerstörung aus dem Aufbau entfernt; Cooldown wird nicht durch Reaktivierung/Abbruch umgangen.
- [ ] Abbruch nur vom Erbauer-Eigner; Unterstützung beenden nur für eigenes Schiff. Alle gebundenen Verweise und Systemzustände werden bereinigt, Eigner informiert. Keine Besitzübernahme durch Unterstützer.
- [ ] API/Shared liefern Aufbaustatus, sichtbare Ziele, Teilnehmer, Restzeit, Start-/Unterstützungs-/Abbruchaktionen mit Gründen. Fokussierte UI für Aufbau; finale Aktionen folgen in 1c.
- [ ] PostgreSQL und feste Uhr prüfen konkurrierenden Start, Doppelziele, Rechte/Urlaub/Tarnung, Gewichte/Nullwerte, EPS-Rollback, Unterstützerwechsel, Abbruch, Entkommen, Cooldown und saubere Löschpfade; Frontend prüft Aufbauaktionen.

## Comments

- 2026-11-16 – Triage: Kind des Tracking-Splits [SPEC-1](sc-WP-SPEC-1-interdiktornetz.md). Vorschläge sind erst nach Freigabe verbindlich; kein Produktcode geändert. Siehe [Audit](../triage-2026-11-16.md).
