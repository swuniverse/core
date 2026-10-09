# Allianz – Etappe 4: Interne Zusammenarbeit

Status: ready-for-agent

Tracker: local Markdown issue tracker (`.scratch/alliance-stu-parity/interne-zusammenarbeit-spec.md`)
Triage label: ready-for-agent

## Problem Statement

Nach Kern, Diplomatie-Kern, Beziehungswirkungen und Allianz-Infrastruktur kann eine **Allianz** gegründet, verwaltet und diplomatisch vertreten werden. Ihre Mitglieder sehen gemeinsam ihre Schiffe auf der Sternenkarte. Nach innen fehlt der Allianz aber fast alles, was Zusammenarbeit ausmacht:

- Mitglieder haben keinen gemeinsamen, nicht öffentlichen Ort für Absprachen. Sie weichen auf private Nachrichten oder das öffentliche Holonet aus.
- **Präsident** und **Vize** sehen nicht, ob ihre Mitglieder aktiv sind, wie es um deren Kolonien steht, welche Schiffe sie besitzen und wie ausgelastet ihre Crew ist. Sie können die Allianz daher nicht sinnvoll führen und inaktive Mitglieder nicht erkennen.
- Beitritte, Austritte, Rauswürfe, Amtswechsel und Änderungen der Allianzdetails hinterlassen keine Spur. Mitglieder können nicht nachvollziehen, wer wann eingetreten ist, wer wen ernannt hat oder wer die Beschreibung geändert hat.
- SWU kennt keinen Zeitpunkt der letzten Aktivität eines Spielers. Die Spalte `lastActiveTick` existiert, wird aber nie geschrieben. Damit fehlt auch die Grundlage für die automatische Präsidentennachfolge der nächsten Etappe.

STU bietet dafür das Allianzforum, die Verwaltungsansicht mit Mitglieder-, Kolonie- und Schiffsdaten sowie die Allianzhistorie. In STU sind Forumsrechte allerdings nur in der Oberfläche durchgesetzt (Bug §11.9). Jedes Mitglied kann per direktem Request fremde Beiträge bearbeiten und löschen sowie Boards löschen.

## Solution

Die Etappe liefert drei zusammenhängende Werkzeuge für die interne Zusammenarbeit.

**Allianzforum.** Jede Allianz erhält ein Mitgliederforum aus Boards, Themen und Beiträgen. Alle aktuellen Mitglieder lesen, legen Themen an und schreiben Beiträge. Autoren bearbeiten ihre eigenen Beiträge. Präsident und Vize legen Boards an, benennen Boards und Themen um, markieren Themen als wichtig und löschen Boards, Themen und Beiträge weich. Jede Lese- und Schreibaktion wird serverseitig gegen die aktuelle Mitgliedschaft und das aktuelle **Amt** geprüft. Das Dashboard zeigt Mitgliedern die drei zuletzt aktiven Themen.

**Mitgliederübersicht.** Präsident und Vize erhalten in der Allianzverwaltung eine Übersicht über ihre Mitglieder. Sie zeigt nur bereits vorhandene operative Daten: letzte Aktivität, Kolonien mit Betriebs- und Lagerzustand, Schiffe nach Klasse und Standort sowie die Crew-Auslastung. Private Nachrichten, Notizen, Zugangsdaten und Admininformationen bleiben ausgeschlossen. Dafür erfasst SWU künftig den Zeitpunkt der letzten Aktivität jedes Spielers.

**Allianzchronik.** Eine interne, unveränderliche **Allianzchronik** protokolliert Gründung, Beitritte, Austritte, Rauswürfe, Amtswechsel, manuelle Präsidentschaftsübergaben und Detailänderungen. Alle aktuellen Mitglieder lesen sie, mit dem Ende der Mitgliedschaft endet der Zugriff. Sie ist getrennt von der öffentlichen **Diplomatie-Chronik**.

Darüber hinaus zeigt die Allianzseite aktuellen Mitgliedern, welche Mitglieder gerade online sind. Für Außenstehende bleibt das verborgen.

## User Stories

### Allianzforum: Lesen und Schreiben

1. Als Allianzmitglied möchte ich ein internes Forum meiner Allianz öffnen, damit wir uns ohne Außenstehende absprechen können.
2. Als Allianzmitglied möchte ich alle Boards meiner Allianz mit Anzahl der Themen und Beiträge sowie dem letzten Beitrag sehen, damit ich weiß, wo etwas passiert.
3. Als Allianzmitglied möchte ich die Themen eines Boards sehen, zuerst die wichtigen, dann nach letzter Aktivität, damit Wichtiges oben steht und aktive Diskussionen sichtbar bleiben.
4. Als Allianzmitglied möchte ich die Beiträge eines Themas chronologisch mit 20 Beiträgen je Seite lesen, damit lange Diskussionen lesbar bleiben.
5. Als Allianzmitglied möchte ich ein neues Thema mit Titel und erstem Beitrag anlegen, damit ich eine Diskussion beginnen kann.
6. Als Allianzmitglied möchte ich in einem Thema antworten, damit ich mich an einer Diskussion beteiligen kann.
7. Als Autor möchte ich meinen eigenen Beitrag bearbeiten, damit ich Fehler korrigieren kann.
8. Als Leser möchte ich sehen, ob und wann ein Beitrag zuletzt bearbeitet wurde, damit ich Änderungen erkenne.
9. Als Allianzmitglied möchte ich zu jedem Beitrag Autor, Fraktion, Amt und Zeitpunkt sehen, damit ich weiß, wer spricht.
10. Als Allianzmitglied möchte ich in Beiträgen den bereits unterstützten sicheren BBCode verwenden, damit ich Texte gliedern kann, ohne unsicheres HTML zu erzeugen.
11. Als Allianzmitglied möchte ich nach dem Absenden eines Beitrags auf der Seite landen, die ihn enthält, damit ich ihn sofort sehe.
12. Als Allianzmitglied möchte ich verständliche Fehlermeldungen bei leerem oder zu langem Titel oder Text, damit ich meine Eingabe korrigieren kann.
13. Als Allianzmitglied möchte ich die drei zuletzt aktiven Themen meiner Allianz im Dashboard sehen, damit ich neue Diskussionen nicht verpasse.
14. Als Allianzmitglied möchte ich vom Dashboard direkt in das jeweilige Thema springen, damit ich ohne Umweg weiterlese.
15. Als Allianzmitglied möchte ich von der Seite meiner Allianz zum Forum navigieren, damit ich es leicht finde.

