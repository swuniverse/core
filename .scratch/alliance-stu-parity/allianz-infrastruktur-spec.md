# Allianz – Etappe 3: Allianz-Infrastruktur

Status: ready-for-agent

Tracker: local Markdown issue tracker (`.scratch/alliance-stu-parity/allianz-infrastruktur-spec.md`)
Triage label: ready-for-agent

## Problem Statement

Nach dem Diplomatie-Kern und den Beziehungswirkungen leitet SWU die **Haltung** zentral ab, und die Beziehungsfreigabe „Live-Kartenpositionen teilen“ ist serverseitig wirksam. Auf der Sternenkarte sieht ein Spieler davon nichts. Die Sternenkarte zeigt keine Schiffe, weder eigene noch die der eigenen **Allianz**, noch die geteilten Live-Positionen eines Bündnispartners. Die vorhandene Serverroute für geteilte Live-Positionen wird von keinem Frontend genutzt. Die Diplomatieverwaltung muss deshalb darauf hinweisen, dass geteilte Positionen „erst mit der Allianz-Kartenansicht“ erscheinen.

Damit fehlt der wichtigste Nutzen einer Allianz für die gemeinsame Lageerkennung. Mitglieder können nicht sehen, wo ihre Allianzkollegen operieren. **Präsident** und **Vize** haben keinen Überblick über die Flotte ihrer Allianz. Ein vereinbartes Bündnis mit Positionsteilung zeigt keine sichtbare Wirkung.

STU ergänzt dies um **Allianzdepots**, allianzbezogene Dock-, Wurmloch- und Handelspostenrechte sowie die Territorialfarbe einer Allianz. Diese Funktionen hängen in SWU an Spielsystemen, die es noch nicht gibt: spielereigene Stationen, Docking, spielergesteuerte Wurmlochrechte, Handelsposten und spielereigener Einfluss. Ohne verbindliche Verträge würde jedes dieser Systeme später eigene, abweichende Allianzregeln erfinden.

## Solution

Die Sternenkarte erhält eine Schiffsebene. Sie zeigt für den angemeldeten Spieler:

- die eigenen Schiffe,
- alle Schiffe der aktuellen Mitglieder der eigenen Allianz,
- die Schiffe von Parteien, mit denen eine aktive Beziehung mit der Beziehungsfreigabe „Live-Kartenpositionen teilen“ besteht, auch außerhalb der eigenen Sensorreichweite.

Ein einziger serverseitiger Sichtbarkeitsdienst bestimmt für jeden Betrachter, welche fremden Schiffe er sehen darf, aus welchem Grund und mit welcher Detailstufe. Er erweitert die vorhandene Live-Positions-Sichtbarkeit und verwendet ausschließlich die zentrale Haltung. Jedes Mitglied erhält die Basisdaten für die gemeinsame Kartenwahrnehmung. Präsident und Vize erhalten für Schiffe der eigenen Allianz zusätzlich Verwaltungsdetails. Partnerschiffe aus geteilten Live-Positionen zeigen nie Verwaltungsdetails.

Jeder Schiffsmarker ist nach Herkunft (eigen, Allianz, geteilte Position) und Haltung (Freund, Neutral, Feind) unterscheidbar. Allianzschiffe tragen die Allianzfarbe, sofern eine gesetzt ist. Die Sichtbarkeit wird bei jeder Anfrage dynamisch abgeleitet. Austritt, Rauswurf, Auflösung, Krieg, Beziehungsende oder Entzug der Freigabe beenden sie mit der nächsten Anfrage, ohne Bereinigungsschritt.

Die Schiffsebene liegt hinter einer ausdrücklichen Fähigkeit. Erst wenn sie aktiv ist, zeigt die Sternenkarte Allianz- und Partnerschiffe. Erst dann ersetzt die Diplomatieverwaltung ihren Hinweis durch einen Verweis auf die Sternenkarte.

Allianzdepots, allianzbezogene Zugangsprivilegien und die Territorialfarbe werden in dieser Etappe nicht gebaut. Sie werden als verbindliche Integrationsverträge festgehalten, an die sich die künftigen Stations-, Dock-, Wurmloch-, Handelsposten- und Einflusssysteme halten müssen.

