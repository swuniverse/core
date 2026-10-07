# 05: Weitere vorhandene Zugangs- und Scanpfade anbinden

**What to build:** Jeder im aktuellen Spiel vorhandene Docking-, Wurmloch-, Handelsposten- oder Scanpfad, der Freund, Feind oder Neutral benötigt, verwendet die zentrale Beziehungsauflösung. Fehlende eigenständige Spielsysteme werden nicht neu gebaut, sondern als spätere Integrationspunkte dokumentiert.

**Blocked by:** 01: Zentrale Beziehungsauflösung

**Status:** resolved

**Triage label:** ready-for-agent
**Tracker:** local Markdown issue tracker (`.scratch/alliance-stu-parity/issues/05-vorhandene-zugangs-und-scanpfade.md`)

- [x] Jeder vorhandene betroffene Zugangs- oder Scanpfad verwendet die zentrale Resolver-Seam.
- [x] Kein Verbraucher rekonstruiert Freund, Feind oder Neutral lokal.
- [x] Serverseitige Prüfungen verhindern Zugriff allein durch UI-Manipulation.
- [x] Eine Beziehung schaltet nicht ungefragt jeden Zugang frei; bestehende explizite Privilegien bleiben erforderlich.
- [x] Fehlende eigenständige Systeme werden nicht als neue Allianzfunktion gebaut.
- [x] Vorhandene Verbraucher erhalten Verhaltenstests für Freund, Neutral, Feind und sichere Fehlerfälle.

## Answer

Die Inventur des aktuellen Servercodes ergab genau einen vorhandenen Scanpfad mit beziehungsabhängigem Fremdzugriff: historische Koloniescans. Deren Listen- und Detailzugriff verwendet jetzt die zentrale `RelationshipResolverService`-Fähigkeit `mayShareHistoricalScans`. Sie wird ausschließlich für aktuelle Mitglieder derselben Allianz erteilt. Eine ausgehandelte Freundbeziehung, Neutralität, Feindschaft, eine fehlende Partei oder ein Resolverfehler erteilt keinen Zugriff. Eigene Scans bleiben zugänglich; Löschen bleibt ausdrücklich dem Eigentümer vorbehalten. Der Zugriff wird bei jedem Request serverseitig aus der aktuellen Mitgliedschaft abgeleitet, sodass Austritt oder Rauswurf ohne kopierte Freigabedaten sofort wirken.

Die vorhandenen aktiven Scanaktionen (Sektor-, Systemfeld-, Oberflächen-, Kolonie-, Nahbereichs- und Kolonieumgebungsscan) sind Sensoraktionen innerhalb vorhandener Reichweiten. Sie benötigen für ihre Durchführung keinen Freund-, Feind- oder Neutralstatus und wurden deshalb nicht künstlich eingeschränkt. Insbesondere bedeutet Live-Positionsteilung weiterhin keine Scanfreigabe.

Die übrigen benannten Systeme besitzen derzeit keinen anzubindenden Spielerzugang:

- **Docking:** Kein serverseitiger Docking- oder Dockrechtspfad vorhanden. Künftiger Integrationspunkt ist die serverseitige Dock-Aktion; sie muss die zentrale Beziehungsfähigkeit zusätzlich zu ausdrücklich passenden Spieler-, Allianz- oder Fraktionsprivilegien prüfen, wobei ein Verbot Vorrang behält.
- **Wurmlöcher:** `WormholeService` verwaltet aktive Welt-/Adminobjekte; Spieler besitzen oder konfigurieren keine Wurmlochrechte, und die Schiffsbewegung verwendet keinen privaten Wurmlochzugang. Künftiger Integrationspunkt ist eine spätere spielergesteuerte Wurmloch-Durchquerung beziehungsweise Rechteprüfung mit denselben expliziten Privilegien und der zentralen Resolver-Seam.
- **Handelsposten:** Kein eigenständiger serverseitiger Handelsposten- oder Zugangspfad vorhanden. Künftiger Integrationspunkt ist die serverseitige Öffnen-/Handelsaktion; Freundstatus allein darf sie nicht freischalten, sondern nur zusammen mit einer ausdrücklichen Zugangsregel wirken.

## Comments

Implemented and documented on this ticket branch. Focused resolver and spacecraft scan behavior tests cover same-alliance access, negotiated friendship without scan access, neutral/enemy denial, and fail-closed resolution.