### Allianzforum: Moderation

16. Als Präsident oder Vize möchte ich Boards anlegen, damit die Allianz ihre Diskussionen ordnen kann.
17. Als Präsident oder Vize möchte ich Boards umbenennen, damit die Ordnung aktuell bleibt.
18. Als Präsident oder Vize möchte ich Themen umbenennen, damit Titel aussagekräftig bleiben.
19. Als Präsident oder Vize möchte ich Themen als wichtig markieren und die Markierung entfernen, damit Ankündigungen oben bleiben.
20. Als Präsident oder Vize möchte ich unangemessene Beiträge löschen, damit das Forum nutzbar bleibt.
21. Als Präsident oder Vize möchte ich Themen und Boards löschen, damit veraltete Bereiche verschwinden.
22. Als Mitglied möchte ich bei einem gelöschten Beitrag weiterhin Autor und Zeitpunkt sowie einen Hinweis auf die Moderation sehen, damit der Gesprächsverlauf nachvollziehbar bleibt.
23. Als Autor eines gelöschten Beitrags möchte ich, dass sein ursprünglicher Inhalt niemandem mehr ausgeliefert wird, damit eine Löschung wirklich wirkt.
24. Als Präsident möchte ich erfassen, wer wann moderiert hat, damit Moderation nachvollziehbar ist.
25. Als Diplomat möchte ich keine Moderationsrechte allein aufgrund meines Amts haben, damit Diplomatie und Forumsverwaltung getrennt bleiben.
26. Als Mitglied ohne Amt möchte ich fremde Beiträge weder bearbeiten noch löschen können, auch nicht per direktem Request, damit niemand fremde Aussagen verändert.
27. Als Präsident oder Vize möchte ich fremde Beiträge löschen, aber nicht inhaltlich umschreiben können, damit niemandem Worte in den Mund gelegt werden.
28. Als Allianz möchte ich höchstens 50 Boards haben, damit die Struktur überschaubar und die Last begrenzt bleibt.
29. Als Spieler möchte ich, dass ein Board bzw. Thema nicht automatisch verschwindet, wenn darin alle Beiträge gelöscht wurden, damit die Struktur nicht unerwartet zerfällt.

### Allianzforum: Zugriff und Sicherheit

30. Als Nichtmitglied möchte ich weder Boards noch Themen noch Beiträge einer fremden Allianz sehen, auch nicht über geratene IDs, damit Allianzinterna vertraulich bleiben.
31. Als ausgetretenes oder rausgeworfenes Mitglied möchte ich sofort keinen Zugriff mehr auf das Forum haben, damit Allianzwissen an die Mitgliedschaft gebunden bleibt.
32. Als verbleibendes Mitglied möchte ich, dass Beiträge ehemaliger Mitglieder erhalten bleiben, damit Diskussionen lückenlos bleiben.
33. Als Mitglied möchte ich, dass Beiträge gelöschter Konten als „Gelöschter Siedler“ erscheinen, damit der Verlauf ohne personenbezogene Restdaten erhalten bleibt.
34. Als neues Mitglied möchte ich nach der Aufnahme sofort das gesamte bisherige Forum lesen, damit ich mich einarbeiten kann.
35. Als Präsident oder Vize möchte ich, dass ein Amtsverlust meine Moderationsrechte mit der nächsten Anfrage beendet, damit Amtswechsel sofort wirken.
36. Als Betreiber möchte ich, dass schnelle Folgen von Themen-, Beitrags- und Bearbeitungsanfragen serverseitig begrenzt werden, damit das Forum nicht geflutet wird.
37. Als Spieler möchte ich, dass gleichzeitige Moderations- und Schreibaktionen keinen inkonsistenten Zustand erzeugen, etwa einen neuen Beitrag in einem gerade gelöschten Thema.

### Mitgliederübersicht

