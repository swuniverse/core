# STU-Parität für Ereignisse und Nachrichtenordner

Status: ready-for-agent

## Problem Statement

Spielende sehen globale Spielereignisse derzeit nur als eingeschränkte Maindesk-Box ohne vollständige Historie, Suche, Typfilter, Ergebnislimit, Leerzustand, vollständige Zeitangabe oder nutzbare Ortsnavigation. Die Darstellung weicht damit deutlich von der STU-History ab.

Gleichzeitig werden persönliche Kolonieereignisse in einem separaten Koloniepanel geführt. Das entspricht nicht der STU-Informationsarchitektur, in der Nachrichten in fachliche Ordner einsortiert sind. Der heutige Nachrichtenbereich bietet nur Posteingang, Postausgang und eine clientseitig gefilterte Systemansicht; ein Ordner „Kolonien“, ordnerbezogene Zähler und eine STU-artige Header-Leiste fehlen.

Dadurch sind globale Ereignishistorie und persönliche operative Meldungen nicht klar getrennt, nicht konsistent auffindbar und nicht auf die spätere Erweiterung um Schiffs-, Handels- und Stationsmeldungen vorbereitet.

## Solution

SWU erhält zwei klar abgegrenzte Informationsbereiche:

1. Eine globale Ereignishistorie unter `/events`, die dieselbe globale `GameEvent`-Quelle wie die Maindesk-Vorschau verwendet und sich am STU-History-Verhalten orientiert.
2. Ein ordnerbasiertes Nachrichtensystem mit den dauerhaft sichtbaren Ordnern Persönlich, Schiffe, Kolonien, Handel, Systemmeldungen, Postausgang und Stationen.

Der Maindesk zeigt zehn aktuelle globale Ereignisse als konsistente Vorschau der `/events`-History. Ereignisse zeigen Datum und Uhrzeit, einen Orts-/Layerhinweis und führen bei vorhandenem Ortsbezug zur passenden Karten- oder Systemansicht. Die History-Seite bietet Typfilter mit Zählern, Textsuche und ein frei wählbares Ergebnislimit.

Bestehende und zukünftige Kolonieereignisse werden als Nachrichten im Ordner „Kolonien“ geführt. Eine Datenmigration bewahrt ihre Zeitstempel, ihren Gelesen-Status und ihre fachlichen Metadaten. Das alte Kolonie-Ereignis-Panel sowie seine fachlich ersetzten APIs und Projektionen entfallen.

Der Header wird um eine kompakte, STU-inspirierte Icon-Leiste ergänzt, die alle Nachrichtenordner und deren ungelesene Zähler anzeigt und direkt in den jeweiligen Ordner navigiert.

## User Stories

