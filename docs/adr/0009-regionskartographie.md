# Regionskartographie

## Kontext und Entscheidung

STU kartographiert mit demselben `AstronomicalEntry` entweder ein Sternensystem (`systems_id`) oder eine Kartenregion (`region_id`). SWU übernimmt dieses gemeinsame Modell. Ein **Kartographieplan** hat einen Zieltyp `SYSTEM` oder `REGION` und genau eine passende Zielreferenz (`starSystemId` beziehungsweise `mapRegionId`). Ein Check-Constraint erzwingt genau ein Ziel; partielle Unique-Indizes erlauben einen Plan je Spieler und typisiertem Ziel. Bestandspläne sind unverändert `SYSTEM`-Pläne. Service, API und Frontend verwenden denselben typisierten Zielvertrag. Es gibt keinen zweiten, parallelen Kartographieablauf.

Im Sternensystem ist das Ziel das System. Auf einem Galaxiefeld mit Kartenregion ist es die Region (STU `PlanAstroMapping`). Außerhalb beider steht keine Kartographie zur Verfügung.

## Ablauf

Planung, Messpunktphase, Finalisierung und Abbruch folgen ADR-0003 mit denselben Schiffs-, Labor-, Sensor-, Crew-, EPS- und Zeitregeln:

- **Messpunkte:** Wie STU (`MapRepository::getRandomMapIdsForAstroMeasurement`, `REGION_MAP_PERCENTAGE = 25`) wählt die Planung zufällig 25 % (aufgerundet) der passierbaren Felder der Region ohne `NO_MEASUREPOINT`, ohne das aktuelle Feld. Felder mit Sternensystem schließt STU nicht aus. Die ursprünglich geplante Obergrenze von fünf Punkten wurde auf Maintainer-Entscheidung zugunsten der STU-Regel verworfen.
- **Messpunktphase:** Der Galaxieflug arbeitet einen verbleibenden Regionsmesspunkt beim tatsächlichen Anflug des qualifizierten Leaders genau einmal ab: 1 Prestige, Crew-Erfahrung, Mitteilung. Nach dem letzten Punkt ist der Plan `MEASURED`.
- **Finalisierung:** Sie kostet 15 EPS und dauert drei Hauptticks. Galaxieflug, Systemeintritt und das Verlassen der Planregion brechen sie ab; die Messpunkte bleiben erhalten.

## Entdeckung, Idempotenz und Prestige

Einzige Quelle einer **Regionsentdeckung** (`region_discoveries`, eindeutig je Spieler × Region, Herkunft `CARTOGRAPHY`) ist der erfolgreiche Abschluss einer Regionskartographie. Betreten, Sensoren und Kartenansichten erzeugen keine. Der dritte Finalisierungstick legt die Entdeckung, `CARTOGRAPHY_REGION` (5 Prestige) mit Prestigelog und die Abschlussmitteilung in einer Transaktion an; Benachrichtigungen folgen dem Commit. Ein Fehler rollt alles zurück. Parallele oder wiederholte Ticks erzeugen höchstens eine Entdeckung und eine Belohnung. Wurde die Region zwischenzeitlich anders entdeckt, endet der Plan ohne Belohnung (`INVALIDATED`).

## Verhältnis zu ADR-0002 und ADR-0003

ADR-0003 bleibt für die Systemkartographie unverändert gültig, einschließlich ihrer Messpunktauswahl und der 10 Prestige. Diese ADR verallgemeinert nur das Ziel des Kartographieplans. Eine Regionsentdeckung ist keine **Systementdeckung** im Sinne von ADR-0002 und gewährt keinen geschützten **Systemeintrag**. Sie schaltet ausschließlich den Regionseintrag der Datenbankkategorie „Regionen“ frei.

## Konsequenzen

- Die Schiffsoberfläche zeigt auf geeigneten Galaxiefeldern „Region kartographieren“ und sonst den serverseitigen Ablehnungsgrund. Regeln werden nicht im Client dupliziert.
- Galaxiekarte und Feldkontext markieren verbleibende Regionsmesspunkte und aktualisieren den Status nach jedem Feldwechsel.
- Ein späterer Datenbank-Award für Regionen kann auf `region_discoveries` aufsetzen.
