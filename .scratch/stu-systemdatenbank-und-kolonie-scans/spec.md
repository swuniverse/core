# STU-Parität: Sternensystem-Datenbank und Kolonie-Scans

Status: ready-for-agent

Bezug: `CONTEXT.md` (Begriffe), `docs/adr/0001-allianzen-abweichungen-von-stu.md` (bestehende Allianzentscheidungen), STU-Referenz in `.scratch/alliance/stu-alliance-research.md` sowie kanonischer STU-Quellcode für Datenbank-, Astrometrie- und Kolonie-Scanabläufe.

## Problem Statement

Spieler können Kolonie-Scans zwar bereits erzeugen und mit aktuellen Mitgliedern ihrer **Allianz** teilen, finden dieses Wissen aber nicht über den STU-typischen Spielpfad wieder. Das vorhandene globale Scanarchiv ist kein Sternensystem-Datenbankeintrag, zeigt zu viele Historienstufen für die STU-Kontextansichten und kennzeichnet geteilte Scans beziehungsweise Löschrechte nicht ausreichend.

Zugleich fehlt eine persönliche, durch bewusste Kartographie erworbene Kenntnis konkreter Sternensysteme. Der derzeitige Spielzustand kann ein System schon beim Betreten als erkundet markieren; damit fehlen der zeitgebundene Wert der Astrometrie, die STU-artige Datenbankkategorie mit unbekannten Einträgen und eine serverseitig geschützte Wissensgrenze.

## Solution

Spieler entdecken ein Sternensystem ausschließlich durch einen abgeschlossenen Astrometrieauftrag eines eigenen Schiffs. Die persönliche **Systementdeckung** öffnet einen dauerhaften **Systemeintrag** in der Datenbank. Dort finden Spieler eine aktuelle, nicht-taktische Systemkarte, Systeminformationen und je Kolonie den neuesten für sie zugänglichen **Kolonie-Scan**.

Aktuelle Mitglieder derselben **Allianz** lesen einander Kolonie-Scans dynamisch; nach Austritt oder Ausschluss verschwinden fremde Scans sofort, eigene Scans bleiben erhalten. Systementdeckungen bleiben dagegen stets persönlich. Fremdprofile zeigen die neuesten zugänglichen Scans zu den Kolonien des profilierten Spielers, das eigene Profil nicht. Das globale Scanarchiv bleibt als optionale SWU-Komfortansicht mit Historie bestehen.

## User Stories

### Systementdeckung und Astrometrie

1. Als Spieler möchte ich ein Sternensystem erst nach einer bewussten Astrometrie entdecken, damit Systemwissen einen spielerischen Wert hat.
2. Als Spieler möchte ich Astrometrie nur mit einem eigenen, einsatzbereiten Schiff starten können, damit fremde oder zerstörte Schiffe nicht für mich forschen.
3. Als Spieler möchte ich Astrometrie nur im aktuellen Sternensystem starten können, damit ich Systeme nicht aus der Ferne entdecke.
4. Als Spieler möchte ich eine verständliche Meldung erhalten, wenn mein Schiff in Bereitschaft, im Flug, im Kampf oder zerstört ist, damit ich weiß, warum Astrometrie nicht starten kann.
5. Als Spieler möchte ich für Astrometrie funktionsfähige Sensoren, genügend Crew und Energie benötigen, damit sie zu den übrigen Schiffsaktionen passt.
6. Als Spieler möchte ich sehen, dass ein Astrometrieauftrag läuft und wann er abgeschlossen wird, damit ich den Zustand meines Schiffs verstehe.
7. Als Spieler möchte ich während eines laufenden Astrometrieauftrags keine konfliktierende Navigation oder andere unvereinbare Aktion starten können, damit der Auftrag eine echte Bindung darstellt.
8. Als Spieler möchte ich ein bereits entdecktes System nicht nochmals kartographieren können, damit keine doppelten Aufträge oder Belohnungen entstehen.
9. Als Spieler möchte ich, dass ein Astrometrieauftrag nach dem nächsten vorgesehenen Abschluss-Tick erfolgreich endet, damit Entdeckung nicht nur ein sofortiger Button ist.
10. Als Spieler möchte ich bei erfolgreicher Astrometrie einen persönlichen Systemeintrag und die zugehörige Information erhalten, damit ich mein neues Wissen wiederfinde.
11. Als Spieler möchte ich, dass ein Auftrag bei Zerstörung, Bereitschaft, Abflug, Positionsverlust oder nicht mehr betriebsbereiten Voraussetzungen ohne Entdeckung endet, damit der Abschluss glaubwürdig an das aktive Schiff gebunden ist.
12. Als Spieler möchte ich bei einem abgebrochenen Auftrag keine bereits bezahlten Kosten zurückerhalten, damit das Risiko der Aktion erhalten bleibt.
13. Als Mitglied einer **Allianz** möchte ich meine Systementdeckungen nicht automatisch teilen oder von anderen erhalten, damit Kartographie persönliches Wissen bleibt.
14. Als Spieler möchte ich beim bloßen Betreten eines Systems noch keinen Datenbankeintrag erhalten, damit Astrometrie der einzige Entdeckungsweg bleibt.

