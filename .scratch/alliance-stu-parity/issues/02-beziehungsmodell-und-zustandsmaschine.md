# Beziehungsmodell und Zustandsmaschine

Type: grilling
Status: resolved
Blocked by: 01

## Question

Welche Parteien, Beziehungstypen, Kardinalitäten und Übergänge bilden den Diplomatie-Kern ab?

## Answer

Das gemeinsame Beziehungsmodell kennt als Parteien Allianzen und allianzlose Spieler. Es unterstützt sechs Beziehungstypen: Krieg, Frieden, Freundschaft, Bündnis, Handelsabkommen und Vasallenschaft. Zwischen Allianzen verschiedener Fraktionen entstehen keine Beziehungsdatensätze, weil diese Parteien kraft ADR grundsätzlich Feinde sind.

Je ungeordnetem Parteienpaar bestehen höchstens eine aktive **Beziehung** und höchstens ein ausstehender **Beziehungsvorschlag**. Ein Änderungsvorschlag darf neben der aktiven Beziehung bestehen; bis zur Annahme bleibt die aktive Beziehung vollständig wirksam. Die Annahme ersetzt sie atomar. Ablehnung oder Rückzug entfernt nur den Vorschlag.

Krieg wird ohne Zustimmung sofort aktiv und entfernt in derselben Transaktion jede aktive Beziehung, jeden Beziehungsvorschlag und jede ausstehende Änderung von Beziehungsfreigaben dieses Paars. Krieg endet ausschließlich durch Annahme eines Friedensvorschlags. Frieden bleibt anschließend als sichtbare aktive Beziehung bestehen, verleiht aber selbst keine Freigaben.

Vasallenschaft ist fachlich gerichtet: Die vorschlagende Partei ist Lehnsherr, die empfangende Partei Vasall. Alle anderen Beziehungstypen sind fachlich gegenseitig, unabhängig von ihrer technischen Speicherung.