## User Stories

1. Als Spieler möchte ich meine eigenen Schiffe auf der Sternenkarte sehen, damit ich meine Flotte räumlich überblicke.
2. Als Allianzmitglied möchte ich alle Schiffe der aktuellen Mitglieder meiner Allianz auf der Sternenkarte sehen, damit wir gemeinsam die Lage erkennen.
3. Als Allianzmitglied möchte ich Allianzschiffe unabhängig von meiner eigenen Sensorreichweite sehen, damit die Allianz als gemeinsame Kartenwahrnehmung wirkt.
4. Als Allianzmitglied möchte ich für jedes Allianzschiff Name, Schiffsklasse, Besitzer und aktuelle Position sehen, damit ich weiß, wer wo operiert.
5. Als Allianzmitglied ohne Amt möchte ich keine Verwaltungsdetails fremder Mitgliedsschiffe sehen, damit interne Betriebsdaten den Verantwortlichen vorbehalten bleiben.
6. Als Diplomat möchte ich auf der Karte dieselben Basisdaten wie ein Mitglied ohne Amt sehen, damit Diplomatierechte keine Verwaltungseinsicht gewähren.
7. Als Präsident möchte ich für alle Schiffe meiner Allianz zusätzlich Status, Alarmstufe, Hülle und Crew sehen, damit ich die Einsatzbereitschaft der Allianz beurteilen kann.
8. Als Vize möchte ich dieselben Verwaltungsdetails wie der Präsident sehen, damit ich die Allianz mitverwalten kann.
9. Als Präsident oder Vize möchte ich keine Fracht, Module, Logbücher, Nachrichten oder persönlichen Notizen fremder Mitglieder sehen, damit die Allianzverwaltung keine privaten Daten offenlegt.
10. Als Allianzmitglied möchte ich, dass ein ausgetretenes oder rausgeworfenes Mitglied sofort nicht mehr auf meiner Karte erscheint, damit ehemalige Mitglieder keine Allianzsicht behalten oder liefern.
11. Als ausgetretener oder rausgeworfener Spieler möchte ich, dass ich die Schiffe meiner früheren Allianz sofort nicht mehr sehe, damit Allianzwissen an die Mitgliedschaft gebunden bleibt.
12. Als neues Mitglied möchte ich die Schiffe meiner Allianz sofort nach der Aufnahme sehen, damit ich ohne manuelle Freischaltung mitwirken kann.
13. Als Spieler einer aufgelösten Allianz möchte ich, dass keine Allianzsicht zurückbleibt, damit die Auflösung vollständig wirkt.
14. Als Präsident oder Vize möchte ich die Verwaltungsdetails sofort verlieren, wenn ich mein Amt verliere, damit Amtswechsel unmittelbar wirken.
15. Als Mitglied eines Bündnisses mit aktiver Freigabe „Live-Kartenpositionen teilen“ möchte ich die Schiffe der Partnerallianz auf der Sternenkarte sehen, damit die ausgehandelte Freigabe sichtbar wirkt.
16. Als Bündnispartner möchte ich geteilte Partnerschiffe auch außerhalb meiner Sensorreichweite sehen, damit die Freigabe einen echten Mehrwert hat.
17. Als Bündnispartner möchte ich für geteilte Partnerschiffe nur Basisdaten sehen, damit die Positionsteilung keine Verwaltungsdetails der anderen Allianz offenlegt.
18. Als Spieler möchte ich, dass ausstehende Beziehungsvorschläge und ausstehende Freigabeänderungen keine Positionen sichtbar machen, damit erst die Annahme wirkt.
19. Als Spieler möchte ich, dass Krieg, Beziehungsende oder ein angenommener Entzug der Freigabe die Positionsteilung sofort beendet, damit Zugriff nicht über den Vertrag hinaus besteht.
20. Als Spieler möchte ich, dass die Freigabe „Als Freund behandeln“ allein keine Live-Positionen teilt, damit beide Freigaben getrennt verhandelbar bleiben.
21. Als Spieler möchte ich, dass Spieler der anderen **Fraktion** nie über diese Ebene sichtbar werden, damit die Fraktionsgrenze erhalten bleibt.
22. Als Spieler möchte ich auf der Karte erkennen, ob ein Schiff mir, meiner Allianz oder einem Partner mit geteilter Position gehört, damit ich die Herkunft der Information verstehe.
23. Als Spieler möchte ich die Haltung jedes angezeigten fremden Schiffs als Freund, Neutral oder Feind erkennen, damit die Karte dieselbe Freund-Feind-Logik wie das restliche Spiel verwendet.
24. Als Allianzmitglied möchte ich Allianzschiffe in der Allianzfarbe sehen, damit meine Allianz auf der Karte sofort erkennbar ist.
25. Als Spieler möchte ich, dass Allianzschiffe ohne gesetzte Allianzfarbe eine einheitliche Standardfarbe erhalten, damit die Karte auch ohne Farbe lesbar bleibt.
26. Als Spieler möchte ich, dass Schiffe innerhalb eines Sternsystems am System auf der Galaxiekarte und an ihrer Systemposition im geöffneten Systemraster erscheinen, damit ich sie auf beiden Ebenen finde.
27. Als Spieler möchte ich nur Schiffe der gerade angezeigten Kartenebene sehen, damit die Karte nicht mit Schiffen anderer Ebenen überladen wird.
28. Als Spieler möchte ich mehrere Schiffe auf demselben Feld gebündelt mit Anzahl sehen, damit sich Marker nicht überdecken.
29. Als Spieler möchte ich einen Schiffsmarker auswählen und die zugehörigen sichtbaren Daten sehen, damit ich Details ohne Umweg nachschlagen kann.
30. Als Spieler möchte ich von einem eigenen Schiffsmarker zur Schiffsansicht springen, damit ich das Schiff direkt steuern kann.
31. Als Spieler möchte ich, dass fremde Schiffsmarker keine Steuerungs- oder Kampfaktionen anbieten, damit die Karte keine Aktionen außerhalb der vorhandenen Regeln eröffnet.
32. Als Spieler möchte ich die Schiffsebene sowie Allianz- und Partnerschiffe getrennt ein- und ausblenden, damit ich die Karte an meine Aufgabe anpasse.
33. Als Spieler möchte ich, dass die Schiffsebene beim Öffnen der Karte, beim Ebenenwechsel und regelmäßig während der geöffneten Karte aktualisiert wird, damit Positionen nicht dauerhaft veralten.
34. Als Spieler möchte ich, dass sich die Karte bei Bewegungen meiner eigenen Schiffe zeitnah aktualisiert, damit meine eigene Flotte aktuell ist.
35. Als Spieler möchte ich, dass zerstörte Schiffe nicht auf der Karte erscheinen, damit die Lage nicht verfälscht wird.
36. Als Spieler möchte ich, dass Schiffe ohne auflösbare Position nicht erscheinen, statt an einer falschen Stelle zu stehen.
37. Als Spieler möchte ich, dass ein Fehler der Haltungsauflösung keine fremden Schiffe sichtbar macht, damit Fehler sicher geschlossen ausfallen.
38. Als Spieler möchte ich, dass manipulierte Requests keine zusätzlichen Schiffe oder Details liefern, damit die Sichtbarkeit nur serverseitig entschieden wird.
39. Als allianzloser Spieler möchte ich auf der Karte meine eigenen Schiffe sehen, damit die Schiffsebene auch ohne Allianz nützlich ist.
40. Als Präsident oder Diplomat möchte ich, dass die Diplomatieverwaltung nach Aktivierung auf die Sternenkarte verweist statt auf eine künftige Kartenansicht, damit der Hinweis stimmt.
41. Als Betreiber möchte ich die Schiffsebene für Allianz- und Partnerschiffe über eine ausdrückliche Fähigkeit aktivieren, damit die Funktion erst nach vollständiger Auslieferung sichtbar wird.
42. Als Betreiber möchte ich, dass die bestehende Route für geteilte Live-Positionen rückwärtskompatibel bleibt, damit vorhandene Verbraucher nicht brechen.
43. Als Entwickler eines künftigen Stationssystems möchte ich einen verbindlichen Vertrag für Allianzdepots, damit Depots ohne Eigentumsübertragung und ohne neue Entnahmerechte gebaut werden.
44. Als Präsident oder Vize möchte ich künftig Standort und Bestand der Allianzdepots in der Verwaltung sehen, damit die Allianzlogistik überblickbar wird.
45. Als Eigentümer eines künftigen Depots möchte ich, dass Austritt, Rauswurf, Abwracken und Auflösung die Allianzzuordnung entfernen, mein Eigentum aber unverändert lassen, damit ich nichts verliere.
46. Als Entwickler eines künftigen Dock-, Wurmloch- oder Handelspostensystems möchte ich einen verbindlichen Vertrag für Zugangsprivilegien mit Spieler-, Allianz- und Fraktionszielen, damit alle Zugangssysteme dieselben Regeln verwenden.
47. Als Stationsbetreiber möchte ich künftig, dass ein ausdrücklich passendes Verbot stets gegen eine Erlaubnis gewinnt, damit ich einzelne Spieler trotz Allianzfreigabe ausschließen kann.
48. Als Spieler möchte ich künftig, dass ein aus Allianzmitgliedschaft abgeleiteter Zugang mit dem Austritt sofort endet, damit Zugang an die Mitgliedschaft gebunden bleibt.
49. Als Spieler möchte ich künftig, dass die Auflösung einer Allianz alle auf sie zielenden Privilegien entfernt, damit eine spätere Allianz mit wiederverwendeter ID keine Rechte erbt.
50. Als Allianzmitglied möchte ich künftig, dass tatsächlicher Einfluss meiner Mitglieder in der Allianzfarbe erscheint, während fraktionsweite Ansichten die Fraktionsfarbe behalten, damit Allianzterritorium erkennbar ist.

