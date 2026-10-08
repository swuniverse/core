# Paritätsziel, Quellen und Etappenschnitt

Type: grilling
Status: resolved
Blocked by: —

## Question

Welcher Paritätsbegriff, welche Rangfolge widersprüchlicher Quellen und welcher Etappenschnitt führen von Etappe 1 zu einer vollständig spezifizierten Allianzfunktionalität?

## Answer

Ziel ist funktionale, spielerwirksame STU-Parität statt Quellcodeparität. Maßgeblich sind in dieser Reihenfolge bestehende SWU-ADRs und Domänenregeln, die bereits umgesetzte Etappe 1, die dokumentierte STU-Funktion und schließlich sichere, SWU-typische Ausgestaltung. Tote Pfade, Implementierungszufälle sowie bekannte Bugs und Sicherheitslücken sind kein Paritätsziel.

Das Ergebnis sind sechs koordinierte Etappen-Spezifikationen:

1. Diplomatie-Kern
2. Beziehungswirkungen
3. Allianz-Infrastruktur
4. Interne Zusammenarbeit
5. Lebenszyklus und Restparität
6. Siedler-Abkommen

Die Etappen dürfen unabhängig hinter ausdrücklichen Fähigkeiten ausgeliefert werden. Datenbankänderungen werden vor Aktivierung rückwärtskompatibel ausgerollt. Freigaben werden nicht angeboten, bevor ihre serverseitige Wirkung existiert; Freund-, Karten- und Zugangsverhalten gilt erst als lieferbar, wenn alle relevanten Serverpfade die zentrale Auflösung verwenden.

Neu entdeckte spielerwirksame Allianzfunktionalität gehört in die passende Etappe, wenn sie innerhalb dieses Produktbereichs liegt. Erfordert sie ein eigenständiges, in SWU fehlendes Spielsystem, wird nur ein konkreter künftiger Integrationspunkt spezifiziert.
