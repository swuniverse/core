# Allianzen – Etappe 1: Kern

Status: ready-for-agent

Bezug: `CONTEXT.md` (Begriffe), `docs/adr/0001-allianzen-abweichungen-von-stu.md` (lokal), STU-Referenz `.scratch/alliance/stu-alliance-research.md`.

## Problem Statement

Spieler in swuniverse können sich bisher nicht zu Gruppen zusammenschließen. Wer mit anderen Spielern seiner **Fraktion** zusammen spielen will, hat dafür im Spiel keine Struktur. Es gibt keine gemeinsame Identität, keinen Aufnahmeprozess, keine Verwaltung und keine Sichtbarkeit nach außen. Aus STU kennen die Spieler Allianzen als zentrales soziales Element, in swuniverse fehlen sie ganz.

## Solution

Spieler können eine **Allianz** gründen, die an ihre **Fraktion** gebunden ist. Andere Spieler derselben Fraktion bewerben sich, **Präsident** oder **Vize** nehmen sie auf oder lehnen ab. Die Allianz hat feste **Ämter** (Präsident, Vize, Diplomat), deren angezeigte Titel sie selbst umbenennen kann. Sie hat eine öffentliche Detailseite mit BBCode-Beschreibung, Mitgliederliste, Homepage und Farbe. Alle Allianzen beider Fraktionen stehen in einer öffentlichen Liste. Der Allianzname erscheint im Spielerprofil und in der Kopfzeile. Wichtige Ereignisse lösen Systemnachrichten aus. Das Verhalten folgt STU. Bewusste Abweichungen stehen in ADR 0001, bekannte STU-Bugs werden nicht übernommen.

## User Stories

### Gründung
1. Als allianzloser Spieler möchte ich eine Allianz mit Name und Beschreibung gründen, damit ich eine Gruppe für meine Mitspieler schaffe.
2. Als Gründer möchte ich automatisch Präsident der neuen Allianz werden, damit sie von Anfang an verwaltet wird.
3. Als Gründer möchte ich, dass die Allianz automatisch meine Fraktion erhält, damit klar ist, für welche Seite sie steht.
4. Als Spieler möchte ich keine zweite Allianz gründen können, solange ich Mitglied einer Allianz bin, damit ich nie in zwei Allianzen gleichzeitig bin.
5. Als Spieler möchte ich eine verständliche Fehlermeldung, wenn der Name zu kurz (unter 5), zu lang (über 40) oder schon vergeben ist (ohne Rücksicht auf Groß- und Kleinschreibung), damit ich ihn korrigieren kann.
6. Als Gründer möchte ich, dass meine offenen Bewerbungen bei anderen Allianzen mit der Gründung verfallen, damit niemand mich versehentlich aufnimmt.
7. Als Gründer möchte ich, dass meine neue Allianz zunächst keine Bewerbungen annimmt, damit ich sie erst einrichten kann.
8. Als Spieler ohne gewählte Fraktion möchte ich keine Allianz gründen können, weil die Allianz eine Fraktion braucht.

### Liste und Detailseite
9. Als Spieler möchte ich eine Liste aller Allianzen beider Fraktionen mit Fraktion, Mitgliederzahl und Bewerbungsstatus sehen, damit ich weiß, wer im Spiel unterwegs ist.
10. Als Spieler möchte ich die Detailseite jeder Allianz öffnen können, damit ich Beschreibung, Homepage, Gründungsdatum und Fraktion lesen kann.
11. Als Spieler möchte ich auf der Detailseite alle Mitglieder mit ihren Ämtern sehen, damit ich weiß, wen ich ansprechen kann.
12. Als Spieler möchte ich, dass die Ämter mit den Titeln angezeigt werden, die die Allianz gewählt hat, damit die Allianz ihr eigenes Flair hat.
13. Als Leser möchte ich die Beschreibung mit BBCode-Formatierung sehen, damit Allianzen sich ansprechend präsentieren können.
14. Als Leser möchte ich, dass die Platzhalter `$ALLIANCE_PRESIDENT`, `$ALLIANCE_VICEPRESIDENT`, `$ALLIANCE_FOREIGNMINISTER` und `$ALLIANCE_HOMEPAGE_LINK` in der Beschreibung durch aktuelle Werte ersetzt werden, damit die Beschreibung nicht veraltet.
15. Als Leser möchte ich, dass unbesetzte Ämter in Platzhaltern als „Unbesetzt“ erscheinen und unbekannte `$ALLIANCE_*`-Platzhalter entfernt werden, wie in STU.
16. Als Spieler möchte ich die Allianzfarbe auf der Detailseite und in der Liste sehen, damit ich Allianzen wiedererkenne.

