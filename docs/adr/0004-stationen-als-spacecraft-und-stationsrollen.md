# Stationen als Spacecraft-Typ und kanonische Stationsrollen

## Kontext und Entscheidung

SWU bildet eine **Station** als unbeweglichen Typ von `Spacecraft` ab, nicht als unabhängige Wurzel-Entity. Ein persistierter Diskriminator unterscheidet künftig `SHIP` und `STATION`; die Klassen- und Spieldaten erhalten dazu passende Typ- und Rollenangaben. Stationsspezifische Zustände wie Baufortschritt, Dockplätze, Zugangsregeln, Reparaturen und Allianzdepot-Zuordnung werden als eigene, an das `Spacecraft` gebundene Entities beziehungsweise Dienste ergänzt.

Damit verwenden Stationen dieselben Laufzeitsysteme, Module, Hüllen-, Schild- und Energiewerte, Frachtbestände, Kurzstreckensensoren und Kampfmechaniken wie Schiffe. Navigation, Flottenzugehörigkeit und andere bewegliche Fähigkeiten bleiben durch den Typ ausgeschlossen. Diese Entscheidung vermeidet parallele Implementierungen für Lager, NBS und Kampf, ohne stationsspezifische Lebenszyklen in die allgemeine Entity zu pressen.

## Stationsrollen

Die folgenden Star-Wars-Bezeichnungen sind in SWU kanonisch. `Konstrukt` bezeichnet den temporären Bauzustand; die übrigen Rollen bezeichnen fertige Stationen. „Über einem System“ bedeutet eine Position auf der Galaxiekarte am System, „im System“ eine Position im Systemraster und „außerhalb“ eine Galaxieposition ohne System.

| Technische Rolle | SWU-Bezeichnung | Zulässiger Ort | Limit je Spieler | Workbees | Dockplätze |
|---|---|---|---:|---:|---:|
| `CONSTRUCTION` | Konstrukt | überall außer Wurmloch und stationsgesperrtem Feld | 2 | 5 für die Errichtung | 50 während Bau oder Abwracken |
| `DEPOT_SMALL` | Versorgungsdepot | im System | unbegrenzt | 15 | 15 |
| `DEPOT_LARGE` | Logistikzentrum | im System | 1 | 20 | 20 |
| `SHIPYARD` | Raumwerft | im System | 2 | 10 | 2 |
| `SENSOR` | Sensorphalanx | überall | unbegrenzt | 5 | 2 |
| `OUTPOST` | Außenposten | außerhalb eines Systems | unbegrenzt | 30 | 30 |
| `BASE` | Raumstation | über einem System | unbegrenzt | 40 | 40 |

Das erste Konstrukt benötigt fünf einsatzfähige, bemannte Workbees sowie 100 Baumaterial und 50 Duranium. Der Ausbau in eine Rolle benötigt zusätzlich die in der Tabelle angegebene Anzahl einsatzfähiger Workbees; das Konstrukt muss die erforderlichen Güter und Workbees vollständig enthalten. Bei späterem Abwracken beziehungsweise passiver Reparatur gelten die rollenbezogenen Workbee-Anforderungen der jeweiligen Mechanik.

### Plan für Stationsklassen

`sc-WP-STAT-1b` legt je Rolle mindestens eine Klasse pro SWU-Fraktion an. Alle Werte werden aus den heutigen STU-Rumpfdaten übernommen; fraktionsabhängige Unterschiede werden beibehalten. Die Klassen heißen passend zum Setting, verwenden aber dieselben Rollenwerte. Der Plan umfasst pro Fraktion:

- Rebellenallianz: `REBEL_*` mit STU-Rumpf-Referenzen `10011`, `10021`, `10031`, `10041`, `10051`, `10061`.
- Galaktisches Imperium: `EMPIRE_*` mit denselben Rollenwerten; als Ausgangspunkt dient jeweils die fraktionsspezifische STU-Variante. Da STU fünf Fraktionen führt, ordnet `sc-WP-STAT-1b` die Varianten anhand des Klassenprofils den beiden SWU-Fraktionen zu und dokumentiert diese Zuordnung in den Spieldaten.

Die folgenden Basiswerte sind der verbindliche gemeinsame Kern; fraktionsspezifische Sensor-, EPS- und Massewerte werden beim Datenimport aus der gewählten STU-Variante ergänzt:

