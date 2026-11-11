# Ebenenkenntnis und Kartenzyklus

## Kontext und Entscheidung

Die Kenntnis einer Galaxieebene und die persönliche Entdeckung eines Sternensystems sind getrennte Wissensbereiche. `KNOWN` bedeutet, dass der Spieler die Ebene kennt und ihre Kartenendpunkte nutzen darf. Es garantiert weder die Sichtbarkeit sämtlicher Galaxiefelder noch die Entdeckung der darin liegenden Sternensysteme: Solange die Ebene `KNOWN` ist, bestimmen die persönlichen Felderkundungsdaten die sichtbaren Felder und deren Detailgrad.

Der tägliche Kartenzyklus prüft bekannte Ebenen. Hat ein Spieler alle Galaxiefelder einer Ebene persönlich erkundet, wechselt der Status atomar von `KNOWN` zu `EXPLORED`; derselbe Vorgang löscht die persönlichen Felderkundungszeilen und speichert das Abschlussereignis. Bereits erkundete Ebenen durchlaufen den Übergang nicht erneut.

`EXPLORED` ist eine dauerhafte Eigenschaft der Ebenenkenntnis und zugleich die Darstellungsvorgabe für die Galaxiekarte: Alle Felder der Ebene werden fortan vollständig dargestellt, unabhängig davon, dass die zyklusspezifischen persönlichen Felderkundungszeilen nicht mehr existieren. Die Kartendarstellung rekonstruiert oder persistiert diese Zeilen nicht.

## Abgrenzung zur Systementdeckung und Kartographie

Die vollständige Ebenendarstellung entdeckt keine einzelnen Sternensysteme. Geschützte Systemdetails und -raster bleiben weiterhin von der persönlichen `SystemExploration` abhängig. Weder Ebenenzugriff noch `EXPLORED` ersetzen diese Berechtigung. Diese Abgrenzung bewahrt ADR-0002: Die persönliche Systementdeckung entsteht nur durch erfolgreich abgeschlossene Astrometrie und wird nicht aus Kartenwissen abgeleitet.

Ebenenkenntnis und Kartenzyklus ändern nicht die persönlichen, systemgebundenen Kartographiepläne aus ADR-0003. Planstatus, Messpunkte, Finalisierung, Abschluss und Belohnungen behalten ihre dort festgelegten Regeln; der Kartenzyklus erstellt oder verändert keine Pläne und verleiht keine Systementdeckung.

## Konsequenzen

- `KNOWN` autorisiert den Ebenenzugriff, während persönliche Felderkundungsdaten weiterhin die Kartensicht begrenzen.
- `EXPLORED` lässt sämtliche Felder und deren Kartenattribute vollständig sichtbar, auch nach Entfernung der persönlichen Felderkundungszeilen.
- Das Abschlussereignis dokumentiert den Zyklusübergang; es ist keine Systementdeckung und gewährt keinen Systemeintrag.
- Kartenabfragen dürfen vollständige Ebenendarstellung aus `EXPLORED` ableiten, aber geschützte Systemdetails müssen weiterhin die persönliche Systemkenntnis prüfen.
- Die Karten- und Ebenenregeln verändern nicht den Astrometrie- oder Kartographieplan-Lebenszyklus aus ADR-0002/0003.