## Implementation Decisions

### Sichtbarkeitsdienst der Sternenkarte

- Der vorhandene Live-Positions-Sichtbarkeitsdienst im Spacecraft-Modul wird zu einem Sternenkarten-Sichtbarkeitsdienst erweitert. Er ist die einzige Stelle, die entscheidet, welche Schiffe ein Betrachter auf der Sternenkarte sieht. Verbraucher erhalten keine eigene Sichtbarkeitslogik.
- Der Dienst nimmt einen Betrachter und eine Kartenebene entgegen. Er liefert eine Liste von Kartenkontakten. Jeder Kontakt trägt:
  - Schiffs-ID, Schiffsname, Schiffsklasse, Besitzer-ID und Besitzername,
  - die aufgelöste Position im vorhandenen Positionsmodell (Galaxie- und gegebenenfalls Systemkoordinaten),
  - den Sichtbarkeitsgrund `OWN`, `ALLIANCE` oder `SHARED_LIVE_POSITION`,
  - die Haltung `FRIEND`, `NEUTRAL` oder `ENEMY` (bei eigenen Schiffen entfällt sie),
  - bei Allianzschiffen eine Allianzreferenz mit ID, Name und Farbe,
  - optional einen Verwaltungsdetailblock.
- Gründe werden in fester Reihenfolge vergeben: eigen vor Allianz vor geteilter Position. Ein Schiff erscheint höchstens einmal.
- Allianzschiffe sind die Schiffe aller aktuellen Mitglieder der Allianz des Betrachters. Die Fähigkeit dazu wird aus der zentralen Auflösung abgeleitet, analog zu `mayShareHistoricalScans`. Der Dienst prüft die Mitgliedschaft nicht selbst.
- Geteilte Partnerschiffe kommen ausschließlich über die vorhandene Fähigkeit `mayShareLivePosition`. Die Freigabe „Als Freund behandeln“ macht keine Positionen sichtbar.
- Für alle Besitzer wird die Haltung mit einer gebündelten Auflösung (`resolveMany`) ermittelt. Der Dienst rekonstruiert weder Haltung noch Beziehungstyp.
- Der Dienst liest Mitgliedschaft, Ämter und Beziehungen bei jeder Anfrage neu. Es werden keine Sichtbarkeitsrechte, Kopien oder Caches persistiert. Austritt, Rauswurf, Auflösung, Amtswechsel, Krieg und Beziehungsende brauchen deshalb keinen Bereinigungsschritt.
- Zerstörte Schiffe und Schiffe ohne auflösbare Position werden ausgelassen. Schiffe anderer Kartenebenen werden serverseitig herausgefiltert.
- Die Antwort ist auf die angefragte Ebene begrenzt und wird ohne Pagination in einem Durchlauf erzeugt. Pro Anfrage wird die Haltung einmal gebündelt aufgelöst, nicht einmal je Schiff.