| Rolle | Hülle | Schilde | EPS | Reaktor | Lager | Sensoren | Torpedolager | Dockplätze | Bauzeit | Workbees |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Versorgungsdepot | 1.000 | 2.000 | 100 | 25 | 50.000 | 1 | 0 | 15 | 30 | 15 |
| Logistikzentrum | 6.000 | 10.000 | 400 | 100 | 200.000 | 2 | 25 | 20 | 50 | 20 |
| Raumwerft | 10.000 | 750 | 300 | 75 | 250 | 0 | 0 | 2 | 15 | 10 |
| Sensorphalanx | 500–5.000 | 500 | 150–300 | 50 | 350–550 | 13–15 | 0 | 2 | 5 | 5 |
| Außenposten | 21.000 | 35.000 | 500 | 175 | 10.000 | 4 | 500 | 30 | 40 | 30 |
| Raumstation | 50.000 | 60.000 | 1.000 | 350 | 20.000 | 6 | 1.500 | 40 | 75 | 40 |

Das Konstrukt selbst beginnt mit 500 Hülle, 100 Lager und 50 Dockplätzen. Die spätere Datenänderung muss für beide SWU-Fraktionen alle sechs fertigen Rollen plus Konstrukt bereitstellen und die genaue STU-Quellrumpf-ID je Klasse festhalten.

## Andocken und Zugangsregeln

Ein Schiff kann nur andocken, wenn ein freier Dockplatz vorhanden ist und eine Zugangsregel es zulässt. Regeln können auf einen Spieler, eine **Allianz**, eine **Fraktion** oder ein einzelnes Schiff zielen und sind entweder Erlaubnis oder Verbot. Alle passenden Regeln werden gemeinsam ausgewertet:

1. Ein passendes Verbot gewinnt immer gegen jede Erlaubnis.
2. Ohne Verbot genügt mindestens eine passende Erlaubnis.
3. Ohne passende Erlaubnis ist das Andocken verboten.

Allianzregeln werden bei jeder Prüfung aus der aktuellen Mitgliedschaft abgeleitet; **Haltung** allein gewährt keinen Zugang. Regeln auf eine aufgelöste Allianz werden in derselben Transaktion entfernt. Das gemeinsame Privilegienmodell wird vom ersten Zugangssystem gebaut und später auch für Wurmloch- und Handelspostenzugänge verwendet.

Ein **Allianzdepot** bleibt eine organisatorische Zuordnung einer geeigneten Depotstation durch deren Eigentümer. Sie überträgt weder Eigentum noch Entnahme-, Lade- oder Steuerungsrechte. Austritt, Rauswurf, Abwracken und Allianzauflösung lösen die Zuordnung über `AllianceContextCleanup` in derselben Transaktion; die Station und ihr Eigentum bleiben bestehen. Präsident und Vize dürfen Besitzer, Standort und Bestand zugeordneter Depots sehen.

## Erwogene Alternativen

- **Eigene Station-Entity als zweite Laufzeitwurzel:** verworfen. Sie würde Lager, Systeme, NBS, Kampf und Zustandsverwaltung duplizieren und Übergänge zwischen Konstrukt und fertiger Station erschweren.
- **Alle Stationsfelder direkt auf `Spacecraft`:** verworfen. Docking, Reparaturen und Zugangsregeln haben eigene Lebenszyklen und gehören in gebundene Entities beziehungsweise Dienste.
- **Zugang allein aus Haltung oder Allianzmitgliedschaft ableiten:** verworfen. Das widerspricht den bestehenden Allianz-Integrationsverträgen und erlaubt keine ausdrücklichen Ausnahmen.

## Konsequenzen

- Eine Migration ergänzt den Spacecraft-Diskriminator; bestehende Datensätze werden als `SHIP` übernommen.
- Services prüfen den Typ vor Navigation, Flottenaktionen und anderen schiffsspezifischen Fähigkeiten.
- Allgemeine Runtime-, Fracht-, Sensor- und Kampfpfade arbeiten weiterhin gegen `Spacecraft` und gelten damit auch für Stationen.
- Stationsspezifische Daten bleiben über die gemeinsame Spacecraft-ID angebunden.
- Die Begriffe und Rollen dieses ADR sind für alle Folgeissues `sc-WP-STAT-*` verbindlich.