38. Als Präsident oder Vize möchte ich für jedes Mitglied die letzte Aktivität sehen, damit ich inaktive Mitglieder erkenne.
39. Als Präsident oder Vize möchte ich die Kolonien jedes Mitglieds mit Name und Standort sehen, damit ich die Ausdehnung der Allianz kenne.
40. Als Präsident oder Vize möchte ich zu jeder Kolonie Energie, Lagerauslastung und Bevölkerung sehen, damit ich Versorgungsengpässe erkenne.
41. Als Präsident oder Vize möchte ich auf Nachfrage den Lagerbestand einer Mitgliedskolonie sehen, damit ich Lieferungen innerhalb der Allianz planen kann.
42. Als Präsident oder Vize möchte ich die Schiffe jedes Mitglieds nach Klasse gruppiert sehen und darin Schiff und Standort, damit ich die Flottenzusammensetzung beurteilen kann.
43. Als Präsident oder Vize möchte ich die Crew-Auslastung jedes Mitglieds (eingesetzte Crew gegenüber globalem Crewlimit) sehen, damit ich Ausbaupotenzial erkenne.
44. Als Präsident oder Vize möchte ich aus der Übersicht heraus das Profil eines Mitglieds öffnen und ihm eine Nachricht schreiben, damit ich es direkt ansprechen kann.
45. Als Mitglied möchte ich, dass Präsident und Vize weder meine privaten Nachrichten noch persönliche Notizen, Zugangsdaten, Logbücher, Fracht oder Module sehen, damit meine Privatsphäre gewahrt bleibt.
46. Als Diplomat oder Mitglied ohne Amt möchte ich keinen Zugriff auf die Mitgliederübersicht haben, auch nicht per direktem Request, damit operative Mitgliederdaten den Verantwortlichen vorbehalten bleiben.
47. Als Präsident oder Vize möchte ich keine Daten von Spielern außerhalb meiner Allianz über diese Übersicht abrufen können, auch nicht über geratene Kolonie-IDs.
48. Als ehemaliges Mitglied möchte ich, dass meine Daten mit dem Ende der Mitgliedschaft sofort aus der Übersicht verschwinden.
49. Als Spieler möchte ich, dass jede authentifizierte Nutzung des Spiels meine letzte Aktivität aktualisiert, damit die Anzeige stimmt, ohne dass ich etwas tun muss.

### Online-Status

50. Als Allianzmitglied möchte ich auf der Seite meiner Allianz sehen, welche Mitglieder gerade online sind, damit ich weiß, wen ich jetzt erreiche.
51. Als Außenstehender möchte ich den Online-Status fremder Allianzmitglieder nicht sehen, damit Allianzen nicht ausgespäht werden können.

### Allianzchronik

52. Als Allianzmitglied möchte ich die interne Chronik meiner Allianz lesen, neueste Einträge zuerst, damit ich die Geschichte meiner Allianz kenne.
53. Als Allianzmitglied möchte ich ältere Chronikeinträge seitenweise nachladen, damit auch lange Geschichten lesbar bleiben.
54. Als Allianzmitglied möchte ich die Gründung der Allianz in der Chronik sehen, damit ihr Anfang festgehalten ist.
55. Als Allianzmitglied möchte ich jeden Beitritt mit dem aufnehmenden Verantwortlichen sehen, damit ich weiß, wer wen aufgenommen hat.
56. Als Allianzmitglied möchte ich jeden Austritt sehen, damit Abgänge nachvollziehbar sind.
57. Als Allianzmitglied möchte ich jeden Rauswurf mit dem handelnden Verantwortlichen sehen, damit Rauswürfe transparent sind.
58. Als Allianzmitglied möchte ich jede Ernennung und Absetzung mit altem und neuem Amt sehen, damit Machtverhältnisse transparent sind.
59. Als Allianzmitglied möchte ich jede manuelle Übergabe der Präsidentschaft sehen, damit Führungswechsel festgehalten werden.
60. Als Allianzmitglied möchte ich sehen, wer wann welche Allianzdetails geändert hat (etwa Name, Beschreibung, Farbe, Amtstitel, Bewerbungsannahme), damit Änderungen nachvollziehbar sind.
61. Als Allianzmitglied möchte ich, dass die Chronik bei einer Namensänderung den alten und neuen Namen festhält, sonst aber keine Inhalte wie die Beschreibung kopiert, damit sie knapp bleibt.
62. Als Allianzmitglied möchte ich, dass Chronikeinträge die Namen zum Ereigniszeitpunkt zeigen, auch wenn ein Spieler später umbenannt oder gelöscht wurde, damit die Geschichte lesbar bleibt.
63. Als Allianzmitglied möchte ich, dass niemand, auch nicht der Präsident, Chronikeinträge ändern oder löschen kann, damit die Chronik verlässlich ist.
64. Als Nichtmitglied oder ehemaliges Mitglied möchte ich die Allianzchronik nicht lesen können, damit interne Vorgänge vertraulich bleiben.
65. Als Allianzmitglied möchte ich, dass öffentliche Diplomatieereignisse nicht in der internen Chronik doppelt erscheinen und interne Ereignisse nicht in der öffentlichen Diplomatie-Chronik, damit beide Ansichten ihren Zweck erfüllen.
66. Als Spieler möchte ich, dass eine Aktion entweder vollständig mit Chronikeintrag oder gar nicht wirksam wird, damit Chronik und Zustand nie auseinanderlaufen.

### Fähigkeiten und Navigation