### Datenbankkategorie Sternensysteme

15. Als Spieler möchte ich in der Datenbank eine Kategorie für Sternensysteme finden, damit ich meine kartographische Kenntnis an einer dauerhaften Stelle verwalte.
16. Als Spieler möchte ich Sternensysteme nach den Kartenebenen sehen, die ich über die bestehende Sternenkarte erreichen beziehungsweise kennen kann, damit die Datenbank zu meiner Kartenwelt passt.
17. Als Spieler möchte ich ein entdecktes System mit Name, Außenkoordinaten, Typ und Entdeckungszeit sehen, damit ich es eindeutig identifizieren kann.
18. Als Spieler möchte ich noch unbekannte Systeme derselben sichtbaren Ebene als `???` sehen, damit ich erkenne, dass es weitere Kartographieziele gibt, ohne Wissen vorwegzunehmen.
19. Als Spieler möchte ich bei unbekannten Systemen weder Namen, Koordinaten, Typ, Himmelskörper noch Entdeckungszeit erfahren, damit die Maskierung echtes Nichtwissen erhält.
20. Als Spieler möchte ich die Anzahl und Reihenfolge unbekannter Systempositionen erkennen, damit meine Kartographieziele nachvollziehbar bleiben.
21. Als Spieler möchte ich einen unbekannten Systemeintrag nicht direkt öffnen können, damit ich die Entdeckungsgrenze nicht über die Oberfläche umgehen kann.
22. Als Spieler möchte ich auch per direkter URL oder API keinen nicht entdeckten Systemeintrag abrufen können, damit die Wissensgrenze serverseitig geschützt ist.
23. Als berechtigter Karteneditor oder Administrator möchte ich die bestehenden Verwaltungsansichten weiterhin verwenden können, damit die Spielerberechtigung keine Verwaltung blockiert.

### Systemeintrag

24. Als Spieler möchte ich in einem entdeckten **Systemeintrag** eine aktuelle Rasterkarte sehen, damit ich die gegenwärtige Struktur des Systems verstehe.
25. Als Spieler möchte ich Name, Typ und Außenkoordinaten des Systems sehen, damit ich die Karte einordnen kann.
26. Als Spieler möchte ich aktuelle Himmelskörper, aktuelle Felder und aktuelle Koloniebelegung sehen, damit die Datenbank nicht mit veralteter Systemtopologie arbeitet.
27. Als Spieler möchte ich ein Feld oder Objekt nur zur Untersuchung auswählen können, damit die Datenbank eine Wissensansicht und keine Fernsteuerung ist.
28. Als Spieler möchte ich in der Datenbank-Systemkarte keine Bewegungs-, Kampf-, Navigations- oder Scanaktionen auslösen können, damit taktische Aktionen am Schiff bleiben.
29. Als Spieler möchte ich von einem entdeckten Systemeintrag zur vorhandenen Sternenkarte springen können, damit ich das System räumlich einordnen kann.
30. Als Besitzer mindestens einer Kolonie im dargestellten System möchte ich eine Schnellnachricht an den aktuellen Besitzer einer fremden Kolonie starten können, damit ich lokale Kommunikation ohne Umwege beginnen kann.
31. Als Spieler ohne eigene Kolonie im System möchte ich diese Schnellnachricht nicht sehen, damit Systemwissen keinen globalen Kontaktkanal schafft.
32. Als Spieler möchte ich, dass die Schnellnachricht den aktuellen Koloniebesitzer adressiert, nicht einen historischen Scanbesitzer, damit sie die richtige Person erreicht.

