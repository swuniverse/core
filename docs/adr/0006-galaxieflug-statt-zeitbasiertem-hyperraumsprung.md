# Galaxieflug statt zeitbasiertem Hyperraumsprung

## Kontext und Entscheidung

Reisen zwischen Sternensystemen erfolgen in SWU feldweise über die Galaxiekarte. Ein Schiff verlässt ein System, fliegt mit `flyGalaxy` über konkrete Galaxiefelder und tritt am Ziel wieder in ein System ein. Jedes durchflogene Feld bleibt damit ein beobachtbarer Spielschritt, an dem Energiekosten, Feldfolgen, Flugsignaturen, Aufklärung und Reaktionen anknüpfen können.

Der bisherige zeitbasierte Sprung zwischen Systemen über `warp`, `IN_FLIGHT`, `arrivalAt`, `warpCooldown` und den minütlichen `checkWarpArrivals`-Cron ist keine bewusste SWU-Abweichung und wird zurückgebaut. Im normalen Flug wechseln Schiffe ihren Ort durch Feldbewegung und den Systemein- beziehungsweise -austritt, ohne zeitgesteuerte Ankunft. Die gesonderte Langstreckensprung-Fähigkeit wird unten beschrieben.

## Hyperraumrouten und Langstreckensprung

**Hyperraumrouten** bleiben sichtbare Kartographieelemente. Sie verkürzen die Reisezeit nicht und lösen keinen zeitbasierten Flug aus. Ein späterer Langstreckensprung darf sie als Voraussetzung oder Zielnetz verwenden, wenn das dafür zuständige Issue dies festlegt.

Ein **Langstreckensprung** ist eine eigene Fähigkeit und wird ausschließlich durch das Star-Wars-Pendant zur STU-Transwarpspule aus `sc-WP-NAV-5b` eingeführt. Er ist kein Ersatz-Endpunkt für den bisherigen `warp`-Ablauf. Die Fähigkeit ist als **Navicomputer-Sprung** mit dem Modul **Hyperraum-Spule** umgesetzt: Ein eigener Endpunkt springt unmittelbar auf eine existierende passierbare Galaxiekoordinate einer persönlich bekannten, nicht verborgenen Ebene. Hyperraumrouten und Distanz spielen dabei keine Rolle. Ein Flottenführer springt die gesamte nicht fixierte, kopräsente Flotte nach vollständiger atomarer Vorvalidierung; jedes Schiff benötigt eine intakte Spule, einen aktiven funktionsfähigen Hyperantrieb, Besatzung, 55 EPS und freie Sprungsysteme ohne Cooldown oder Traktorbindung. Der Sprung kostet je Schiff genau 55 EPS und keine Hyperantriebspunkte; die Spule erhält einen 300-Sekunden-Cooldown. Signaturen am Ausgang und Ziel haben keine kardinale Richtung. Der feste Sprungpreis ersetzt die feldweise Deflektorgebühr; Zielschäden und weitere Feldeffekte gelten weiterhin (Ressourcenlecks sind Feldeffekte, keine Sprungkosten).

## Erwogene Alternativen

- **Zeitbasierten Hyperraumsprung beibehalten:** verworfen. Er umgeht die feldbezogenen Flugregeln und teilt die Navigation in zwei konkurrierende Modelle.
- **Hyperraumrouten als automatische Schnellreise verwenden:** verworfen. Die Routen sind zunächst Kartendarstellung; eine spielmechanische Nutzung gehört zum gesonderten Langstreckensprung.
- **Den bisherigen `warp`-Endpunkt zum Langstreckensprung umdeuten:** verworfen. Das würde alte Zustände und Abklingzeiten mit einer noch nicht spezifizierten Fähigkeit vermischen.

## Konsequenzen

- `warp`, `IN_FLIGHT`, `arrivalAt`, `warpCooldown`, `processMovement`, `checkWarpArrivals` und die zugehörige Oberfläche werden in einem Folgeissue entfernt.
- Das Folgeissue muss Schiffe behandeln, die sich zum Migrationszeitpunkt in `IN_FLIGHT` befinden, ohne sie zu verlieren oder an einen ungültigen Ort zu setzen.
- Hyperraumrouten und ihre Darstellung bleiben bestehen, erhalten durch diese Entscheidung aber keine Reisezeitwirkung.
- Feldkosten und Feldfolgen werden weiterhin im Galaxieflug umgesetzt; Details gehören zu den dafür vorgesehenen Navigationsissues.
- System- und Galaxieflug liefern über den gemeinsamen `FieldTransitionExecutor` einen `MovementResult` (Teilfortschritt, Stopgrund, bewegte und zerstörte Schiffe, optionaler Kampfbericht). Reaktionen auf ein erreichtes Feld wie der Alarmkampf hängen sich über den neutralen Port `MOVEMENT_REACTIONS` ein und können die restliche Route stoppen, ohne dass der Spacecraft-Kern Combat-Typen importiert (sc-WP-COMBAT-1a).