1. Als spielende Person möchte ich auf dem Maindesk die zehn neuesten globalen Spielereignisse sehen, damit ich die aktuelle Lage schnell erfassen kann.
2. Als spielende Person möchte ich zu jedem Maindesk-Ereignis ein vollständiges Datum und eine vollständige Uhrzeit sehen, damit ich den zeitlichen Kontext nachvollziehen kann.
3. Als spielende Person möchte ich bei einem Ereignis ohne vorhandene Einträge einen klaren Leerzustand sehen, damit ich nicht eine unvollständige Oberfläche vermute.
4. Als spielende Person möchte ich vom Maindesk zu allen Ereignissen navigieren können, damit ich die vollständige Historie untersuchen kann.
5. Als spielende Person möchte ich globale Ereignisse auf einer eigenen Ereignisse-Seite sehen, damit die Maindesk-Vorschau nicht meine einzige Recherchequelle ist.
6. Als spielende Person möchte ich globale Ereignisse nach ihrem Typ filtern können, damit ich beispielsweise nur Schiffszerstörungen oder nur Systemeintritte untersuchen kann.
7. Als spielende Person möchte ich für jeden Ereignistyp die Anzahl der passenden Treffer sehen, damit ich die Verteilung der Ereignisse vor dem Filtern verstehe.
8. Als spielende Person möchte ich globale Ereignisse per Textsuche durchsuchen können, damit ich ein bestimmtes Schiff oder eine bestimmte Formulierung wiederfinde.
9. Als spielende Person möchte ich das Ergebnislimit der Ereignishistorie wählen können, damit ich je nach Recherchebedarf eine kurze oder umfangreiche Liste sehe.
10. Als spielende Person möchte ich Ereignisse absteigend nach ihrem Erstellungszeitpunkt sehen, damit das neueste Geschehen zuerst erscheint.
11. Als spielende Person möchte ich bei einem globalen Ereignis dessen räumlichen Bereich erkennen, damit ich den Ort des Geschehens einordnen kann.
12. Als spielende Person möchte ich ein Ereignis mit Galaxie-Ort anklicken und zur passenden Kartenansicht gelangen, damit ich das Geschehen räumlich weiter untersuchen kann.
13. Als spielende Person möchte ich ein Ereignis mit System-Ort anklicken und zur passenden Systemansicht gelangen, damit ich dessen lokalen Kontext prüfen kann.
14. Als spielende Person möchte ich nur Orte sehen oder ansteuern können, die mir im Spiel zugänglich dargestellt werden dürfen, damit die Ereignishistorie keine ungewollte Kartenerkundung ermöglicht.
15. Als spielende Person möchte ich zunächst alle globalen Ereignisse sehen, damit globale History nicht durch nicht nachvollziehbare NPC-/Piratenfilter lückenhaft wirkt.
16. Als spielende Person möchte ich sehen, dass die erste globale History die derzeit erzeugten Ereignistypen Schiffszerstörung, Hyperraum-Abfang und Systemeintritt umfasst, damit ihr Umfang eindeutig ist.
17. Als spielende Person möchte ich meine Nachrichten in fachlichen Ordnern statt nur in technischen Tabs sehen, damit ich persönliche und operative Informationen gezielt finde.
18. Als spielende Person möchte ich die Ordner Persönlich, Schiffe, Kolonien, Handel, Systemmeldungen, Postausgang und Stationen immer sehen, damit die Informationsarchitektur stabil und vorhersehbar ist.
19. Als spielende Person möchte ich bei jedem Nachrichtenordner ungelesene und gesamte Nachrichtenzahl sehen, damit ich seine Dringlichkeit und seinen Umfang einschätzen kann.
20. Als spielende Person möchte ich auch für heute leere Ordner `0/0` sehen, damit künftige Nachrichtendomänen klar auffindbar bleiben.
21. Als spielende Person möchte ich im Header kompakte Icons für alle Nachrichtenordner und deren ungelesene Zähler sehen, damit ich sofort erkenne, wo Handlungsbedarf besteht.
22. Als spielende Person möchte ich über ein Header-Icon direkt den zugehörigen Nachrichtenordner öffnen, damit ich ohne Zwischenschritte auf neue Meldungen reagieren kann.
23. Als spielende Person möchte ich Spieler-zu-Spieler-Nachrichten im Ordner Persönlich sehen, damit diese von automatisierten Mitteilungen getrennt bleiben.
24. Als spielende Person möchte ich dauerhafte schiffsbezogene Meldungen im Ordner Schiffe sehen, damit ich sie nach temporären Echtzeit-Hinweisen wiederfinden kann.
25. Als spielende Person möchte ich Kolonieereignisse im Ordner Kolonien sehen, damit Bau-, Tick- und Kolonieaktionen zentral als Nachrichten auffindbar sind.
26. Als spielende Person möchte ich künftige Handelsmeldungen im Ordner Handel finden, damit die Oberfläche dafür ohne erneuten Strukturwechsel bereitsteht.
27. Als spielende Person möchte ich administrative und spielweite Mitteilungen im Ordner Systemmeldungen sehen, damit diese von Kolonie- und Spielermitteilungen getrennt bleiben.
28. Als spielende Person möchte ich gesendete persönliche Nachrichten im Postausgang sehen, damit ich meine Kommunikation nachvollziehen kann.
29. Als spielende Person möchte ich künftige stationsbezogene Meldungen im Ordner Stationen finden, damit diese fachlich getrennt bleiben.
30. Als spielende Person möchte ich beim Öffnen einer empfangenen Nachricht ihren Gelesen-Status aktualisieren, damit Ordner- und Headerzähler korrekt bleiben.
31. Als spielende Person möchte ich vorhandene Kolonieereignisse nach der Umstellung im Ordner Kolonien wiederfinden, damit keine historische Information verloren geht.
32. Als spielende Person möchte ich bei migrierten Kolonieereignissen den ursprünglichen Zeitpunkt und Gelesen-Status erhalten, damit meine Nachrichtenhistorie verlässlich bleibt.
33. Als spielende Person möchte ich aus einer migrierten Koloniemeldung künftig zur zugehörigen Kolonie gelangen können, damit die Meldung handlungsfähig bleibt.
34. Als spielende Person möchte ich bei einer Koloniemeldung ihre Dringlichkeit erkennen können, damit Warnungen und kritische Ereignisse angemessen auffallen.
35. Als Spielsystem möchte ich eine Koloniemeldung nur einmal zustellen, damit Migrationen, Wiederholungen und Tick-Verarbeitung keine Dubletten erzeugen.
36. Als spielende Person möchte ich weiterhin kurzfristige Echtzeit-Hinweise für Schiffsereignisse erhalten, damit akutes Geschehen sichtbar bleibt, auch wenn dauerhafte Schiffsmitteilungen später im Ordner Schiffe liegen.
37. Als spielende Person möchte ich aus einem dauerhaften schiffsbezogenen Kontext in den Ordner Schiffe gelangen, damit temporäre Hinweise und persistierte Historie zusammenfinden.
38. Als berechtigte spielende Person möchte ich globale Ereignis- und Nachrichtenendpunkte nur während eines erlaubten Spielzugangs verwenden können, damit der neue Umfang keine bestehende Zugriffsgrenze umgeht.
39. Als spielende Person möchte ich nur eigene persönliche Nachrichten und eigene Ordnerzähler sehen, damit private Kommunikation und Kolonieinformationen geschützt bleiben.
40. Als Entwicklerteam möchte ich globale Ereignishistorie und persönliche Nachrichten als getrennte Domänen erhalten, damit neue globale Ereigniserzeuger und neue Nachrichtenordner unabhängig erweitert werden können.