### Detailstufen

- Basisdaten erhält jeder Betrachter für jeden sichtbaren Kontakt: die oben genannten Kerndaten.
- Verwaltungsdetails sind Status, Alarmstufe, Hülle und maximale Hülle sowie Crew und maximale Crew. Sie werden nur geliefert, wenn der Betrachter aktuell Präsident oder Vize ist und der Kontakt den Grund `ALLIANCE` hat. Eigene Schiffe erhalten diese Details immer.
- Diplomaten und Mitglieder ohne Amt erhalten für Allianzschiffe nur Basisdaten. Partnerschiffe mit geteilter Position erhalten nie Verwaltungsdetails.
- Fracht, Module, Logbücher, Scanergebnisse, Nachrichten, Notizen, Zugangsdaten und Admininformationen gehören zu keiner Detailstufe.
- Die Detailstufe wird serverseitig entschieden. Ein ausgelassener Detailblock ist nicht nur ausgeblendet, sondern wird gar nicht übertragen.

### API

- Eine neue authentifizierte Route liefert die Kartenkontakte des Betrachters für eine Kartenebene. Sie ist dem Spacecraft-Modul zugeordnet, analog zur vorhandenen Route für geteilte Live-Positionen. Die Ebene ist ein Pflichtparameter. Eine unbekannte Ebene liefert einen Not-Found-Fehler.
- Die Antwort enthält neben den Kontakten ein Flag, ob Allianz- und Partnerkontakte aktiv sind.
- Die bestehende Route `GET /api/spacecraft/shared-live-positions` bleibt mit unverändertem Vertrag erhalten. Sie wird intern aus demselben Dienst bedient und liefert weiterhin nur geteilte Live-Positionen.
- Die Kontakt-DTOs, die Gründe, die Haltungen und der Detailblock liegen in `packages/shared`.

