# Freund-Feind-Auflösung und Spielwirkungen

Type: grilling
Status: resolved
Blocked by: 02, 04

## Question

Welche Quelle entscheidet zentral über Freund, Feind und Neutral, und welche vorhandenen Spielsysteme müssen diese Entscheidung wirksam anwenden?

## Answer

Eine zentrale Domänenschnittstelle, beispielsweise `relationshipBetween(actor, target)`, löst den Status auf; engere Fähigkeiten wie `mayShareLivePositions` bauen darauf auf. Verbraucher rekonstruieren Beziehungen nicht selbst.

Die Priorität lautet:

1. Andere Fraktion → **Feind**.
2. Gleiche Allianz → **Freund**.
3. Aktiver Allianzkrieg → **Feind**.
4. Aktive Beziehung mit Freigabe „Als Freund behandeln“ → **Freund**.
5. Persönlicher Kontaktstatus.
6. Sonst **Neutral**.

Persönliche Marker überstimmen weder die fraktionsbedingte Feindschaft noch einen Allianzkrieg. Die Auflösung wird serverseitig auf alle in SWU vorhandenen entsprechenden Pfade angewandt. Alarm Gelb reagiert auf Feinde, Alarm Rot auf alle Nicht-Freunde; Freunde lösen keine automatische Gegenreaktion aus. Bewusste direkte Angriffe bleiben den bestehenden Kampfregeln unterworfen. Sensible Transfers und die Versorgung geschützter fremder Schiffe sind in den vorhandenen entsprechenden Aktionen Freunden vorbehalten.

Wo STU eine Wirkung in einem in SWU nicht vorhandenen eigenständigen System besitzt, benennt die Etappen-Spezifikation den künftigen Verbraucher und seine erwartete Fähigkeit, baut das fremde System aber nicht.
