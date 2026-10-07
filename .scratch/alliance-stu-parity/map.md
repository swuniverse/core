# Allianz – vollständige STU-Parität

## Destination

Sechs aufeinander abgestimmte Etappen-Spezifikationen beschreiben die noch fehlende funktionale, spielerwirksame STU-Parität des Allianzsystems so vollständig, dass jede Etappe anschließend mit `/to-spec` und `/to-tickets` ohne offene Produktentscheidung umgesetzt werden kann.

## Notes

- Verbindliche Grundlagen sind `CONTEXT.md`, `docs/adr/0001-allianzen-abweichungen-von-stu.md`, `.scratch/alliance/spec.md` und `.scratch/alliance/stu-alliance-research.md`.
- Maßstab ist funktionale Spielerparität, nicht Quellcodeparität. Bestehende SWU-Domänenregeln und ADRs gehen STU-Verhalten vor; bekannte STU-Bugs und Sicherheitslücken werden nicht übernommen.
- Die Route endet bei sechs koordinierten Etappen-Spezifikationen: Diplomatie-Kern, Beziehungswirkungen, Allianz-Infrastruktur, Interne Zusammenarbeit, Lebenszyklus und Restparität sowie Siedler-Abkommen.
- Rechte und Auswirkungen werden serverseitig durchgesetzt und anhand beobachtbaren Verhaltens getestet. Shared DTOs und Interfaces liegen in `packages/shared`; Backend und Frontend folgen `CONTRIBUTING.md`.
- Etappen dürfen hinter ausdrücklichen Fähigkeiten unabhängig ausgeliefert werden. Eine Fähigkeit wird erst sichtbar, wenn alle zugehörigen Serverpfade wirksam sind; Datenbankmigrationen müssen vor Aktivierung rückwärtskompatibel sein.
- Fehlende eigenständige Spielsysteme werden als benannte künftige Integrationspunkte festgehalten und nicht allein für eine Allianzregel neu gebaut.

## Decisions so far

- [Paritätsziel, Quellen und Etappenschnitt](issues/01-paritaetsziel-quellen-und-etappenschnitt.md): Funktionale, sichere Spielerparität wird in sechs abgestimmte Etappen-Spezifikationen zerlegt.
- [Beziehungsmodell und Zustandsmaschine](issues/02-beziehungsmodell-und-zustandsmaschine.md): Ein gemeinsames Parteienmodell trägt sechs Beziehungstypen mit genau einer aktiven Beziehung und höchstens einem Vorschlag je Paar.
- [Ämter und Diplomatierechte](issues/03-aemter-und-diplomatierechte.md): Die drei festen Ämter erhalten eine serverseitig durchgesetzte, nicht konfigurierbare Zuständigkeitsmatrix.
- [Beziehungsfreigaben und Vertragswerk](issues/04-beziehungsfreigaben-und-vertragswerk.md): Wirkungen und Vertragsänderungen werden unabhängig vom Beziehungstyp gemeinsam ausgehandelt.
- [Freund-Feind-Auflösung und Spielwirkungen](issues/05-freund-feind-aufloesung-und-spielwirkungen.md): Eine zentrale, priorisierte Beziehungsauflösung steuert alle vorhandenen serverseitigen Spielwirkungen.
- [Sternenkarte, Scans und Sichtbarkeit](issues/06-sternenkarte-scans-und-sichtbarkeit.md): Live-Positionen, Allianzobjekte, Scans und Farben folgen klar abgegrenzten dynamischen Sichtbarkeitsregeln.
- [Zugangsprivilegien und Allianzdepots](issues/07-zugangsprivilegien-und-allianzdepots.md): Zugänge unterstützen Spieler-, Allianz- und Fraktionsziele; Depots bleiben Eigentum ihrer Besitzer.
- [Mitgliederdaten und Allianzforum](issues/08-mitgliederdaten-und-allianzforum.md): Verwaltung zeigt nur operative Daten; das Mitgliederforum erhält vollständige serverseitige Autorisierung und sichere Moderation.
- [Banner und Beschreibungsplatzhalter](issues/09-banner-und-beschreibungsplatzhalter.md): Sichere PNG-Banner werden über eine austauschbare Ablage verwaltet; Namens-BBCode und Übersetzungsblöcke entfallen.
- [Diplomatie-Chronik und Allianzchronik](issues/10-diplomatie-chronik-und-allianzchronik.md): Öffentliche Diplomatie und interne Allianzereignisse werden getrennt und unveränderlich protokolliert.
- [Nachfolge, Auflösung und Reset](issues/11-nachfolge-aufloesung-und-reset.md): Automatische Präsidentennachfolge ist deterministisch; Auflösung und Reset bereinigen den gesamten Allianzkontext.
- [Siedler-Abkommen und Parteiewechsel](issues/12-siedler-abkommen-und-parteiwechsel.md): Das gemeinsame Modell umfasst allianzlose Spieler und beendet deren persönliche Beziehungen beim Allianzbeitritt endgültig.
- [Grenzwerte, Benachrichtigungen und Auslieferung](issues/13-grenzwerte-benachrichtigungen-und-auslieferung.md): Sichere Limits, Post-Commit-Nachrichten und fähigkeitsbasierte Aktivierung gelten über alle Etappen.
- [Vorhandene Zugangs- und Scanpfade](issues/05-vorhandene-zugangs-und-scanpfade.md): Historische Koloniescans werden dynamisch nur innerhalb der aktuellen Allianz geteilt; Docking, spielergesteuerte Wurmlochrechte und Handelsposten bleiben mangels vorhandener Zugangspfade benannte Integrationspunkte.

- [Alarm- und automatische Kampfreaktionen](issues/02-alarm-und-kampfreaktionen.md): SWU besitzt noch keinen alarmgesteuerten Kampftrigger; T-029 muss später Alarm Gelb über `mayReactAutomatically` und Alarm Rot über `!isFriend` an die zentrale Auflösung anbinden, ohne direkte Angriffe zu verändern.
- [Live-Positionsfreigabe](issues/04-live-positionsfreigabe.md): `GET /api/spacecraft/shared-live-positions` prüft serverseitig die zentrale Fähigkeit `mayShareLivePosition`; nur aktive same-faction-Freigaben werden sichtbar, während Vorschläge, beendete Beziehungen, Cross-Faction-Parteien und Fehler sicher ausgeschlossen bleiben. Historische Scans bleiben unabhängig.

## Not yet specified

- Keine offenen Produktentscheidungen. Neu entdeckte spielerwirksame Allianzfunktionalität wird bei der Ausarbeitung der Etappen aufgenommen, sofern sie innerhalb der festgelegten Produktgrenze liegt; andernfalls wird sie als künftiger Integrationspunkt benannt.

## Out of scope

- Der 30-prozentige Prestigeanteil aus STUs Piratenrunde, solange SWU kein entsprechendes Rundensystem besitzt.
- Tote Pfade, Implementierungszufälle sowie bekannte STU-Bugs und Sicherheitslücken.
- `[translate]`-Blöcke und BBCode in Allianznamen.
- Export oder Archivierung des Allianzforums.
- Eigenständige, in SWU fehlende Spielsysteme, die nur als Träger einer Allianzregel gebaut würden.