## Implementation Decisions

- Globale Spielereignisse und persönliche Nachrichten bleiben getrennte Domänen. Ein `GameEvent` ist eine globale, nicht als gelesen markierbare History; eine Nachricht ist an einen Empfänger adressiert und kann einen Gelesen-Status haben.
- Die globale Ereignishistorie verwendet ausschließlich die bestehende globale Ereignisquelle. Im ersten Release umfasst sie Schiffszerstörung, Hyperraum-Abfang und Systemeintritt. NPC-/Piraten-spezifische Sichtbarkeitsfilter und eine Beteiligtenmodellierung sind nicht Teil dieses Releases.
- Der globale Ereignisdienst erhält eine paginier-/limitierbare Suchabfrage mit optionalem Ereignistyp und optionalem Textsuchbegriff sowie eine aggregierte Typzählung für die aktuelle History. Die Ergebnisse sind absteigend nach Erstellungszeitpunkt sortiert und enthalten die für die Darstellung und Ortsnavigation nötigen, bereits vorhandenen Raumdaten.
- Die globale Ereignis-API wird mit Authentifizierung und Spielzugangsprüfung geschützt. Vor der Ortsnavigation wird geprüft, dass der Zielort für die anfragende Person sicher und spielregelkonform repräsentiert werden kann; der Link darf keine Kartenerkundung erzwingen oder versteckte Details offenlegen.
- `/events` wird als geschützte Anwendungsroute ergänzt und in die primäre Navigation aufgenommen. Ihre Filter, Suche und Ergebnislimit werden als URL-Zustand modelliert, damit Ergebnisse verlinkbar, aktualisierbar und beim Zurücknavigieren stabil sind.
- Der Maindesk lädt zehn neueste globale Ereignisse aus derselben Abfragesemantik wie `/events`. Er zeigt vollständiges lokalisiertes Datum und Uhrzeit, Ereignistext, Orts-/Layerdarstellung, einen klaren Leerzustand sowie einen Link zur vollständigen History.
- Räumliche Ereignislinks leiten bei Galaxieorten zur Starmap und bei Systemorten zur passenden Systemdarstellung. Die Starmap muss dafür eine gezielte Auswahl über ihren Routen-/URL-Zustand unterstützen, statt den Zielort nur implizit im lokalen Komponentenstatus zu kennen.
- Das bestehende Nachrichtendatenmodell erhält einen expliziten Nachrichtenordner als dauerhafte Klassifikation. Die Ordner sind: Persönlich, Schiffe, Kolonien, Handel, Systemmeldungen, Postausgang und Stationen. Die Ordner sind eine geschlossene, zentral definierte Menge und stets darstellbar.
- Der Postausgang wird aus Sicht des Senders berechnet und nicht als Empfängerordner persistiert. Alle anderen Ordner klassifizieren empfangene Nachrichten. Spieler-zu-Spieler-Nachrichten werden als Persönlich klassifiziert; bestehende Systemnachrichten werden als Systemmeldungen klassifiziert.
- Nachrichtenzusammenfassungen liefern für jeden Ordner getrennte Werte für ungelesen und gesamt. Diese Zusammenfassung versorgt sowohl die Ordnerübersicht als auch den globalen Header-Status, damit keine voneinander abweichenden Zähler entstehen.
- Der Nachrichtenbereich wird zu einer Ordneransicht umgebaut. Eine Ordnerübersicht zeigt alle Ordner inklusive `0/0`; das Öffnen eines Ordners lädt nur dessen Nachrichten mit serverseitiger Filterung, Pagination und korrekter Gesamtzahl. Die bisherige clientseitige Filterung einer einzelnen Inbox-Antwort wird entfernt.
- Der Header zeigt für alle Ordner eine kompakte, STU-inspirierte Icon-Leiste mit Tooltip, direktem Link in den jeweiligen Ordner und ungelesenem Zähler. Auf kleinen Viewports bleibt die Leiste bedienbar und zugänglich; die vollständigen `ungelesen/gesamt`-Werte sind in der Ordneransicht verfügbar.
- Die semantische Zuordnung der Ordner ist festgelegt: Persönlich für Spielerpost, Schiffe für dauerhafte schiffsbezogene Meldungen, Kolonien für Kolonieereignisse, Handel für Handelsmeldungen, Systemmeldungen für administrative oder spielweite Mitteilungen, Postausgang für gesendete Nachrichten und Stationen für stationsbezogene Meldungen.
- Bestehende temporäre Schiffshinweise im Header bleiben als kurzlebige Echtzeit-Hinweise erhalten. Sie werden nicht als Ersatz für den Ordner Schiffe betrachtet und sollen bei persistierten Schiffsmitteilungen auf diesen Ordner verweisen können.
- Eine Datenmigration erweitert Nachrichten um den Ordner und die für migrierte Kolonieereignisse benötigten strukturierten Herkunftsdaten. Kolonie-Nachrichten tragen mindestens ihre Klassifikation `COLONY_EVENT`, den ursprünglichen Kolonieereignistyp, Schweregrad, Koloniebezug und die ursprüngliche Ereignis-ID.
- Die Migration kopiert jedes bestehende Kolonieereignis in eine Nachricht des Ordners Kolonien und erhält Empfänger, Betreff, Inhalt, ursprünglichen Erstellungszeitpunkt und Gelesen-Status. Ein eindeutiger Delivery-Key beziehungsweise Herkunftsschlüssel macht die Migration und jede spätere Zustellung idempotent.
- Künftige Tick- und Aktionsereignisse der Kolonie erzeugen direkt Kolonie-Nachrichten; sie schreiben nach der Umstellung nicht mehr in das alte Kolonieereignisprotokoll.
- Das Kolonie-Ereignis-Panel, die zugehörigen Endpunkte, Detailprojektionen und das alte Ereignismodell werden nach erfolgreicher Migration entfernt oder fachlich stillgelegt. Abhängige Oberflächen dürfen keine verwaisten Summary-Daten oder Aktionen behalten.
- Koloniemeldungen bewahren ihre Schweregradinformation und zeigen sie in einer für Nachrichten geeigneten Darstellung. Die strukturierte Kolonie-ID ermöglicht eine spätere oder direkte Navigation zur Kolonie.
- Alle Datenbank- und API-Änderungen werden rückwärtskompatibel innerhalb derselben Auslieferung eingeführt: Schemaerweiterung und Datenmigration gehen den Entfernungen alter Produzenten und Konsumenten voraus.

