# Persönliche Systementdeckung und dynamisches Scanwissen

Die Systemdatenbank folgt dem STU-Navigationspfad: **Astrometrie** eines eigenen, einsatzbereiten Schiffs erzeugt nach ihrem Tickabschluss eine persönliche **Systementdeckung**. Nur diese Entdeckung berechtigt zum **Systemeintrag**. Das bloße Betreten eines Systems, die Mitgliedschaft in einer **Allianz** und andere Freigaben erzeugen oder übertragen keine Systementdeckung.

Eine Systementdeckung bleibt dauerhaft beim Spieler und wird nicht innerhalb einer **Allianz** geteilt. Ein Systemeintrag ist deshalb eine geschützte, nicht-taktische Wissensansicht: Er zeigt aktuelle Systemdaten, ermöglicht aber keine Fernaktionen.

Ein **Kolonie-Scan** gehört dagegen dem Scanner. Aktuelle Mitglieder derselben **Allianz** dürfen gespeicherte Scans dynamisch lesen, erhalten dadurch aber weder Eigentum noch Löschrecht. Endet die gemeinsame Allianzmitgliedschaft durch Austritt oder Ausschluss, verschwindet der Zugriff auf fremde Scans sofort; eigene Scans bleiben les- und löschbar. Diplomatie, Freundschaft und andere Freigaben ersetzen diese aktuelle Allianzmitgliedschaft nicht.

Systemeinträge und Fremdprofile zeigen pro Kolonie nur den neuesten zugänglichen Scan. Sie verbinden aktuelle Systemdaten mit dem historischen **Scan-Snapshot** und kennzeichnen daher erkennbare Abweichungen zwischen heutigem Besitzer oder Koloniestatus und den beim Scan gespeicherten Daten. Das globale Scanarchiv bleibt erhalten, zeigt jedoch bewusst die vollständige Historie je Kolonie als SWU-Komfortfunktion und nicht als primären STU-Navigationspfad.

## Considered Options

- **Systementdeckungen innerhalb der Allianz teilen**: verworfen. Kartographie soll persönliches, durch Astrometrie erworbenes Wissen bleiben.
- **Scans beim Teilen kopieren oder nach einem Allianzwechsel dauerhaft behalten**: verworfen. Die Freigabe soll den aktuellen Zusammenschluss abbilden und keine unabhängigen Kopien fremden Wissens schaffen.
- **Das globale Scanarchiv als alleinige STU-Ansicht verwenden**: verworfen. Seine Historie ist eine nützliche SWU-Erweiterung, während der Systemeintrag und das Fremdprofil den kompakten STU-Kontext liefern.

## Consequences

- Astrometrie und die Datenbankautorisierung müssen serverseitig erzwingen, dass nur persönlich entdeckte Systeme geöffnet werden können.
- Die Scanabfrage muss eigene Scans und Scans aktueller Allianzmitglieder dynamisch bestimmen sowie je Kontext den neuesten zugänglichen Scan je Kolonie auswählen.
- Aktuelle Systemdaten und historische Snapshotdaten bleiben im Datenmodell und in der Oberfläche getrennt erkennbar.
- Diese Entscheidung steht nicht im Widerspruch zu ADR-0001: **Allianz** bezeichnet weiterhin ausschließlich den Spielerzusammenschluss; die **Rebellenallianz** bleibt eine **Fraktion**.
