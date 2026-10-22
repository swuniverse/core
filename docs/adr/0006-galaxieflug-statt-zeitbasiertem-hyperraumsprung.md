# Galaxieflug statt zeitbasiertem Hyperraumsprung

## Kontext und Entscheidung

Reisen zwischen Sternensystemen erfolgen in SWU feldweise über die Galaxiekarte. Ein Schiff verlässt ein System, fliegt mit `flyGalaxy` über konkrete Galaxiefelder und tritt am Ziel wieder in ein System ein. Jedes durchflogene Feld bleibt damit ein beobachtbarer Spielschritt, an dem Energiekosten, Feldfolgen, Flugsignaturen, Aufklärung und Reaktionen anknüpfen können.

Der bisherige zeitbasierte Sprung zwischen Systemen über `warp`, `IN_FLIGHT`, `arrivalAt`, `warpCooldown` und den minütlichen `checkWarpArrivals`-Cron ist keine bewusste SWU-Abweichung und wird zurückgebaut. Schiffe wechseln ihren Ort nicht mehr nach Ablauf einer Wartezeit, sondern ausschließlich durch die Feldbewegung und den Systemein- beziehungsweise -austritt.

## Hyperraumrouten und Langstreckensprung

**Hyperraumrouten** bleiben sichtbare Kartographieelemente. Sie verkürzen die Reisezeit nicht und lösen keinen zeitbasierten Flug aus. Ein späterer Langstreckensprung darf sie als Voraussetzung oder Zielnetz verwenden, wenn das dafür zuständige Issue dies festlegt.

Ein **Langstreckensprung** ist eine eigene Fähigkeit und wird ausschließlich durch das Star-Wars-Pendant zur STU-Transwarpspule aus `sc-WP-NAV-5b` eingeführt. Er ist kein Ersatz-Endpunkt für den bisherigen `warp`-Ablauf. Bis diese Fähigkeit umgesetzt ist, gibt es zwischen Systemen nur den feldweisen Galaxieflug.

## Erwogene Alternativen

- **Zeitbasierten Hyperraumsprung beibehalten:** verworfen. Er umgeht die feldbezogenen Flugregeln und teilt die Navigation in zwei konkurrierende Modelle.
- **Hyperraumrouten als automatische Schnellreise verwenden:** verworfen. Die Routen sind zunächst Kartendarstellung; eine spielmechanische Nutzung gehört zum gesonderten Langstreckensprung.
- **Den bisherigen `warp`-Endpunkt zum Langstreckensprung umdeuten:** verworfen. Das würde alte Zustände und Abklingzeiten mit einer noch nicht spezifizierten Fähigkeit vermischen.

## Konsequenzen

- `warp`, `IN_FLIGHT`, `arrivalAt`, `warpCooldown`, `processMovement`, `checkWarpArrivals` und die zugehörige Oberfläche werden in einem Folgeissue entfernt.
- Das Folgeissue muss Schiffe behandeln, die sich zum Migrationszeitpunkt in `IN_FLIGHT` befinden, ohne sie zu verlieren oder an einen ungültigen Ort zu setzen.
- Hyperraumrouten und ihre Darstellung bleiben bestehen, erhalten durch diese Entscheidung aber keine Reisezeitwirkung.
- Feldkosten und Feldfolgen werden weiterhin im Galaxieflug umgesetzt; Details gehören zu den dafür vorgesehenen Navigationsissues.