### Kolonie-Scans im Systemeintrag

33. Als Spieler möchte ich im Systemeintrag je Kolonie nur den neuesten für mich zugänglichen **Kolonie-Scan** sehen, damit die STU-Kontextansicht kompakt und aktuell bleibt.
34. Als Spieler möchte ich in einer Scanzeile aktuelle Feldkoordinaten und das aktuelle Kolonie-/Objektbild sehen, damit ich den Scan im heutigen System verorten kann.
35. Als Spieler möchte ich Scanzeit, Scanner sowie den bei Scanzeit gespeicherten Kolonienamen und Besitzer sehen, damit ich die Herkunft und das Alter des Wissens beurteilen kann.
36. Als Spieler möchte ich einen deutlichen Hinweis erhalten, wenn der aktuelle Besitzer vom gespeicherten Scan-Snapshot abweicht oder die Kolonie aufgegeben wurde, damit ich veraltetes Wissen erkenne.
37. Als Spieler möchte ich die gespeicherte Oberfläche eines zugänglichen Scans in einem nicht-taktischen Dialog öffnen, damit ich Gelände, Gebäude, Bauzustände, Integrität und Vorkommen untersuchen kann.
38. Als Scanner möchte ich meinen eigenen Scan aus dem Systemeintrag löschen können, damit ich mein gespeichertes Wissen verwalte.
39. Als Leser eines geteilten Allianzscans möchte ich keinen Löschbutton sehen, damit klar ist, dass der Scan einem anderen Spieler gehört.
40. Als Spieler möchte ich auch über direkte API-Aufrufe keinen fremden Scan löschen können, damit die Oberfläche nicht die einzige Rechteprüfung ist.
41. Als Mitglied einer **Allianz** möchte ich die gespeicherten Kolonie-Scans meiner aktuellen Allianzmitglieder lesen können, damit die Allianz ihr gemeinsames Aufklärungswissen nutzt.
42. Als ehemaliges Mitglied einer **Allianz** möchte ich fremde Scans nach Austritt oder Ausschluss nicht mehr sehen, damit Freigaben nicht dauerhaft kopiert werden.
43. Als ehemaliges Mitglied einer **Allianz** möchte ich meine eigenen Scans weiterhin sehen und löschen können, damit ich mein eigenes Wissen behalte.
44. Als Spieler möchte ich wissen, ob ein sichtbarer Scan mein eigener oder ein aktuell über die **Allianz** geteilter Scan ist, damit ich Herkunft und Rechte verstehe.
45. Als Spieler möchte ich, dass Diplomatie, Freundschaft und geteilte Live-Positionen allein keinen Zugriff auf gespeicherte Kolonie-Scans geben, damit Scanfreigabe eindeutig an aktuelle Allianzmitgliedschaft gebunden bleibt.

### Fremdprofile und Komfortarchiv