### Bewerbung
17. Als allianzloser Spieler möchte ich mich bei einer Allianz meiner Fraktion bewerben, die Bewerbungen annimmt, damit ich beitreten kann.
18. Als Spieler möchte ich mich gleichzeitig bei mehreren Allianzen bewerben können, damit ich nicht auf eine Antwort warten muss.
19. Als Spieler möchte ich mich bei derselben Allianz nicht doppelt bewerben können.
20. Als Spieler möchte ich mich nicht bei einer Allianz der anderen Fraktion bewerben können, und der Bewerben-Button soll dort gar nicht erscheinen.
21. Als Spieler möchte ich meine offene Bewerbung zurückziehen können, damit ich meine Meinung ändern kann.
22. Als Präsident oder Vize möchte ich bei einer neuen Bewerbung eine Systemnachricht bekommen, damit ich zeitnah reagieren kann.
23. Als Präsident oder Vize möchte ich die offenen Bewerbungen meiner Allianz, älteste zuerst, sehen.
24. Als Präsident oder Vize möchte ich eine Bewerbung annehmen, damit der Bewerber Mitglied wird.
25. Als Präsident oder Vize möchte ich eine Bewerbung ablehnen, damit der Bewerber Bescheid weiß.
26. Als Bewerber möchte ich bei Annahme oder Ablehnung eine Systemnachricht bekommen.
27. Als Bewerber möchte ich, dass alle meine anderen offenen Bewerbungen bei meiner Aufnahme verfallen, und deren Präsident und Vizes sollen darüber informiert werden.
28. Als Präsident oder Vize möchte ich, dass eine Annahme scheitert, wenn der Bewerber inzwischen woanders Mitglied ist, damit niemand in zwei Allianzen landet.
29. Als Präsident oder Vize möchte ich Bewerbungen ein- und ausschalten. Beim Ausschalten werden alle offenen Bewerbungen mit Nachricht abgelehnt, wie in STU.

### Mitgliedschaft
30. Als Mitglied ohne Präsidentenamt möchte ich die Allianz verlassen können.
31. Als Präsident oder Vize möchte ich beim Austritt eines Mitglieds eine Systemnachricht bekommen.
32. Als Präsident möchte ich nur austreten können, nachdem ich das Präsidentenamt übergeben habe, damit die Allianz nie ohne Präsidenten ist.
33. Als Präsident und letztes Mitglied möchte ich beim Austritt die Allianz damit auflösen, damit keine leere Allianz zurückbleibt.
34. Als Präsident möchte ich jedes andere Mitglied rauswerfen können.
35. Als Vize möchte ich Mitglieder ohne Amt und Diplomaten rauswerfen können, aber weder andere Vizes noch den Präsidenten.
36. Als Mitglied möchte ich mich nicht selbst rauswerfen können, dafür gibt es den Austritt.
37. Als rausgeworfenes Mitglied möchte ich eine Systemnachricht bekommen.

