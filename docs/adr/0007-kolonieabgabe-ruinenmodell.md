# Kolonieabgabe als wiederbesiedelbare Ruine

## Kontext und Entscheidung

STU setzt eine aufgegebene Kolonie vollständig zurück: Besitzer, Name, Oberfläche, Lager und laufende Vorgänge werden entfernt, Blockaden und Verteidigungen beendet und der letzte aufgegebene Planet setzt den Spieler auf `UNCOLONIZED`. Die Bestätigung erfolgt dort über einen aus dem Kolonienamen abgeleiteten Code.

SWU behält stattdessen sein **Ruinenmodell**. Eine freiwillig aufgegebene Kolonie wird besitzerlos und als aufgegeben markiert, bleibt aber mit ihren fertiggestellten Gebäuden und ihrem Lager als wiederbesiedelbare **Ruine** bestehen. Laufende Bau-, Fertigungs- und Ausbildungsaufträge, Baustellen, Terraforming, Bevölkerung und Crew werden bereinigt; Gebäude werden deaktiviert. Asteroiden behalten wegen ihrer accountgebundenen Erschöpfung kein Lager. Noch nicht konvertierte STU-Planeten und -Monde sind eine technische Importausnahme und werden beim Aufgeben bereinigt und auf SWU-Daten umgestellt.

Die Startkolonie darf freiwillig nicht aufgegeben werden. Für jede andere Kolonie muss der Spieler zur Bestätigung den vollständigen aktuellen Kolonienamen eingeben. Die Aufgabe setzt den Spielerstatus nicht auf `UNCOLONIZED`, auch wenn danach keine weitere Kolonie in seinem Besitz ist. Dieses Modell erhält erkundbare Spuren früherer Besiedlung, schafft wiederbesiedelbare Ziele und verhindert einen unbeabsichtigten Neustart des Onboardings.

Die Kontolöschung aus `sh-AP-05d` verwendet denselben Abgabepfad, um sämtliche Kolonien des Kontos in Ruinen umzuwandeln. Sie darf dabei die Startkolonien-Sperre umgehen, weil nach der Löschung kein Besitzer verbleibt; eine zweite Reset-Implementierung ist ausgeschlossen.

## Orbitzuweisungen

Beim Aufgeben werden sämtliche Orbitzuweisungen der Kolonie gelöscht. Damit enden sowohl Blockaden als auch Verteidigungen, und der gespeicherte Blockadezustand der Ruine wird zurückgesetzt. Schiffe und Flotten bleiben unverändert an ihrem Ort; lediglich ihre Zuordnung als Blockierer oder Verteidiger dieser Kolonie entfällt. Diese Bereinigung gilt auch für den von der Kontolöschung verwendeten Pfad.

## Erwogene Alternativen

- **STU-Reset auf einen Fallback-Nutzer:** verworfen. Er würde Gebäude und Lager als sichtbare Weltgeschichte löschen und das etablierte Wiederbesiedlungsmodell aufgeben.
- **Rücksprung auf `UNCOLONIZED`:** verworfen. Die Kolonieabgabe ist kein Neustart des Spieler-Onboardings.
- **Startkolonie freiwillig freigeben:** verworfen. Die Sperre verhindert, dass sich ein aktives Konto ohne seinen vorgesehenen Ausgangspunkt zurücklässt.
- **Orbitzuweisungen an der Ruine erhalten:** verworfen. Blockade und Verteidigung beziehen sich auf die Kolonie ihres bisherigen Besitzers und dürfen nicht auf einen besitzerlosen Zustand übergehen.

## Konsequenzen

- Kolonieansichten und Besiedlungspfade müssen aufgegebene Kolonien als besitzerlose, wiederbesiedelbare Ruinen behandeln.
- Fertiggestellte Gebäude und das Lager bleiben erhalten, werden aber nicht als aktive Produktion einer besitzerlosen Kolonie fortgeführt.
- Die freiwillige API erzwingt Startkolonien-Sperre und exakte Namensbestätigung serverseitig.
- Spielerstatus und Onboarding werden durch die Kolonieabgabe nicht zurückgesetzt.
- Kontolöschung und freiwillige Aufgabe teilen die fachliche Bereinigung; nur die vorgelagerten Berechtigungs- und Bestätigungsregeln unterscheiden sich.
