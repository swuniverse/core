# STU-Parität: Messpunktbasierte Systemkartographie

Status: ready-for-agent

Bezug: `CONTEXT.md`, `docs/adr/0002-persoenliche-systementdeckung-und-dynamisches-scanwissen.md`, `.scratch/stu-systemdatenbank-und-kolonie-scans/spec.md` sowie kanonischer lokaler STU-Quellcode unter `/Users/TMUNDIN/git/github.com/st-universe/core`.

## Problem Statement

Die vorhandene SWU-Astrometrie entdeckt nach einem einzelnen, schiffsgebundenen Tickauftrag das gesamte aktuelle Sternensystem. Sie sperrt Navigation, hat kein Astrometrie-Labor, keine Messpunkte und keinen benutzer-/systemgebundenen Fortschritt. Das weicht wesentlich vom kanonischen STU-Ablauf ab: Dort aktivieren Spieler ein Astrometrie-Labor, planen eine Route mit Messpunkten, fliegen diese an und finalisieren anschließend die Kartographie über drei Ticks.

Die zuvor integrierte kompakte Schiffsinformation zeigt Astrometrie und Sektor-Scan bereits im richtigen Kontext, muss nun aber den echten Kartographiestatus darstellen statt den alten Ein-Tick-Auftrag zu steuern.

## Lösung

SWU ersetzt die Ein-Tick-Astrometrie vollständig durch eine persönliche, systemgebundene Kartographie-Zustandsmaschine:

```text
PLANNABLE → PLANNED → MEASURED → FINISHING → DONE
```

Ein Kartographieplan gehört einem Spieler und einem Sternensystem, nicht einem Schiff. Alle eigenen Schiffe des Spielers im selben System sehen daher denselben Status. Qualifizierte eigene Schiffe mit aktivem/intaktem Astrometrie-Labor können Messpunkte beim Anflug abarbeiten; eines von ihnen kann die Finalisierung starten.

Der Umfang umfasst ausschließlich Sternensysteme. STU-Kartenregionen bleiben außerhalb dieses Vorhabens.

## Begriffe

- **Astrometrie-Labor:** Konkretes Spezialmodul `Astrometrie-Labor`, das als eigenständiges aktivierbares Schiffssystem fungiert. Es ist keine generische Spezialslot-Fähigkeit.
- **Kartographieplan:** Persönlicher, systemgebundener persistierter Eintrag mit Zustand, verbleibenden Messpunkten und gegebenenfalls Finalisierungsbindung.
- **Messpunkt:** Persistierte Feldreferenz eines geplanten Systems. Ein qualifiziertes eigenes Schiff arbeitet ihn beim tatsächlichen Anflug ab.
- **Finalisierung:** Bewusster, kostenpflichtiger Drei-Haupttick-Abschluss nach allen Messpunkten. Erst ihr Erfolg erzeugt die persönliche Systementdeckung.
- **Qualifiziertes Schiff:** Eigenes Schiff mit installiertem, aktivem und intaktem Astrometrie-Labor sowie aktiven/intakten Kurz- und Langstreckensensoren; weitere kontextuelle Handlungsbedingungen gelten je Aktion.

## Zustands- und Fachregeln

### Astrometrie-Labor

1. Nur das konkrete, über die bestehende Ausrüstungs-/Slotkompatibilität installierbare Modul `Astrometrie-Labor` befähigt zur Kartographie. Es gibt keine zusätzliche hardcodierte Schiffsklassenliste.
2. Das Labor wird ausschließlich durch die kompakte Zeile im `Informationen`-Kasten aktiviert/deaktiviert, nicht durch einen separaten Eintrag der Schiffskontrolle.
3. Aktivieren kostet 1 EPS und setzt voraus: kein Tarnmodus, aktive/intakte Kurzstreckensensoren, aktive/intakte Langstreckensensoren und ausreichende Energie.
4. Solange aktiv, kostet das Labor 1 EPS je Haupttick, auch ohne Plan oder außerhalb eines Systems. Es bleibt bei Systemwechsel und nach Erfolg aktiv, bis es manuell oder durch die bestehende Energie-/Systemlogik deaktiviert wird.
5. Tarnung schaltet ein aktives Labor ab. Sensor- oder Laborverlust, Zerstörung und Brownout schalten es ebenfalls ab. Während einer Finalisierung wird diese dadurch auf `MEASURED` zurückgesetzt.

### Planung und Messpunkte

6. Ein Spieler kann in einem persönlich noch nicht entdeckten System mit einem qualifizierten Schiff einen Plan anlegen. Existiert bereits ein Plan, bleibt er unverändert; wiederholte Aktionen erzeugen keine neuen Punkte.
7. Beim Planen schaltet die LRS-Ansicht auf `CARTOGRAPHY`, ohne Sensoren implizit zu aktivieren.
8. Die Auswahl enthält höchstens fünf unterschiedliche Messpunkte: bis zu zwei besiedelte Felder, dann kolonialisierbare Felder, dann sichere zufällige Felder. Das aktuelle Startfeld ist in **allen** Auswahlstufen ausgeschlossen (bewusste SWU-Abweichung gegenüber der STU-Implementierung).
9. Weniger als fünf Messpunkte sind zulässig. Wenn kein Messpunkt verfügbar ist, wird der Plan unmittelbar `MEASURED`.
10. Nur ein Anflug eines qualifizierten eigenen Schiffs auf ein verbleibendes Messpunktfeld arbeitet genau diesen Punkt ab. Die Messpunktphase sperrt Navigation nicht.
11. Jeder erreichte Messpunkt gibt atomar 1 Prestige und erzeugt eine In-Game-Mitteilung. Kanonische STU-Crew-Erfahrung wird wegen fehlender SWU-Crew-XP-Infrastruktur nicht implementiert, aber als Paritätslücke dokumentiert.
12. Deaktivierte/beschädigte Sensoren oder ein deaktiviertes Labor pausieren lediglich den Fortschritt. Der Plan und bereits erreichte Punkte bleiben; nach Reaktivierung zählt ein weiterer passender Anflug wieder automatisch.
13. Der Plan bleibt bei Verlassen eines Systems bestehen und ist bei Rückkehr unverändert sichtbar.
14. Kolonie-/Besitzerwechsel verändern die beim Planen gespeicherten Messpunkte nicht. Verschwundene einzelne Restfelder werden entfernt; sind danach keine ursprünglich verbleibenden gültigen Felder mehr vorhanden, wird der Plan ohne Belohnung ungültig beendet. Ist das System inzwischen persönlich entdeckt, wird ein offener Plan ebenfalls ohne weitere Belohnung beendet.