46. Als Spieler möchte ich auf dem Profil eines anderen Spielers die neuesten für mich zugänglichen Scans zu dessen Kolonien sehen, damit ich mein Wissen über diesen Spieler im passenden Kontext finde.
47. Als Spieler möchte ich auf meinem eigenen Profil keine solche Koordinaten-/Scanliste sehen, damit mein Profil nicht als persönliches Archiv missverstanden wird.
48. Als Spieler möchte ich auch in der Fremdprofil-Liste Scanner, Zeit und eine nicht-taktische Oberflächenansicht sehen, damit sie dieselbe Informationsqualität wie der Systemeintrag hat.
49. Als Spieler möchte ich aus einem fremden Profil keine nicht autorisierten Scanflächen oder nicht entdeckten Systemdetails erfahren, damit Profilansichten keine Wissensgrenzen umgehen.
50. Als Spieler möchte ich das bestehende globale Scanarchiv weiterhin als optionale Übersicht nutzen können, damit ich eigene und aktuell geteilte Scans mitsamt Historie durchsuchen kann.
51. Als Spieler möchte ich im globalen Archiv die vollständige Historie pro Kolonie sehen können, damit SWU zusätzlich zur STU-Kontextansicht einen Komfortzugriff bietet.
52. Als Spieler möchte ich im globalen Archiv fremde Allianzscans als geteilt erkennen und nur bei eigenen Scans eine Löschaktion sehen, damit es sich konsistent mit dem Systemeintrag verhält.
53. Als Spieler möchte ich nach einem erfolgreichen Kolonie-Scan einen Link zum zugehörigen Systemeintrag sehen, sofern ich dieses System schon entdeckt habe, damit ich vom Sofortergebnis zu meinem dauerhaften Wissen wechseln kann.
54. Als Spieler möchte ich durch diesen Link kein nicht entdecktes System öffnen oder entdecken, damit der Sofortscan die Astrometrie nicht entwertet.

## Implementation Decisions