## Testing Decisions

- Gute Tests beobachten die sichtbaren oder öffentlich vertraglichen Folgen: API-Antworten, Berechtigungsgrenzen, persistierte Daten nach Migration, Navigation und gerenderte Nutzeroberflächen. Sie prüfen nicht interne Repository-Aufrufe, lokale React-Zustände oder konkrete Implementierungsdetails.
- Der höchste bevorzugte Testseam für neue Fachfunktionen sind die geschützten REST-Endpunkte: globale Ereignishistory, Ereignistypzählungen, Nachrichtenordner, Ordnerzähler und Lesen einer Nachricht. Diese Tests prüfen den Vertrag inklusive Authentifizierung, Spielzugang, Filterung, Suche, Limit, Sortierung und Eigentumsgrenzen.
- Ein migrationsnaher Datenbanktest legt repräsentative gelesene und ungelesene Kolonieereignisse mehrerer Nutzer an, führt die Migration aus und prüft, dass pro Ursprung genau eine Kolonie-Nachricht mit erhaltenen Zeitstempeln, Gelesen-Status, Ordner und strukturierten Metadaten entsteht. Ein Wiederholungslauf darf keine Duplikate erzeugen.
- Ereignishistory-Tests prüfen die drei erlaubten Typen, absteigende Sortierung, Typfilter, Trefferzähler, Textsuche, Ergebnislimit, leere Ergebnisse sowie vollständige Ortsdaten. Sie prüfen außerdem, dass nicht authentifizierte oder nicht spielberechtigte Anfragen keinen Zugang erhalten.
- Nachrichtenordner-Tests prüfen die feste Sichtbarkeit aller sieben Ordner und `0/0` für leere Ordner, die Zuordnung bestehender persönlicher und Systemnachrichten, den berechneten Postausgang, serverseitige Ordnerfilterung, Pagination, Gesamt-/Ungelesenzähler sowie Schutz gegen Zugriff auf Nachrichten anderer Nutzer.
- Kolonie-Nachrichten-Tests decken Tick- und Aktionsauslöser ab und prüfen, dass diese künftig genau eine Nachricht im Ordner Kolonien mit `COLONY_EVENT`-Metadaten erzeugen. Sie decken zudem die Darstellung von Informations-, Warn- und kritischen Meldungen ab.
- Frontend-Integrationstests bauen auf den bestehenden Header- und App-Routing-Tests auf. Sie prüfen die Icon-Leiste, Zähler, Links zu Nachrichtenordnern, die Ordnerübersicht, den leeren Ordnerzustand, das Öffnen und Lesen einer Nachricht sowie das Routing zu `/events`.
- Maindesk- und Ereignisse-Seiten-Tests prüfen die zehn Einträge, Leerzustand, vollständige Zeitdarstellung, History-Link, Filter-/Such-/Limitinteraktionen, Typzähler und sichere Ortslinks. Die Tests verwenden für Karte und System einen URL-basierten Navigationsvertrag anstelle von Assertions auf lokale Starmap-States.
- Bestehende Tests für Kolonieereignis-Service und Koloniepanel werden entweder auf die neue Kolonie-Nachrichten-Semantik umgestellt oder zusammen mit den stillgelegten Oberflächen entfernt. Bestehende Tests für Header, App-Routen, Messaging und Spielereignis-Erzeuger bleiben die bevorzugte Prior Art.