67. Als Spieler möchte ich, dass Forum, Mitgliederübersicht und Chronik in der Oberfläche nur angeboten werden, wenn der Server sie mir erlaubt, damit ich keine wirkungslosen Schaltflächen sehe.
68. Als Präsident oder Vize möchte ich die Mitgliederübersicht aus der Allianzseite erreichen, damit ich sie ohne Suche finde.

## Implementation Decisions

### Abgrenzung

- Die Etappe umfasst Allianzforum, Mitgliederübersicht mit letzter Aktivität, Online-Status für Mitglieder und die Allianzchronik für die heute vorhandenen internen Ereignisse.
- Banner samt Asset-Schnittstelle und `$ALLIANCE_BANNER`, die automatische Präsidentennachfolge, Kontolöschung mit Nachfolge, die vollständige Auflösungs- und Reset-Bereinigung sowie Allianzdepots gehören zur Etappe „Lebenszyklus und Restparität“. Diese Etappe trägt dann die Chronikereignisse für automatische Nachfolge und Banneränderungen nach.
- Die bestehende Auflösung (Präsident löst auf, letztes Mitglied tritt aus) entfernt die neuen Allianzdaten über Fremdschlüssel-Kaskaden in derselben Transaktion. Es entsteht kein eigener Bereinigungsschritt.

### Modulschnitt

- Alles bleibt im Allianz-Modul. Neben dem bestehenden `AllianceService` entstehen zwei neue, tiefe Dienste mit schmaler Schnittstelle:
  - ein **Forumsdienst** für Boards, Themen und Beiträge,
  - ein **Mitgliederübersichtsdienst** für die operativen Mitgliederdaten.
- Die Allianzchronik wird vom `AllianceService` geschrieben, weil alle ihre Ereignisse dort entstehen. Das Lesen der Chronik liegt ebenfalls dort, analog zur Diplomatie-Chronik.
- Persistenz läuft wie bisher über die Store-Abstraktion des Moduls mit TypeORM-Implementierung und In-Memory-Implementierung für Tests. Der Forumsdienst erhält einen eigenen, auf das Forum zugeschnittenen Store-Port, damit der bestehende Allianz-Store nicht weiter wächst.
- Der Mitgliederübersichtsdienst liest Kolonien, Schiffe, Crew und Lager über einen einzigen schmalen Lese-Port („operative Mitgliederdaten für eine Menge von Spieler-IDs“). Die Implementierung des Ports greift lesend auf die vorhandenen Kolonie-, Schiffs-, Crew- und Lagerdaten zu und verwendet für das globale Crewlimit die vorhandene Berechnung des Kolonie-Moduls. Der Dienst rekonstruiert keine Spielregeln.
- Mitgliedschafts- und Amtsprüfungen verwenden die vorhandene Rechtematrix. Sie erhält neue Allianzaktionen:
  - `moderateForum`: Präsident und Vize.
  - `viewMemberOperations`: Präsident und Vize.
  - Lesen, Themen anlegen, Beiträge schreiben und Chronik lesen erfordern nur die aktuelle Mitgliedschaft und brauchen keinen Matrixeintrag.

### Schemaänderungen

Alle Änderungen sind rückwärtskompatible, additive Migrationen mit Migrationstest nach dem vorhandenen Muster.

- **Letzte Aktivität:** Die Spielertabelle erhält einen nullable Zeitstempel der letzten Aktivität. Die ungenutzte Spalte `lastActiveTick` bleibt unverändert und wird nicht wiederbelebt.
- **Forum:** drei Tabellen.
  - **Board:** Allianzreferenz mit Kaskade bei Auflösung, Name, Erstellzeit, Zeitpunkt der letzten Aktivität und Felder für weiche Löschung (Löschzeit und Moderator).
  - **Thema:** Boardreferenz mit Kaskade, denormalisierte Allianzreferenz für die Autorisierung, Titel, Autor, wichtig-Markierung, Erstellzeit, Zeitpunkt der letzten Aktivität und Felder für weiche Löschung.
  - **Beitrag:** Themenreferenz mit Kaskade, Autor, Autorname, Text, Erstellzeit, Zeitpunkt der letzten Bearbeitung und Felder für weiche Löschung (Löschzeit, Moderator-ID und Moderatorname).
  - Autorreferenzen sind nullable und werden bei Kontolöschung auf null gesetzt. Die Anzeige ist dann „Gelöschter Siedler“.
  - Indizes für Themenliste (Board, wichtig, letzte Aktivität), Beitragsseiten (Thema, Erstellzeit, ID) und die drei zuletzt aktiven Themen je Allianz.
  - Datenbankseitige Längenprüfungen spiegeln die fachlichen Obergrenzen.
- **Allianzchronik:** eine Tabelle mit Allianzreferenz und Kaskade bei Auflösung, Ereignistyp, Akteur-ID und Akteurname zum Ereigniszeitpunkt, betroffener Spieler-ID und Name zum Ereigniszeitpunkt, Zeitpunkt sowie kleinen strukturierten Metadaten als JSON. Akteur- und Betroffenenreferenzen werden bei Kontolöschung auf null gesetzt, die festgehaltenen Namen bleiben. Index für Allianz, Zeitpunkt absteigend, ID.
- **Ratenbegrenzung:** Die vorhandene dauerhafte Ratenbegrenzungstabelle wird mit neuen Befehlswerten wiederverwendet. Eine Schemaänderung ist nur nötig, falls die Befehlslänge nicht reicht.