### Fähigkeit und Auslieferung

- Eine neue ausdrückliche Fähigkeit für die Allianz-Infrastruktur ist standardmäßig deaktiviert, analog zur Fähigkeit des Diplomatie-Kerns.
- Ist sie deaktiviert, liefert die Kontaktroute nur eigene Schiffe, und das Flag meldet inaktiv. Ist sie aktiviert, kommen Allianz- und Partnerkontakte hinzu.
- Die Diplomatieverwaltung erhält vom Server die Information, ob die Kartenanzeige aktiv ist. Ihr Hinweis verweist dann auf die Sternenkarte statt auf die künftige Allianz-Kartenansicht.
- Die Etappe braucht keine Schemaänderung. Falls doch ein Index für die Mitglieder- oder Ebenenabfrage nötig wird, wird er als rückwärtskompatible Migration vor der Aktivierung ausgeliefert.

### Sternenkarte (Frontend)

- Die Sternenkarten-Seite lädt die Kartenkontakte beim Öffnen, beim Wechsel der Ebene und in einem festen Intervall von 30 Sekunden, solange die Seite sichtbar ist. Zusätzlich lädt sie bei den vorhandenen Socket-Ereignissen für eigene Schiffsbewegungen neu. Es entstehen keine neuen Websocket-Kanäle oder Ereignistypen.
- Schiffsmarker werden als eigenes, testbares DOM- beziehungsweise SVG-Overlay über dem Kartencanvas gerendert, nach dem Muster des Hyperraumrouten-Overlays. Sie werden nicht nur in den Pixi-Canvas gezeichnet.
- Kontakte auf derselben Zelle werden zu einem Marker mit Anzahl gebündelt. Schiffe in einem System erscheinen auf der Galaxiekarte an der Systemzelle und im geöffneten Systemraster an ihrer Systemposition.
- Die Markerdarstellung unterscheidet Herkunft und Haltung:
  - eigene Schiffe in einer festen Eigenfarbe,
  - Allianzschiffe in der Allianzfarbe, ohne gesetzte Farbe in einer einheitlichen Standardfarbe,
  - Partnerschiffe mit eigener Kennzeichnung für geteilte Positionen,
  - Haltung als zusätzliches, nicht nur farbliches Merkmal (Symbol oder Beschriftung), damit sie auch ohne Farbwahrnehmung erkennbar ist.