- **Primäre Test- und API-Naht:** Der authentifizierte, spielerseitige Datenbankvertrag ist die höchste gemeinsame Naht für Systementdeckung, maskierten Katalog, geschützten Systemeintrag, Scanlisten und Rechte. Astrometrie ist die zweite Naht, weil sie den einzigen Weg in diesen Datenbestand erzeugt. Frontendtests mocken diese Verträge; Backendtests prüfen beobachtbare Service-/Controller-Ergebnisse und Datenbankzustand, nicht Repository-Interna.
- **Begriffe:** **Systementdeckung** ist persönlich und dauerhaft; **Astrometrie** ist der zeitgebundene Schiffsauftrag, der sie erzeugt; ein **Systemeintrag** ist die geschützte Datenbankansicht eines entdeckten Systems; ein **Kolonie-Scan** gehört dem Scanner; ein **Scan-Snapshot** enthält den Zustand bei Scanzeit und ist von aktuellen Systemdaten getrennt.
- **Systementdeckung wiederverwenden:** Die vorhandene persönliche Systemexploration wird zur alleinigen Datenbankberechtigung für konkrete Systeme konsolidiert. Automatische Systementdeckung beim Betreten und andere implizite Erzeuger entfallen. Feldexploration, Systemtypentdeckung und Himmelskörperklassenerkennung bleiben eigenständige Mechaniken.
- **Astrometrie als persistenter Auftrag:** Ein eigener Datensatz repräsentiert pro Schiff höchstens einen aktiven Auftrag, inklusive Spieler, gebundenem System, Status, Start-/Fälligkeitszeit oder Ziel-Tick und Abbruchgrund. Der Auftrag wird nicht als lose UI-Information oder nur als flüchtiger Schiffszustand modelliert.
- **Astrometrie-Lebenszyklus:** Der Start prüft Besitz, Schiffszustand, aktuelle Systemposition, Crew, Energie und betriebsbereite Langstreckensensoren; Kosten werden beim Start abgezogen. Die Verarbeitung erfolgt im bestehenden Haupttick nach Bewegung und Ressourcen-/Brownout-Verarbeitung. Erfolg setzt unveränderte Systembindung und Betriebsfähigkeit voraus. Zerstörung, Bereitschaft, Abflug, Positionsverlust oder ungültige Voraussetzungen führen zu Abbruch ohne Erstattung. Abschluss und Abbruch sind idempotent.
- **Entdeckungsumfang:** Astrometrie entdeckt genau das aktuelle Sternensystem, nicht fernliegende Systeme und nicht automatisch alle Himmelskörperklassen. Eine gegebenenfalls sichtbare Systemtypentdeckung erhält eine eigene Astrometrie-Herkunft und bleibt von der Systeminstanz-Entdeckung getrennt.
- **Datenbankkatalog:** Die Datenbank liefert pro für den Spieler sichtbarer Kartenebene eine geordnete, strukturell maskierte Liste. Entdeckte Einträge enthalten nur die erlaubten Metadaten; unbekannte Einträge enthalten keine identifizierenden Systeminformationen und können nicht geöffnet werden.
- **Detailautorisierung:** Jeder Systemeintrag wird serverseitig gegen die persönliche Systementdeckung geprüft und antwortet bei fehlendem Recht nicht enumerierbar. Bestehende allgemeine Spielerendpunkte, die vollständige Systemdetails oder Raster liefern, werden an dieselbe Berechtigungsgrenze angepasst oder auf Verwaltungszwecke begrenzt.
- **Nicht-taktische Systemansicht:** Ein eigener, zugänglicher Raster-Inspektor verwendet vorhandene Karten-/Asset-Helfer, zeigt aktuelle Systemdaten und erlaubt ausschließlich Informationsauswahl. Schiffsaktionen bleiben in den vorhandenen Schiffsoberflächen.
- **Schnellnachricht:** Sie ist an eigene aktuelle Kolonien im dargestellten System gebunden und befüllt die vorhandene Nachrichtenkomposition mit der aktuellen Empfänger-ID und dem aktuellen Namen des fremden Koloniebesitzers.
- **Scanprojekte:** Scanlisten und -details liefern Scanneridentität/-name, serverseitig abgeleitetes `canDelete`, aktuelle Systemreferenz, Freigabeherkunft und Snapshotdaten. Die bestehende serverseitige Eigentumsprüfung beim Löschen bleibt verbindlich.
- **Scanfreigabe:** Eine gemeinsame Abfrage selektiert eigene Scans und Scans aktueller Allianzmitglieder, gruppiert je Kontext nach Kolonie und wählt den neuesten Scan. Freundschaft, Diplomatie und Live-Positionsfreigaben sind keine Scanberechtigung. Allianzwechsel wirken dynamisch und kopieren keine Daten.
- **Live-/Snapshot-Mischung:** Raster, System-/Feldkoordinaten, Himmelskörperbild, heutige Koloniebelegung, aktueller Scannername und aktuelle Allianzmitgliedschaft sind aktuelle Daten. Scanzeit, damaliger Koloniename, damaliger Besitzer sowie Oberfläche/Vorkommen sind Snapshotdaten. Besitzerwechsel oder Aufgabe werden sichtbar markiert.
- **Fremdprofile:** Die Profilantwort erhält eine viewer-autorisierte Projektion der neuesten zugänglichen Scans zu Kolonien des Profilspielers. Diese Projektion erscheint nicht auf dem eigenen Profil und gibt keine nicht entdeckten Systemdetails frei.
- **Komfortarchiv:** Das globale Scanarchiv bleibt bestehen und behält seine ausklappbare Historie als bewusste SWU-Erweiterung. Es verwendet dieselbe Eigentums- und Freigabeprojektion wie die STU-Kontextansichten, zeigt aber mehr Historie.
- **Sofortscan:** Der bestehende Kolonie-Scan-Dialog bleibt die direkte Aktionsrückmeldung. Seine Antwort enthält die nötige Systemreferenz und bietet den Datenbanklink ausschließlich für bereits persönlich entdeckte Systeme.
- **Dokumentation:** Die dauerhafte Trennung persönlicher Systementdeckung und dynamisch geteilter Kolonie-Scans wird in einem ADR und im Domänenkontext festgehalten.

## Testing Decisions