## Out of Scope

- Ein NPC-/Piraten-Filter für globale Ereignisse und die dafür notwendige Modellierung von Beteiligten.
- Neue globale Ereigniserzeuger über Schiffszerstörung, Hyperraum-Abfang und Systemeintritt hinaus.
- Eine vollständige STU-Kopie von Assets, Pixelmaßen oder visueller Gestaltung; die Header- und Ordneroberfläche ist STU-inspiriert und folgt den bestehenden SWU-Designsystemen, Responsive-Regeln und Accessibility-Anforderungen.
- Neue Geschäftslogik für Handel, Stationen oder dauerhafte Schiffsmitteilungen. Ihre Ordner und Zähler sind vorbereitet, können im ersten Release aber leer sein.
- Änderung der Gameplay-Regeln oder Sichtbarkeitsregeln globaler Ereignisse über die sichere Darstellung und Navigation hinaus.
- Eine neue allgemeine Benachrichtigungsplattform außerhalb der beschriebenen globalen Ereignishistory und Nachrichtenordner.

## Further Notes

- STU dient als funktionale Referenz: Maindesk-History, vollständige History-Seite und Nachrichtenordner. SWU übernimmt die Informationsarchitektur, nicht zwangsläufig identische visuelle Assets.
- Die Begriffe sind absichtlich getrennt: Ein globales Spielereignis ist Teil der öffentlichen History; eine Nachricht ist eine persönliche Zustellung; ein Kolonieereignis wird nach der Umstellung als Kolonie-Nachricht zugestellt.
- Die vorhandene globale Ereignisquelle enthält bereits Raum-/Ortsdaten, die bisher in der Oberfläche nicht ausgeschöpft werden.
- Die aktuelle globale Ereignisroute zeigt lokal keine expliziten Guards. Die Erweiterung muss das prüfen und eine konsistente Authentifizierungs- und Spielzugangsgrenze sicherstellen.
- Die alte Kolonieereignisstruktur enthält eine große Zahl von Produzenten. Die Umstellung muss alle Tick- und Aktionspfade erfassen, damit nicht einzelne Meldungsarten nach der Migration verloren gehen.