- Ein Auswahlpanel zeigt die gelieferten Daten des gewählten Markers beziehungsweise Bündels. Ein eigenes Schiff verlinkt auf die Schiffsansicht. Fremde Kontakte bieten keine Steuerungs-, Scan- oder Kampfaktionen.
- Das Kontrollpanel erhält Schalter für die Schiffsebene, für Allianzschiffe und für geteilte Partnerschiffe. Die Schalter für Allianz und Partner erscheinen nur, wenn der Server die Kontakte als aktiv meldet.
- Das Frontend leitet weder Haltung noch Detailstufe selbst ab. Es zeigt nur, was der Server liefert.

### Integrationsvertrag: Allianzdepots

- SWU besitzt keine spielereigenen Stationen und keine Depot-Rumpfrollen. Allianzdepots werden deshalb nicht gebaut.
- Verbindlich für ein künftiges Stationssystem: Ein Allianzdepot ist ausschließlich die organisatorische Zuordnung einer geeigneten, einem Mitglied gehörenden Depotstation zu dessen Allianz.
- Die Zuordnung überträgt weder Eigentum noch neue Entnahme-, Lade- oder Steuerungsrechte.
- Nur der Eigentümer darf eine eigene, als Depot geeignete Station zuordnen oder lösen. Für ungeeignete Stationen meldet der Server einen Fehler und keinen Erfolg.
- Präsident und Vize sehen in der Verwaltung Besitzer, Standort und Bestand aller Allianzdepots.
- Austritt und Rauswurf lösen die Depots des betroffenen Mitglieds. Abwracken löst die Zuordnung der Station. Die Auflösung löst alle Depots der Allianz. Station und Eigentum bleiben jeweils unverändert.
- Das Lösen geschieht in derselben Transaktion wie das auslösende Ereignis.

### Integrationsvertrag: Zugangsprivilegien

- Docking, spielergesteuerte Wurmlochrechte und Handelsposten fehlen in SWU. Ein Privilegienmodell wird nicht vorab gebaut.
- Verbindlich für das erste künftige Zugangssystem: Eine Zugangsregel zielt auf einen Spieler, eine Allianz oder eine Fraktion und ist entweder Erlaubnis oder Verbot.
- Ein ausdrücklich passendes Verbot gewinnt stets gegen jede Erlaubnis.
- Allianzregeln werden über die aktuelle Mitgliedschaft bei jeder Prüfung dynamisch ausgewertet. Ein Austritt beendet den daraus abgeleiteten Zugang sofort.
- Die Haltung allein schaltet keinen Zugang frei. Sie darf nur zusätzlich zu einer ausdrücklich passenden Regel geprüft werden und wird über die zentrale Auflösung bezogen.
- Die Auflösung einer Allianz entfernt in ihrer Transaktion alle Regeln, die auf diese Allianz zielen. Weder Regeln noch Anzeigen dürfen auf eine wiederverwendete Allianz-ID übergehen. Eine gelöschte Zielallianz wird nie als gültiges Ziel angezeigt.
- Das erste künftige Zugangssystem baut das gemeinsame Modell. Weitere Systeme verwenden es wieder, statt eigene Regeln zu definieren.
- Die Integrationspunkte werden in der vorhandenen Dokumentation der Beziehungswirkungen nachgeführt.

### Integrationsvertrag: Territorialfarbe