### Letzte Aktivität

- Jede authentifizierte API-Anfrage aktualisiert den Zeitstempel der letzten Aktivität des Spielers, höchstens einmal alle fünf Minuten je Spieler. Die Drosselung erfolgt über eine bedingte Aktualisierung in der Datenbank, damit sie instanzübergreifend wirkt.
- Fehler der Aktualisierung lassen die eigentliche Anfrage nie scheitern.
- Spieler ohne erfassten Zeitstempel erscheinen als „unbekannt“.
- Der Zeitstempel ist die Grundlage der automatischen Präsidentennachfolge der nächsten Etappe.

### Online-Status

- Die Allianzdetailansicht liefert den Online-Status je Mitglied nur, wenn der Betrachter aktuell Mitglied derselben Allianz ist. Für alle anderen Betrachter fehlt das Feld vollständig in der Antwort.
- Quelle ist die vorhandene Liste verbundener Spieler des Websocket-Gateways. Es entstehen keine neuen Kanäle oder Ereignistypen. Der Status wird beim Laden der Seite ermittelt.

### Allianzforum: Regeln

- **Grenzen** (Unicode-Zeichen nach Trim):
  - Boardname 5–80, höchstens 50 nicht gelöschte Boards je Allianz.
  - Thementitel 1–120.
  - Beitrag 1–20.000.
- **Darstellung:** 20 Beiträge je Seite, chronologisch. Themen zuerst wichtig, dann nach letzter Aktivität absteigend. Themenlisten sind ebenfalls paginiert. Texte werden ausschließlich mit dem vorhandenen sicheren BBCode-Renderer dargestellt. Board- und Thementitel sind reiner Text.
- **Anlegen eines Themas:** Titel und erster Beitrag entstehen atomar. Letzte Aktivität von Thema und Board wird gesetzt.
- **Antworten:** setzt die letzte Aktivität von Thema und Board. Antworten in gelöschten Themen oder Boards sind nicht möglich.
- **Bearbeiten:** nur der Autor, nur solange er aktuelles Mitglied ist, nur nicht gelöschte Beiträge. Setzt den Bearbeitungszeitpunkt, ändert aber nicht die letzte Aktivität des Themas. Moderatoren können fremde Beiträge nicht inhaltlich bearbeiten.
- **Autoren löschen nicht selbst.** Löschen ist ausschließlich Moderation durch Präsident oder Vize.
- **Weiche Löschung:**
  - Ein gelöschter Beitrag bleibt in der Abfolge mit Autor, Zeitpunkt, Moderator und Moderationszeit. Sein Text wird nicht mehr ausgeliefert. Der Text wird beim Löschen in der Datenbank geleert.
  - Ein gelöschtes Thema oder Board verschwindet aus allen Listen und wird bei direktem Aufruf wie nicht vorhanden behandelt. Das gilt auch für alle darunterliegenden Inhalte. Moderator und Zeitpunkt werden erfasst. Die Texte darunterliegender Beiträge werden ebenfalls geleert.
  - Gelöschte Boards zählen nicht zum Limit von 50.
  - Eine Wiederherstellung gibt es nicht.
- Leere Themen und Boards werden nie automatisch gelöscht.
- **Wichtig-Markierung** setzen und entfernen sowie Umbenennen von Boards und Themen: nur Präsident und Vize.
- **Autorisierung:** Jede Anfrage lädt das Zielobjekt und prüft serverseitig, dass es zur aktuellen Allianz des Anfragenden gehört und nicht gelöscht ist. Fremde, gelöschte und nicht existierende Objekte liefern einheitlich Not Found, damit IDs fremder Allianzen nicht erkundet werden können. Fehlende Rechte bei eigenen Objekten liefern Forbidden.
- **Konkurrenz:** Schreibaktionen sperren das betroffene Thema beziehungsweise Board in der Transaktion. Ein gleichzeitig gelöschtes Thema erhält keinen neuen Beitrag mehr. Das Board-Limit wird unter Sperre der Allianz geprüft.
- **Ratenbegrenzung:** Die vorhandene dauerhafte Ratenbegrenzung des Moduls wird zu einer allgemeinen Allianz-Ratenbegrenzung verallgemeinert. Sie erhält Forumsbefehle für Thema anlegen, Beitrag schreiben und Bearbeiten. Die Grenzwerte sind konfigurierbare Konstanten. Die Fehlermeldung ist deutsch und nennt keine internen Werte.
- Forumsaktionen erzeugen keine Systemnachrichten und keine Chronikeinträge.

### Allianzforum: API

Alle Routen sind authentifiziert und hängen am Allianz-Controller unterhalb der Allianz-ID:

- Boards auflisten; Board anlegen, umbenennen, löschen.
- Themen eines Boards paginiert auflisten; Thema anlegen.
- Beiträge eines Themas paginiert lesen; Thema umbenennen, als wichtig markieren oder Markierung entfernen, löschen.
- Beitrag schreiben, bearbeiten, löschen.
- Die drei zuletzt aktiven Themen der eigenen Allianz liefert der Dashboard-Dienst. Für allianzlose Spieler ist die Liste leer.

Die Allianz-ID im Pfad muss der aktuellen Allianz des Anfragenden entsprechen. Andernfalls antwortet der Server mit Not Found.