### Ämter
38. Als Präsident möchte ich Mitglieder zu Vize oder Diplomat ernennen und ihnen das Amt wieder entziehen.
39. Als Vize möchte ich Mitglieder zum Diplomaten ernennen und Diplomaten absetzen, aber keine Vizes ernennen oder absetzen.
40. Als ernanntes oder abgesetztes Mitglied möchte ich eine Systemnachricht bekommen.
41. Als Mitglied habe ich höchstens ein Amt. Eine neue Ernennung ersetzt mein bisheriges Amt.
42. Als Präsident möchte ich das Präsidentenamt an ein anderes Mitglied übergeben. Ich werde danach Mitglied ohne Amt.
43. Als neuer Präsident möchte ich über die Übergabe eine Systemnachricht bekommen.
44. Als Präsident oder Vize möchte ich die angezeigten Titel der drei Ämter umbenennen (3–30 Zeichen), etwa „Großadmiral“ statt „Präsident“.
45. Als Diplomat habe ich in dieser Etappe keine Verwaltungsrechte. Mein Amt wird aber angezeigt.

### Details bearbeiten
46. Als Präsident oder Vize möchte ich Name, Beschreibung, Homepage und Farbe ändern.
47. Als Bearbeiter möchte ich Fehlermeldungen bei ungültigen Eingaben: Name 5–40 Zeichen und eindeutig, Beschreibung höchstens 10.000 Zeichen, Homepage leer oder mit `http://` bzw. `https://`, Farbe leer oder `#rrggbb`.
48. Als Bearbeiter möchte ich, dass bei einem Validierungsfehler gar nichts gespeichert wird, auch nicht die Einstellung zu Bewerbungen (STU-Bug §11.7 nicht übernehmen).
49. Als Bearbeiter möchte ich die Farbe wieder löschen können (STU-Bug: dort nicht möglich).

### Auflösung
50. Als Präsident möchte ich die Allianz nach einer Bestätigung auflösen.
51. Als Mitglied möchte ich bei der Auflösung eine Systemnachricht bekommen.
52. Als ehemaliges Mitglied möchte ich nach der Auflösung allianzlos sein. Alle offenen Bewerbungen an die Allianz verfallen.
53. Als Vize möchte ich die Allianz nicht auflösen können.

### Sichtbarkeit im Spiel
54. Als Spieler möchte ich im Spielerprofil anderer Spieler deren Allianz (mit Link) sehen.
55. Als Mitglied möchte ich meine Allianz in der Kopfzeile sehen, mit Link zur Allianzseite.
56. Als allianzloser Spieler möchte ich in der Navigation einen Einstieg zur Allianzliste und zum Gründen finden.

### Sicherheit
57. Als Spieler möchte ich, dass alle Rechte auf dem Server geprüft werden und nicht nur in der Oberfläche, damit niemand per direktem Request Aktionen ausführen kann, die ihm nicht zustehen.
58. Als Spieler möchte ich, dass eingegebener Text (Name, Titel, Beschreibung) kein HTML ausführt, damit die Detailseite sicher ist.

## Implementation Decisions

- **Neues Backend-Modul `alliance`** mit Service, Controller (JWT-geschützt wie die übrigen Module), Entities und Migration. Der `AllianceService` ist die einzige Schnittstelle, über die Allianz-Regeln laufen. Controller sind dünn.
- **Datenmodell** (neue Tabellen):
  - Allianz: id, Name, Beschreibung, Homepage, Farbe (nullable), Fraktion (Pflicht, FK), Gründungszeitpunkt, „nimmt Bewerbungen an“ (Default false), angezeigte Titel für die drei Ämter (Defaults „Präsident“, „Vize-Präsident“, „Diplomat“).
  - Mitgliedschaft: Allianz, Spieler (eindeutig, also höchstens eine Allianz pro Spieler), Amt (enum: keins, Präsident, Vize, Diplomat), Beitrittszeitpunkt.
  - Bewerbung: Allianz, Spieler, Zeitpunkt; eindeutig pro (Allianz, Spieler).