- **Gute Tests prüfen Verhalten:** Assertions prüfen sichtbare Daten, erlaubte oder verweigerte Aktionen, persistierte Endzustände, maskierte Werte und fachliche Fehlermeldungen. Sie prüfen keine private Hilfsfunktion, Repository-Aufrufreihenfolge oder konkrete Komponentenstruktur.
- **Astrometrie:** Service- und Ticktests decken Startvoraussetzungen, Einzelauftrag, Kosten, Terminierung, Erfolg, idempotente Wiederholung, bereits entdeckte Systeme und jeden beschlossenen Abbruchfall ab. Vorbilder sind bestehende Schiffs-, Sensor-, Ressourcenfluss- und Tick-Specs.
- **Datenbankvertrag:** Backendtests prüfen je Nutzer die maskierte Systemliste, Schutz nicht entdeckter Details, persönlichen Charakter der Entdeckung, Systeminhalte und die Nichtumgehbarkeit über vorhandene System-/Rasterrouten. Vorbilder sind bestehende Datenbank-, Starmap- und Sichtbarkeits-Specs.
- **Kolonie-Scans:** Tests prüfen neuesten Scan je Kolonie, System- und Fremdprofilfilter, aktuelle Allianzfreigabe, sofortigen Entzug nach Austritt, eigene Lesbarkeit, Scanneranzeige, `canDelete`, Eigentumsschutz und Besitzerwechselmarkierung. Vorbild sind die vorhandenen Scan-Service- und Allianz-Specs.
- **Frontend:** Komponententests prüfen Datenbankhub/Kategorie, `???`-Maskierung, Detailnavigation, inspect-only Raster, Astrometrie-Status und Fehler, Scanzeilen/Dialoge, fehlende Löschaktion für geteilte Scans, Profilabgrenzung, Nachrichten-Vorbelegung und den Link nach einem Sofortscan. Vorbilder sind vorhandene Datenbank-, Sternenkarten-, Spielerprofil-, Nachrichten- und Field-Context-Tests.
- **Migration und Integration:** Migrationstests prüfen Tabellen, Indizes und Rückbau; Integrationstests bestätigen, dass Entity-Registrierung, Berechtigungsgrenzen und Tickabschluss gegen eine echte Datenbank funktionieren.
- **Ende-zu-Ende-Szenario:** Mit zwei Spielern in einer **Allianz**: System betreten, Astrometrie starten, Tick abschließen, Systemeintrag öffnen, Kolonie scannen, Allianzsichtbarkeit prüfen, Allianz verlassen und bestätigen, dass fremde Scans verschwinden, eigene Scans bleiben; anschließend Fremdprofil und Schnellnachricht prüfen.

## Out of Scope

- Historische Scanversionen in den STU-System- oder Fremdprofilansichten; dort erscheint nur der neueste Scan je Kolonie.
- Teilen persönlicher Systementdeckungen, Kartenentdeckungen oder Astrometrieaufträge innerhalb einer **Allianz**.
- Freigabe allgemeiner Oberflächenscans, Sektor-Scans oder anderer Sensordaten über die **Allianz**.
- Fernastrometrie, vollständige Himmelskörperklassenerkennung oder eine neue mehrstufige Innenraum-Entdeckung pro Systemfeld.
- Bewegungs-, Kampf-, Scan- oder andere taktische Fernaktionen aus dem Datenbank-Systemeintrag.
- Neue diplomatische Rechte oder eine Ausweitung der bestehenden Nachrichtenberechtigungen über den Schnellnachrichteneinstieg hinaus.
- Ersetzung oder Entfernung des globalen Scanarchivs; es bleibt eine optionale SWU-Komfortansicht.
- Eine generische Infrastruktur für beliebige zukünftige zeitgebundene Schiffsaktionen über den für Astrometrie erforderlichen persistenten Auftrag hinaus.

## Further Notes

- Die STU-Systemdatenbank nutzt aktuelle System-/Belegungsdaten und gespeicherte Scan-Snapshots bewusst gemeinsam. Die Oberfläche muss die Zeitlichkeit dieser Daten verständlich machen.
- **Allianz** bezeichnet ausschließlich den Spielerzusammenschluss; die **Rebellenallianz** ist eine **Fraktion**.
- Bestehende uncommittete Arbeiten an Kolonie-Scans, Navigation und UI werden vor der Umsetzung geprüft und gezielt weitergeführt, nie zurückgesetzt oder überschrieben.