Antworten tragen servergelieferte Fähigkeiten:

- auf Forumsebene: Boards verwalten,
- je Thema: umbenennen, Markierung ändern, löschen,
- je Beitrag: bearbeiten, löschen.

Das Frontend leitet keine Rechte selbst ab.

Alle Forums-DTOs und Anfragen liegen in `packages/shared`.

### Mitgliederübersicht

- **Route:** eine authentifizierte Route unter der Allianz-ID liefert die Übersicht aller aktuellen Mitglieder. Eine zweite Route liefert den Lagerbestand einer einzelnen Mitgliedskolonie. Beide verlangen `viewMemberOperations` in genau dieser Allianz.
- **Je Mitglied:**
  - Spieler-ID, Name, Fraktion, Amt mit Titel,
  - letzte Aktivität,
  - Crew-Auslastung als eingesetzte Crew und globales Crewlimit,
  - Kolonien mit ID, Name, Standort (System und Position), Energie und Maximalenergie, Lagerbelegung und Lagerkapazität sowie Bevölkerung und Maximalbevölkerung,
  - Schiffe gruppiert nach Schiffsklasse, je Schiff ID, Name und aufgelöster Standort.
- **Lagerbestand einer Kolonie:** Warenarten und Mengen. Die Kolonie muss einem aktuellen Mitglied der Allianz gehören, sonst Not Found.
- Stationen gibt es in SWU nicht als spielereigene Objekte. Die Gruppierung nach Klasse umfasst daher nur Schiffe. Sobald spielereigene Stationen existieren, erscheinen sie in derselben Gruppierung (Integrationspunkt in der Dokumentation der Beziehungswirkungen nachführen).
- Zerstörte Schiffe und aufgegebene Kolonien fehlen.
- **Ausgeschlossen:** private Nachrichten, persönliche Notizen, Zugangsdaten, E-Mail, Admininformationen, Fracht, Module, Logbücher, Scanergebnisse, Forschungsstand und Kolonieoberflächen.
- Die Übersicht wird bei jeder Anfrage neu aus der aktuellen Mitgliedschaft abgeleitet und nicht gespeichert. Die Daten aller Mitglieder werden gebündelt geladen, nicht einmal je Mitglied.
- Statusdetails von Allianzschiffen (Status, Alarmstufe, Hülle, Crew) liefert weiterhin die Sternenkarte der Allianz-Infrastruktur. Die Mitgliederübersicht dupliziert sie nicht.
- Die DTOs liegen in `packages/shared`.

### Allianzchronik

- **Ereignistypen dieser Etappe:**
  - `FOUNDED`: Akteur = Gründer.
  - `MEMBER_JOINED`: Akteur = annehmender Verantwortlicher, Betroffener = neues Mitglied.
  - `MEMBER_LEFT`: Akteur = Betroffener.
  - `MEMBER_KICKED`: Akteur = handelnder Verantwortlicher, Betroffener = entferntes Mitglied.
  - `ROLE_CHANGED`: Metadaten altes und neues Amt; Ernennung und Absetzung.
  - `PRESIDENCY_TRANSFERRED`: Akteur = bisheriger Präsident, Betroffener = neuer Präsident.
  - `DETAILS_CHANGED`: Metadaten = Liste der geänderten Felder, bei Namensänderung zusätzlich alter und neuer Name.
- Bewerbungen, abgelehnte Bewerbungen und Forumsaktionen sind keine Chronikereignisse. Eine Detailänderung ohne tatsächliche Änderung erzeugt keinen Eintrag.
- Der Chronikeintrag entsteht in derselben Transaktion wie die auslösende Änderung. Scheitert er, scheitert die Aktion.
- Die Beschreibung, das Vertragswerk und Amtstitel-Texte werden nicht kopiert. Bei Amtstiteln wird nur festgehalten, dass sie geändert wurden.
- Die automatische Präsidentennachfolge und Banneränderungen werden in der nächsten Etappe als weitere Ereignistypen ergänzt. Das Typenset ist dafür offen erweiterbar.
- **Lesen:** paginiert mit Cursor, neueste zuerst, Seitengröße wie bei der Diplomatie-Chronik. Nur aktuelle Mitglieder der Allianz; alle anderen erhalten Not Found.
- Es gibt keine Route zum Ändern oder Löschen von Einträgen.
- DTOs und Ereignistypen liegen in `packages/shared`, getrennt von den Typen der Diplomatie-Chronik.

### Fähigkeiten in der Detailansicht

- Die servergelieferten Betrachteraktionen der Allianzdetailansicht erhalten:
  - Forum lesen,
  - Chronik lesen,
  - Mitgliederübersicht öffnen.
- Die Oberfläche zeigt die zugehörigen Einstiege nur bei gesetzter Fähigkeit.
- Diese Etappe führt keinen Fähigkeitsschalter ein. Gemäß der Nutzerentscheidung vom 2026-10-09 sind Allianzfunktionen immer aktiv, weil die Pipeline Migrationen stets vor dem Code ausrollt.

### Frontend