- **Datenbank-Constraints**:
  - eindeutiger Index auf `lower(name)`,
  - eindeutiger Index auf den Spieler in der Mitgliedschaft,
  - partieller eindeutiger Index „ein Präsident pro Allianz“,
  - Cascade-Delete von Mitgliedschaften und Bewerbungen beim Löschen der Allianz.
  Die Constraints sind die letzte Verteidigungslinie bei gleichzeitigen Anfragen. Der Service übersetzt Verletzungen in fachliche Fehler.
- **Mitgliedschaft als eigene Tabelle** und nicht als Spalte am Spieler. So bleibt das Amt bei der Mitgliedschaft, und die User-Entity wird nicht weiter aufgebläht.
- **Rechteprüfung** zentral im Service über eine reine Funktion „darf Akteur mit Amt X Aktion Y auf Ziel mit Amt Z“. Matrix:
  - Präsident: alles. Er kann sich selbst nicht rauswerfen und nicht austreten, solange andere Mitglieder da sind.
  - Vize: Bewerbungen, Details, Titel, Bewerbungsschalter; Rauswurf, Ernennung zum Diplomaten und Absetzen nur bei Mitgliedern ohne Amt und bei Diplomaten.
  - Diplomat und Mitglied: keine Verwaltungsrechte.
  - Auflösung und Übergabe: nur der Präsident.
- **Transaktionen**: Annahme (Mitgliedschaft anlegen, andere Bewerbungen löschen), Gründung (Allianz, Mitgliedschaft als Präsident, eigene Bewerbungen löschen), Übergabe, Austritt des letzten Mitglieds und Auflösung laufen je in einer Transaktion. Systemnachrichten werden erst nach dem Commit verschickt.
- **Systemnachrichten** über den bestehenden Messaging-Service (`sendSystem`). Empfänger wie in STU:
  - Bewerbung und Austritt → Präsident und alle Vizes,
  - Annahme, Ablehnung, Rauswurf, Ernennung, Absetzung, Übergabe → der Betroffene,
  - Auflösung → alle Mitglieder,
  - verfallene Bewerbung durch Aufnahme anderswo → Präsident und Vizes der anderen Allianz.
  - Zurückgezogene Bewerbungen lösen keine Nachricht aus.
  - Die Texte sind deutsch und folgen den STU-Formulierungen aus der Recherche.
- **Beschreibung**: gespeichert wird roher Text mit BBCode. Platzhalter werden serverseitig beim Lesen der Detailseite ersetzt, das BBCode-Rendering übernimmt die bestehende Frontend-Komponente. HTML wird nicht gerendert.
- **API-Verträge** (DTOs im Shared-Paket):
  - Allianz-Liste (Zusammenfassung pro Allianz), Allianz-Detail (inkl. Mitglieder mit Amt und Titel, gerenderte Beschreibung), eigene Allianz-Sicht (inkl. eigenem Amt und erlaubten Aktionen), Bewerbungsliste.
  - Endpunkte für alle Aktionen aus den User Stories.
  - Fehler als Bad-Request oder Forbidden mit deutscher, fachlicher Meldung.
- **Erlaubte Aktionen** liefert der Server mit, z. B. „darf rauswerfen“ pro Mitglied. Das Frontend blendet Buttons danach ein und leitet die Rechte nicht selbst ab.
- **Header-Status-DTO und Spielerprofil** werden um eine optionale Allianz-Referenz (id, Name, Farbe) erweitert.
- **Frontend**: neue Seiten für Allianzliste, Allianz-Detail, Gründen, Bearbeiten (Details und Amtstitel) und Verwaltung (Mitglieder, Ämter, Bewerbungen). Dazu ein Eintrag in Sidebar und Bottom-Nav. Gestaltung im bestehenden STU-nahen Stil der übrigen Seiten.
- **Fraktion des Gründers** ist Pflicht und nach dem Onboarding unveränderlich. Die Fraktion der Allianz ist darum nach der Gründung fest und nicht editierbar.

## Testing Decisions