### Finalisierung und Entdeckung

15. Nach dem letzten Messpunkt ist der Plan `MEASURED`. Ein qualifiziertes, sonst untätiges Schiff kann die Finalisierung starten, wenn es nicht in Bereitschaft, Flug, Kampf oder Reparatur ist.
16. Finalisierung kostet einmalig 15 EPS, dauert drei Hauptticks und darf atomar höchstens einmal gleichzeitig pro Spieler/System laufen.
17. Während `FINISHING` ist ausschließlich das finalisierende Schiff für Navigation und Reparaturen gesperrt. Andere eigene Schiffe bleiben handlungsfähig, sehen jedoch nur den gemeinsamen Countdown und erhalten keinen Fernabbruchknopf.
18. Flug, Zerstörung, Tarnung, Labor-/Sensorverlust oder Brownout des finalisierenden Schiffs setzen `FINISHING` auf `MEASURED` zurück. Messpunktfortschritt bleibt bestehen; 15 EPS werden nicht erstattet. Ein anderes qualifiziertes eigenes Schiff kann später übernehmen.
19. Nach drei erfolgreichen Hauptticks entsteht die persönliche Systementdeckung idempotent. Sie gibt 10 Prestige für die Sternensystem-Entdeckung. Das Labor bleibt aktiv.
20. `DONE` ist der dauerhafte Endzustand: neue Pläne, Punkte, Finalisierungen oder Belohnungen sind nicht möglich.

## Oberfläche

21. Der `Informationen`-Kasten bleibt STU-kompakt: eine Laborzeile sowie eine Kartographie-/Statuszeile. Bei `PLANNED` erscheint ausschließlich `Verbleibende Messpunkte: N`.
22. Die Laborzeile wechselt zwischen `Astrometrisches Labor aktivieren` und `Astrometrisches Labor deaktivieren`. Fehlende Voraussetzungen erscheinen als konkrete STU-artige Meldung im Dialog.
23. Nicht-Laborschiffe im selben System sehen den persönlichen Planstatus und können den Kartographie-Dialog schreibgeschützt öffnen. Außerhalb des Systems zeigen sie keinen fremden Systemplan.
24. Der Dialog zeigt ausschließlich die verbleibenden Koordinaten auf einer kleinen nicht-taktischen Systemrasterkarte. Er löst keine Bewegungs-, Scan- oder Fernaktionen aus.
25. Planen und die 15-EPS-Finalisierung werden über bestätigte Dialogaktionen ausgelöst. Labor-Deaktivierung erfolgt sofort; bei Finalisierung erscheint eine klare Rücksetzmeldung.
26. Messpunktfortschritt, Abbruch und Abschluss erzeugen In-Game-Mitteilungen zusätzlich zur UI-Aktualisierung.

## Ablösung und API

27. Die nicht produktive Tabelle/Entity/API des alten Ein-Tick-Systems `spacecraft_astrometry_jobs` wird vollständig entfernt statt migriert.
28. Die alten binären Platzhalter `GET /spacecraft/:id/cartography` und `POST /spacecraft/:id/cartography/survey` werden durch einen echten zustandsbasierten Kartographievertrag ersetzt oder entfernt.
29. Der bestehende automatische Pfad `discoverSystem(... source: 'NAVIGATE')` darf keine persönliche Systementdeckung mehr erzeugen. Persönliche Systementdeckung entsteht ausschließlich über die erfolgreiche Finalisierung.

## Kanonische STU-Referenzen

- `src/Orm/Entity/AstronomicalEntry.php`
- `src/Component/Ship/AstronomicalMappingStateEnum.php`
- `src/Component/Spacecraft/System/Type/AstroLaboratoryShipSystem.php`
- `src/Module/Ship/Action/AstroMapping/PlanAstroMapping.php`
- `src/Module/Ship/Action/AstroMapping/StartAstroMapping.php`
- `src/Module/Spacecraft/Lib/Movement/Component/Consequence/PostFlight/PostFlightAstroMappingConsequence.php`
- `src/Module/Tick/Spacecraft/Handler/FinishedAstroMappingHandler.php`
- `src/Module/Ship/View/ShowShip/ShipShowStrategy.php`
- `src/html/spacecraft/control/control_mid.twig`

## Dokumentation

Die Ablösung des bisherigen Ein-Tick-Auftrags, die systemgebundene persönliche Plansemantik, der stets ausgeschlossene Startpunkt und die fehlende Crew-XP-Belohnung werden in ADR und `CONTEXT.md` festgehalten.