- **Neue Seiten unter dem Allianzpfad:** Forum (Boardliste), Board (Themenliste), Thema (Beiträge mit Paginierung, Antwortformular), Mitgliederübersicht, Allianzchronik.
- Die Allianzdetailseite verlinkt Forum und Chronik für Mitglieder und die Mitgliederübersicht für Präsident und Vize. Sie zeigt den Online-Status nur, wenn der Server ihn liefert.
- **Beitragsdarstellung:**
  - mit Autor oder „Gelöschter Siedler“, Fraktion, Amtstitel, Zeitpunkt und „zuletzt bearbeitet“,
  - gelöschte Beiträge als Hinweis mit Moderator und Zeitpunkt,
  - Profil- und Nachrichtenlink zum Autor, solange das Konto existiert.
- Bearbeiten erfolgt inline mit demselben Editor wie das Antworten.
- Moderationsaktionen fragen vor dem Löschen nach einer Bestätigung.
- Das Dashboard zeigt einen Abschnitt mit den drei zuletzt aktiven Themen, nur für Allianzmitglieder.
- Die Mitgliederübersicht zeigt je Mitglied eine aufklappbare Zeile mit Kolonien, Schiffsgruppen und Crew-Auslastung. Der Lagerbestand einer Kolonie wird erst beim Aufklappen geladen.
- Das Frontend zeigt ausschließlich, was der Server liefert, und blendet Aktionen anhand der gelieferten Fähigkeiten ein.

### Bestehende Lebenszyklus-Aktionen

- Gründung, Bewerbungsannahme, Austritt, Rauswurf, Amtswechsel, Präsidentschaftsübergabe und Detailänderung schreiben ihren Chronikeintrag in ihrer bestehenden Transaktion.
- Verhalten, Rechte und Systemnachrichten dieser Aktionen ändern sich nicht.

## Testing Decisions

- Gute Tests prüfen nur beobachtbares Verhalten über die öffentliche Schnittstelle: welche Antworten, Fehler, Fähigkeiten und Chronikeinträge ein Akteur erhält und was die Oberfläche daraus zeigt. Sie prüfen keine Store-Aufrufreihenfolgen, keine ORM-Abfragen und keine privaten Methoden.
- **Backend-Seams** (mit dem Nutzer am 2026-10-09 bestätigt), getestet nach dem Muster von `alliance.service.spec` mit dem In-Memory-Store:
  - **Forumsdienst:**
    - Lesen, Anlegen und Antworten durch jedes Mitglied.
    - Bearbeiten nur durch den Autor.
    - Moderation nur durch Präsident und Vize; Diplomat und Mitglied ohne Amt erhalten Forbidden.
    - Nichtmitglieder und fremde Allianzen erhalten Not Found, auch bei geratenen IDs.
    - Sofortiger Zugriffsverlust nach Austritt, Rauswurf und Amtsverlust.
    - Weiche Löschung liefert Autor, Zeitpunkt und Moderator, aber keinen Text.
    - Gelöschte Themen und Boards verschwinden mit ihrem Inhalt.
    - Längengrenzen nach Trim mit Unicode-Zeichen, darunter Emoji und kombinierende Zeichen.
    - Board-Limit 50.
    - Sortierung (wichtig, letzte Aktivität) und Paginierung (20 je Seite).
    - „Gelöschter Siedler“ bei fehlendem Autor.
    - Ratenbegrenzung.
    - Die drei zuletzt aktiven Themen.
  - **Mitgliederübersichtsdienst** mit einer Testimplementierung des Lese-Ports:
    - Präsident und Vize erhalten die Übersicht; Diplomat, Mitglied ohne Amt, Nichtmitglied und Mitglied einer anderen Allianz nicht.
    - Nur aktuelle Mitglieder erscheinen.
    - Ausgeschlossene Daten tauchen nicht in der Antwort auf.
    - Der Lagerbestand fremder Kolonien liefert Not Found.
    - Zerstörte Schiffe und aufgegebene Kolonien fehlen.
  - **`AllianceService`:**
    - Jede Lebenszyklus-Aktion erzeugt genau den erwarteten Chronikeintrag mit Akteur, Betroffenem, Namen zum Ereigniszeitpunkt und Metadaten.
    - Detailänderungen ohne Änderung erzeugen keinen Eintrag.
    - Eine scheiternde Aktion hinterlässt keinen Eintrag.
    - Lesen ist nur für aktuelle Mitglieder möglich, mit Cursor-Paginierung neueste zuerst.
    - Der Online-Status erscheint nur für Mitglieder.
  - Die Rechtematrix-Tests werden um `moderateForum` und `viewMemberOperations` ergänzt.
- **Letzte Aktivität:** Tests der Aktualisierung über die öffentliche Seam des Mechanismus prüfen:
  - Eine Anfrage setzt den Zeitstempel.
  - Eine weitere Anfrage innerhalb von fünf Minuten ändert ihn nicht.
  - Ein Fehler lässt die Anfrage nicht scheitern.
- **Postgres-Integrationstests** nach dem Muster von `alliance.int-spec` und `starmap-visibility.int-spec`:
  - Kaskaden bei Auflösung entfernen Forum und Allianzchronik vollständig, die Diplomatie-Chronik bleibt.
  - Kontolöschung setzt Autor- und Akteurreferenzen auf null, die festgehaltenen Namen bleiben.
  - Datenbankseitige Längenprüfungen greifen.
  - Ein gleichzeitig gelöschtes Thema erhält keinen neuen Beitrag.
  - Das Board-Limit hält bei gleichzeitigem Anlegen.
  - Die bedingte Aktivitätsaktualisierung drosselt instanzübergreifend.
  - Die Lese-Port-Implementierung liefert korrekte Kolonie-, Schiffs-, Crew- und Lagerdaten für mehrere Spieler gebündelt.
