# Banner und Beschreibungsplatzhalter

Type: grilling
Status: resolved
Blocked by: 03

## Question

Welche Bannerfunktion und welche STU-Beschreibungsvarianten gehören zur Parität?

## Answer

Allianzbanner gehören zum Produktumfang. Zulässig ist ausschließlich ein tatsächlich validiertes PNG mit höchstens 200 KB und höchstens 600 × 150 Pixeln. Präsident und Vize dürfen das Banner hochladen, ersetzen und entfernen.

Die Speicherung liegt hinter einer austauschbaren Asset-Schnittstelle; für Entwicklung ist ein lokaler Dateisystemadapter zulässig. Auf der Allianzseite erscheint das Banner als fester Kopfbereich und über den sicher gerenderten Platzhalter `$ALLIANCE_BANNER`. Fehlt ein Banner, verschwinden sowohl Platzhalter als auch Kopfbereich vollständig.

Das Entfernen des Assets nach einer Allianzauflösung muss wiederholbar und zuverlässig nachgeholt werden können. Ein Fehler des externen Asset-Schritts darf eine bereits abgeschlossene relationale Auflösung nicht zurückrollen.

`[translate]`-Blöcke und BBCode in Allianznamen werden dauerhaft nicht übernommen. Bestehende sichere Beschreibung, Amts- und Diplomatieplatzhalter können in ihrer jeweiligen Etappe auf das SWU-Domänenmodell abgebildet werden; unbekannte Allianzplatzhalter erzeugen kein unsicheres HTML.