- **Was einen guten Test ausmacht**: Er prüft nur nach außen sichtbares Verhalten, also Rückgaben, geworfene fachliche Fehler, gesendete Systemnachrichten und den beobachtbaren Zustand danach. Wie das intern zustande kommt, wird nicht geprüft. Keine Assertions auf interne Hilfsfunktionen oder Aufrufreihenfolgen von Repositories.
- **Teststelle 1, `AllianceService` (Unit, Jest)**: deckt jede User Story mit Regel ab, besonders die Rechte-Matrix (jede Kombination aus Akteur-Amt, Aktion und Ziel-Amt), Fraktionsprüfung, Austritt des Präsidenten, letztes Mitglied, verfallende Bewerbungen, Validierung ohne Teil-Speicherung und Platzhalter-Ersetzung. Repositories und Messaging sind gemockt. Vorbild sind die bestehenden Service-Specs von Holonet und Kolonisierung.
- **Teststelle 2, Datenbank-Integration (neu)**: eine kleine Suite gegen echtes Postgres 16 (gleiche Version wie in docker-compose). Sie führt die Migration aus und prüft die Constraints: eindeutiger Name ohne Rücksicht auf Groß- und Kleinschreibung, ein Spieler in höchstens einer Allianz, ein Präsident pro Allianz, Cascade beim Auflösen und zwei gleichzeitige Annahmen desselben Bewerbers. Für so eine Suite gibt es im Repo noch kein Muster. Sie wird als eigenes Jest-Target eingerichtet und läuft nicht im normalen `test`-Target, damit Unit-Tests ohne Datenbank laufen. Die Datenbank kommt bevorzugt aus Testcontainers, sonst aus der Dev-Postgres über eine Umgebungsvariable.
- **Teststelle 3, Frontend-Seiten (Vitest)**: Komponententests mit gemockter API für Liste, Detail, Verwaltung und Gründen. Sie prüfen, dass Buttons gemäß den vom Server gelieferten erlaubten Aktionen erscheinen, dass Fehlermeldungen angezeigt werden und dass der Bewerben-Button bei fremder Fraktion fehlt. Vorbild sind die Specs von Holonet, Spielerprofil und Header.
- **Migration**: Ein Test im Stil der bestehenden Migration-Tests (aufzeichnender QueryRunner) prüft, dass Tabellen und Indizes angelegt werden.

## Out of Scope

- Diplomatie zwischen Allianzen (Krieg, Frieden, Freundschaft, Bündnis, Handel, Vasall), Vertragstexte, Diplomatie-Graph, Platzhalter `$ALLIANCE_DIPLOMATIC_RELATIONS`, Rechte des Diplomaten
- Abkommen zwischen Allianz und Siedlern
- Allianzforum
- Auswirkungen von **Freund**, **Feind** und **Neutral** auf Kampf, Alarm, Transfer, Docking, Scans usw.
- Allianzfarbe oder Territorium auf der Sternenkarte, Live-Positionen
- Allianz-Depots, Verwaltungsansichten für Kolonien, Schiffe und Crew der Mitglieder, Allianz-Historie
- automatische Präsidenten-Nachfolge bei Inaktivität
- Avatar bzw. Banner-Upload, `$ALLIANCE_BANNER`
- BBCode im Allianznamen, Übersetzungsblöcke `[translate]`
- Sperrfristen nach Austritt oder Rauswurf
- Live-Benachrichtigungen per Websocket

## Further Notes

- Begriffe nach `CONTEXT.md`. Für die Fraktion der Rebellen immer „Rebellenallianz“ schreiben, im Code und in der Oberfläche nie nur „Allianz“.
- Bewusste Abweichungen von STU stehen in ADR 0001: feste Ämter, Pflicht-Fraktion und feste Feindschaft zwischen den Fraktionen. Folgende STU-Bugs aus §11 der Recherche werden ausdrücklich nicht übernommen: 1, 2, 3, 5, 7, 8, 9 (Forum, später), 10.
- Für die Diplomatie-Etappe entschieden: Diplomatie gibt es nur zwischen Allianzen derselben Fraktion (siehe ADR 0001).