- SWU besitzt keinen spielereigenen Einfluss. Die vorhandenen Einflussgebiete sind adminberechnete Weltdaten ohne Spielerbezug, und es gibt keine persönlichen Spielerfarben.
- Verbindlich für ein künftiges spielereigenes Einflusssystem: Für tatsächlichen Einfluss eines Allianzmitglieds überschreibt die gesetzte Allianzfarbe die persönliche Farbe. Der Gebietstitel nennt Allianz und Spieler.
- Fraktionsweite Ansichten behalten die Fraktionsfarbe.
- Die Farbe wird bei der Darstellung aus der aktuellen Mitgliedschaft abgeleitet und nicht in Einflussdaten kopiert.
- Die bereits vorhandene, validierte Allianzfarbe wird in dieser Etappe für Allianzschiffmarker verwendet. Dadurch ist sie für die spätere Territorialfarbe schon im Spiel eingeführt.

## Testing Decisions

- Gute Tests prüfen nur beobachtbares Verhalten: welche Kontakte ein Betrachter erhält, mit welchem Grund, welcher Haltung und welcher Detailstufe, und was die Karte daraus anzeigt. Sie prüfen keine Repository-Aufrufreihenfolgen, keine ORM-Abfragen und keine privaten Methoden.
- **Höchste Backend-Seam:** der Sternenkarten-Sichtbarkeitsdienst, getestet wie der vorhandene Live-Positions-Sichtbarkeitsdienst. Die Fälle:
  - Eigene Schiffe erscheinen immer mit Grund eigen und vollen Verwaltungsdetails.
  - Ein allianzloser Spieler sieht nur eigene Schiffe.
  - Mitglieder sehen alle Schiffe aller aktuellen Mitglieder, mit Allianzreferenz und Farbe.
  - Präsident und Vize erhalten Verwaltungsdetails für Allianzschiffe. Diplomat und Mitglied ohne Amt erhalten keine.
  - Partnerschiffe mit aktiver Freigabe erscheinen mit Grund geteilte Position, ohne Verwaltungsdetails, auch bei neutraler Haltung.
  - Fehlende, ausstehende und beendete Freigaben, Krieg sowie die Freigabe „Als Freund behandeln“ ohne Positionsteilung liefern keine Partnerschiffe.
  - Spieler der anderen Fraktion erscheinen nie.
  - Nach Austritt, Rauswurf, Auflösung oder Amtsverlust ändert sich das Ergebnis der nächsten Anfrage entsprechend.
  - Ein Schiff erscheint bei mehreren Gründen genau einmal mit dem vorrangigen Grund.
  - Zerstörte Schiffe, Schiffe ohne Position und Schiffe anderer Ebenen fehlen.
  - Ein Resolverfehler liefert nur eigene Schiffe.
  - Bei deaktivierter Fähigkeit werden nur eigene Schiffe geliefert.
- Die bestehenden Tests der Route für geteilte Live-Positionen bleiben unverändert grün. Das belegt die Rückwärtskompatibilität.
- Controller- beziehungsweise Autorisierungstests senden direkte Requests als Präsident, Vize, Diplomat, Mitglied ohne Amt, allianzloser Spieler und Spieler der anderen Fraktion. Sie prüfen, dass kein manipulierter Parameter zusätzliche Kontakte oder Details liefert. Ein ausgeblendeter Marker gilt nie als ausreichender Test.
- Echte Postgres-Integrationstests nach dem Muster der vorhandenen Allianz-Integrationstests prüfen die Kontaktabfrage über Mitgliedschaft, Beziehung und Ebene. Mitgliedswechsel und Beziehungsende sollen ohne Bereinigungsschritt sofort wirken.
- **Höchste Frontend-Seam:** die Sternenkarten-Seite mit gemockter API, nach dem Muster der vorhandenen Seitentests. Die Fälle:
  - Marker für eigen, Allianz und Partner sind unterscheidbar.
  - Die Haltung ist nicht nur farblich erkennbar.
  - Die Allianzfarbe und die Standardfarbe werden angewandt.
  - Kontakte auf einer Zelle werden gebündelt.
  - Das Auswahlpanel zeigt Verwaltungsdetails nur, wenn sie geliefert wurden.
  - Eigene Schiffe verlinken, fremde bieten keine Aktionen.
  - Die Schalter blenden Ebenen aus. Bei inaktiver Fähigkeit fehlen die Allianz- und Partnerschalter.
  - Ebenenwechsel lädt neu.