- **Migrationstests** für jede neue Migration nach dem vorhandenen Muster.
- **Controller-Autorisierungstests** senden direkte Requests als Präsident, Vize, Diplomat, Mitglied ohne Amt, allianzloser Spieler und Mitglied einer anderen Allianz. Sie verwenden manipulierte IDs in Pfad und Body. Ein ausgeblendeter Button gilt nie als ausreichender Test.
- **Frontend-Seam:** die Allianzseiten mit gemockter API nach dem Muster von `alliances.spec`. Die Fälle:
  - Forum-, Board- und Themenansicht zeigen Daten und Paginierung.
  - Aktionen erscheinen nur bei gelieferten Fähigkeiten.
  - Gelöschte Beiträge erscheinen als Hinweis.
  - „Gelöschter Siedler“ wird angezeigt.
  - Validierungsfehler des Servers werden angezeigt.
  - Mitgliederübersicht mit nachgeladenem Lagerbestand.
  - Chronik mit Nachladen älterer Einträge.
  - Online-Status nur bei geliefertem Feld.
  - Der Dashboard-Abschnitt erscheint nur für Mitglieder.

## Out of Scope

- **Für die Etappe „Lebenszyklus und Restparität“:**
  - Banner, Asset-Schnittstelle und `$ALLIANCE_BANNER`.
  - Automatische Präsidentennachfolge und Kontolöschung mit Nachfolge.
  - Vollständige Auflösungs- und Reset-Bereinigung einschließlich wiederholbarer Post-Commit-Schritte.
  - Allianzdepots.
  - Die Chronikereignisse für Nachfolge und Banner.
- Export oder Archivierung des Forums.
- Ungelesen-Markierungen, Benachrichtigungen über neue Beiträge, Abonnements, Suche, Anhänge, Umfragen und Zitieren mit Verweis.
- Bearbeiten fremder Beiträge durch Moderatoren, Wiederherstellen gelöschter Inhalte und Verschieben von Themen zwischen Boards.
- Ein Löschen eigener Beiträge durch Autoren.
- Feste Gesamtgrenzen für Themen oder Beiträge.
- Kolonieoberflächen, Schild-, Effekt- und Sozialwerte der STU-Kolonieansicht, soweit sie über Energie, Lager und Bevölkerung hinausgehen.
- Fracht, Module und Logbücher von Mitgliedsschiffen.
- Spielereigene Stationen in der Mitgliederübersicht, solange es sie in SWU nicht gibt.
- Live-Aktualisierung von Online-Status, Forum oder Chronik über Websockets.
- Konfigurierbare Rechte oder zusätzliche Ämter (ADR 0001).
- Bekannte STU-Bugs: reine UI-Rechte im Forum (§11.9), fehlender Autorencheck beim Bearbeiten, ungefilterte Board- und Themennamen sowie die automatische Themenlöschung beim Löschen des letzten Beitrags.

## Further Notes

- Diese Spezifikation ist die Etappe „Interne Zusammenarbeit“ aus `.scratch/alliance-stu-parity/map.md`. Sie setzt Kern, Diplomatie-Kern, Beziehungswirkungen und Allianz-Infrastruktur voraus.
- **Grundlagen:**
  - Entscheidung „Ämter und Diplomatierechte“ (03),
  - Entscheidung „Mitgliederdaten und Allianzforum“ (08),
  - Entscheidung „Diplomatie-Chronik und Allianzchronik“ (10),
  - Entscheidung „Grenzwerte, Benachrichtigungen und Auslieferung“ (13).
- Der Etappenschnitt wurde am 2026-10-09 mit dem Nutzer bestätigt: Banner und Nachfolge gehören zur nächsten Etappe. Ebenso bestätigt wurden die Test-Seams: Forumsdienst, Mitgliederübersichtsdienst und `AllianceService` gegen den In-Memory-Store, echte Postgres-Tests sowie die Allianzseiten mit gemockter API.
- **Selbst getroffene Detailentscheidungen** innerhalb der Produktgrenze von Entscheidung 08:
  - Moderatoren löschen, schreiben aber nicht um.
  - Autoren löschen nicht selbst.
  - Gelöschte Themen und Boards verschwinden vollständig.
  - Gelöschte Texte werden auch in der Datenbank geleert.
  - Fremde Objekte liefern einheitlich Not Found.
- Die letzte Aktivität wird neu erfasst, weil `lastActiveTick` nie geschrieben wird. Die nächste Etappe verwendet sie für „zuletzt aktiv“ in der Nachfolgereihenfolge. Bis zur ersten Anfrage nach der Auslieferung ist der Wert leer. Die Nachfolge-Etappe muss leere Werte als älteste Aktivität behandeln. STU-Bug §11.4, die Auflösung bei durchgehend leerer Aktivität, wird nicht übernommen.
- Der Online-Status ist STU-Parität: In STU sehen nur Mitglieder den Online-Status auf der Allianzseite.
- ADR 0001 bleibt bindend. Die Rechte folgen den drei festen Ämtern. „Allianz“ bezeichnet ausschließlich einen Spielerzusammenschluss.