- Der vorhandene Test der Diplomatieverwaltung wird so angepasst, dass der Hinweis bei aktiver Kartenanzeige auf die Sternenkarte verweist und sonst unverändert bleibt.
- Für Allianzdepots, Zugangsprivilegien und Territorialfarbe werden keine Testträger simuliert. Ihre Verträge werden erst mit dem jeweiligen künftigen System getestet.

## Out of Scope

- Der Bau spielereigener Stationen, Depot-Rumpfrollen, Docking, spielergesteuerter Wurmlochrechte, Handelsposten oder spielereigenen Einflusses. Für sie gelten nur die obigen Integrationsverträge.
- Ein vorab gebautes generisches Zugangsprivilegienmodell ohne Verbraucher.
- Die Verwaltungsansicht der Mitgliederdaten mit Kolonien, Crew-Auslastung und Aktivität sowie das Allianzforum. Beide gehören zur Etappe Interne Zusammenarbeit.
- Neue Websocket-Kanäle, Ereignistypen oder eine Echtzeitübertragung fremder Schiffsbewegungen.
- Freund-Feind-Markierung von Schiffen, die nur über Sensorreichweite sichtbar sind. Die Sternenkarte zeigt heute keine Sensorkontakte, und diese Etappe führt keine ein.
- Adminansichten und Kartenebenen „nur Allianz“ für Schiffsanzahl oder Subraumspuren.
- Der Diplomatie-Graph.
- Änderungen an Beziehungstypen, Beziehungsfreigaben oder der zentralen Prioritätsmatrix.
- Steuerungs-, Scan- oder Kampfaktionen auf fremden Kartenkontakten.
- Bekannte STU-Bugs, etwa Erfolgsmeldungen beim Zuordnen ungeeigneter Stationen oder nicht gelöschte Allianz-Wurmlochregeln bei der Auflösung.

## Further Notes

- Diese Spezifikation ist die Etappe „Allianz-Infrastruktur“ aus `.scratch/alliance-stu-parity/map.md`. Sie setzt den Diplomatie-Kern und die Beziehungswirkungen voraus.
- Grundlage sind die Entscheidungen „Sternenkarte, Scans und Sichtbarkeit“ (06), „Zugangsprivilegien und Allianzdepots“ (07) und „Grenzwerte, Benachrichtigungen und Auslieferung“ (13). Dazu kommt der Review-Nachtrag zur Live-Positionsfreigabe: Die Kartenanzeige geteilter Live-Positionen wird hier gemeinsam mit den Allianzschiffen gebaut.
- Die Test-Seams wurden am 2026-10-08 mit dem Nutzer bestätigt: ein einziger Backend-Sichtbarkeitsdienst und die Sternenkarten-Seite mit testbarem Marker-Overlay. Ebenfalls bestätigt wurde, dass Depots, Zugangsprivilegien und Territorialfarbe nur als Integrationsverträge spezifiziert werden.
- Historische Koloniescans werden bereits dynamisch innerhalb der Allianz geteilt und sind in dieser Etappe nicht zu ändern.
- ADR 0001 bleibt bindend. Spieler der anderen Fraktion sind Feinde und werden über keine Allianz- oder Beziehungsregel sichtbar. „Allianz“ bezeichnet ausschließlich einen Spielerzusammenschluss.
- Das vorhandene Einflussgebiet besitzt einen Quelltyp `ALLIANCE`. Er ist adminverwaltete Weltdatenstruktur und wird in dieser Etappe nicht als Spielerallianz uminterpretiert. Ein künftiges Einflusssystem muss die Bedeutung ausdrücklich klären, bevor es den Territorialfarbvertrag umsetzt.
- STU kann Allianzschiffe über ein konfigurierbares Recht sichtbar machen. SWU macht sie gemäß ADR 0001 und Entscheidung 06 für alle Mitglieder sichtbar. Nur die Verwaltungsdetails sind an Präsident und Vize gebunden.
