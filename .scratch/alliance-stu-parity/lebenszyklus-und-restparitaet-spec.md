# Lebenszyklus und Restparität

Status: ready-for-agent

Etappe 5 von 6 der Route [map.md](map.md). Grundlagen: `CONTEXT.md`, ADR 0001, die Entscheidungen 07, 09, 10, 11 und 13 der Map sowie die Offene-Punkte-Liste der [Internen Zusammenarbeit](interne-zusammenarbeit-spec.md).

## Problem Statement

Eine Allianz in SWU hat heute ein unvollständiges Ende und kein Gesicht nach außen.

- Verlässt oder verliert der Präsident seinen Platz, ohne das Amt zu übergeben, bleibt die Allianz führungslos oder muss von Hand gerettet werden. Der Präsident darf nicht austreten, solange andere Mitglieder da sind, und eine Kontolöschung kennt keinen Allianzbezug.
- Allianzen haben kein Banner und keine Möglichkeit, es auf der Allianzseite zu zeigen.
- Die Auflösung entfernt Allianzdaten nur über Fremdschlüssel-Kaskaden. Mitglieder erfahren beim Austritt des letzten Mitglieds nichts, Nachrichten und externe Dateien haben keinen wiederholbaren Nachlauf, und ein späterer Spielreset hätte keinen definierten Bereinigungspfad.
- Die interne Allianzchronik kennt weder Nachfolge noch Banneränderungen.

Als Spieler erlebe ich daher: Allianzen sterben unkontrolliert, sehen anonym aus und hinterlassen Reste.

## Solution

Eine Allianz überlebt den Weggang ihres Präsidenten deterministisch: Ein Nachfolger wird nach Aktivität und Amt gewählt, alle verbleibenden Mitglieder werden informiert, und die Allianzchronik hält es fest. Präsident und Vize können ein PNG-Banner hochladen, ersetzen und entfernen; es erscheint als fester Kopfbereich der Allianzseite und über den Platzhalter `$ALLIANCE_BANNER` in der Beschreibung. Die Auflösung und ein künftiger Spielreset räumen den gesamten Allianzkontext in einer Transaktion ab; Nachrichten und das Löschen der Bannerdatei laufen danach wiederholbar nach und können eine abgeschlossene Auflösung nie zurückrollen.

Weil SWU weder eine Kontolöschungsausführung noch einen Spielreset besitzt, liefert diese Etappe die allianzseitigen Einstiegspunkte (Mitgliedschaft aus Kontolöschung entfernen, Allianzdaten bereinigen) als fertige, getestete Operationen. Die Aufrufer selbst bleiben benannte Integrationspunkte.

## User Stories

Präsidentennachfolge
1. Als Mitglied einer Allianz möchte ich, dass bei Wegfall des Präsidenten automatisch ein Nachfolger bestimmt wird, damit die Allianz nie ohne Präsident ist.
2. Als Mitglied möchte ich, dass zuerst der zuletzt aktive Vize nachrückt, damit die Verwaltung bei der bisherigen Führungsebene bleibt.
3. Als Mitglied möchte ich, dass ohne Vize der zuletzt aktive Diplomat nachrückt, damit ein Amtsträger vor Mitgliedern ohne Amt Vorrang hat.
4. Als Mitglied möchte ich, dass ohne Vize und Diplomat das zuletzt aktive übrige Mitglied nachrückt, damit die Allianz nicht verfällt, solange noch jemand da ist.
5. Als Mitglied möchte ich, dass bei gleicher Aktivität die längste Mitgliedschaft entscheidet und danach die niedrigste User-ID, damit die Wahl nie vom Zufall abhängt.
6. Als Mitglied möchte ich, dass ein Mitglied ohne erfasste Aktivität als am längsten inaktiv gilt, damit die Zeit vor Einführung der Aktivitätserfassung die Wahl nicht verfälscht und eine Allianz nicht aufgelöst wird, nur weil alle Werte leer sind.
7. Als verbleibendes Mitglied möchte ich nach erfolgreichem Abschluss eine Systemnachricht mit altem und neuem Präsidenten erhalten, damit ich weiß, wer jetzt führt.
8. Als Mitglied möchte ich die Nachfolge in der Allianzchronik sehen, damit sie nachvollziehbar bleibt.
9. Als Beobachter möchte ich, dass die automatische Nachfolge nicht in der öffentlichen Diplomatie-Chronik erscheint, damit interne Vorgänge intern bleiben.
10. Als neuer Präsident möchte ich sofort alle Präsidentenrechte besitzen und kein anderes Amt zusätzlich halten, damit die Regel „höchstens ein Amt“ gilt.
11. Als Mitglied möchte ich, dass genau ein Präsident existiert, auch wenn zwei Ereignisse gleichzeitig eintreten, damit Konkurrenz keine zwei oder keinen Präsidenten erzeugt.
12. Als letztes Mitglied möchte ich, dass die Allianz aufgelöst wird, wenn kein Nachfolgekandidat existiert, damit keine leere Allianz zurückbleibt.

Wegfall des Präsidenten
13. Als Präsident möchte ich weiterhin das Amt manuell übergeben können, bevor ich austrete, damit ich die Nachfolge selbst bestimme.
14. Als Präsident einer Allianz mit weiteren Mitgliedern möchte ich den Austritt weiterhin nur nach Übergabe erhalten, damit die Regel aus ADR 0001 gilt; die automatische Nachfolge greift nur bei Ereignissen ohne Entscheidung des Präsidenten.
15. Als Betreiber möchte ich, dass beim Entfernen eines Spielerkontos dessen Allianzmitgliedschaft endet und bei einem Präsidenten die Nachfolge ausgelöst wird, damit gelöschte Konten keine Allianz blockieren.
16. Als Betreiber möchte ich, dass die Kontolöschung keinen Beitrag und keine Chronikeinträge verliert, sondern „Gelöschter Siedler“ anzeigt, damit Verlauf und Forum lesbar bleiben.
17. Als verbleibendes Mitglied möchte ich bei einer Kontolöschung die Chronik- und Nachrichtenfolge wie bei Austritt beziehungsweise Nachfolge erhalten, damit Kontolöschung kein Sonderweg ohne Spur ist.
18. Als Mitglied möchte ich, dass eine Kontolöschung des einzigen Mitglieds die Allianz mit vollständiger Bereinigung auflöst, damit keine verwaisten Daten bleiben.

Banner
19. Als Präsident oder Vize möchte ich ein Banner hochladen, damit meine Allianz ein Gesicht erhält.
20. Als Präsident oder Vize möchte ich das Banner ersetzen und entfernen, damit ich es aktuell halten kann.
21. Als Diplomat oder Mitglied ohne Amt möchte ich kein Banner ändern können, und der Server soll es verweigern, damit Verwaltungsrechte nicht umgangen werden.
22. Als Allianzverwalter möchte ich eine klare Fehlermeldung bei zu großer Datei, falschem Format oder zu großen Abmessungen erhalten, damit ich weiß, was ich ändern muss.
23. Als Betreiber möchte ich, dass nur echte PNG-Dateien bis 200 KB und 600 × 150 Pixel angenommen werden, geprüft am tatsächlichen Inhalt und nicht an Dateiendung oder Content-Type, damit keine getarnten Dateien gespeichert werden.
24. Als Betreiber möchte ich, dass jede Datei beim Speichern neu kodiert beziehungsweise ihr Inhalt neutral gehalten wird, sodass keine aktiven Inhalte ausgeliefert werden, damit das Banner keine Angriffsfläche ist.
25. Als Besucher der Allianzseite möchte ich das Banner als festen Kopfbereich sehen, damit die Allianz erkennbar ist.
26. Als Allianzverwalter möchte ich das Banner in der Beschreibung über `$ALLIANCE_BANNER` platzieren, damit ich das Layout steuere.
27. Als Besucher möchte ich, dass ohne Banner weder Kopfbereich noch Platzhalter etwas anzeigen, damit keine leeren Rahmen oder Rohtext erscheinen.
28. Als Besucher möchte ich, dass unbekannte `$ALLIANCE_*`-Platzhalter wie bisher verschwinden und kein HTML erzeugen, damit die Beschreibung sicher bleibt.
29. Als Mitglied möchte ich, dass Banneränderungen in der Allianzchronik stehen, ohne den Bildinhalt zu kopieren, damit die Chronik klein und unveränderlich bleibt.
30. Als Allianzverwalter möchte ich, dass das Ersetzen eines Banners den Alteintrag zuverlässig entfernt, damit keine verwaisten Dateien liegen bleiben.
31. Als Betreiber möchte ich Banneränderungen ratenbegrenzt wissen, damit der Upload nicht missbraucht wird.
32. Als Entwickler möchte ich, dass der Dateispeicher hinter einer austauschbaren Asset-Schnittstelle liegt und für die Entwicklung ein lokaler Dateisystemadapter genügt, damit später ein Objektspeicher ohne Domänenänderung möglich ist.

Auflösung und Reset
33. Als Präsident möchte ich die Allianz auflösen können, und alle zugehörigen Daten sollen verschwinden, damit nichts auf eine tote Allianz zeigt.
34. Als ehemaliges Mitglied möchte ich nach einer Auflösung eine Systemnachricht erhalten, auch wenn die Auflösung durch den Austritt des letzten Präsidenten ohne Kandidaten oder durch Kontolöschung entstand, damit ich nichts verpasse; Zustellung erst nach dem Commit.
35. Als Betreiber möchte ich, dass die relationale Auflösung eine einzige Datenbanktransaktion ist, damit nie ein Teilzustand sichtbar wird.
36. Als Betreiber möchte ich, dass die Auflösung Allianz, Mitgliedschaften, Bewerbungen, Beziehungen samt Vorschlägen, Beziehungsfreigaben und deren Änderungen, Forum, interne Allianzchronik, Allianzdepot-Zuordnungen, allianzbezogene Zugangsprivilegien und die Bannerreferenz entfernt, damit kein Rest zurückbleibt.
37. Als Betreiber möchte ich, dass das Bannerfile nach dem Commit gelöscht wird und ein Fehler dabei die Auflösung nicht zurückrollt, sondern später wiederholt wird, damit externe Fehler das Spiel nicht blockieren.
38. Als Betreiber möchte ich, dass fehlgeschlagene Nachrichten und Dateilöschungen automatisch erneut versucht werden und die Wiederholung idempotent ist, damit nichts doppelt zugestellt oder doppelt gelöscht wird.
39. Als Beobachter möchte ich, dass öffentliche Diplomatie-Ereignisse einer aufgelösten Allianz erhalten bleiben, damit die öffentliche Geschichte lesbar bleibt, solange kein vollständiger Spielreset stattfindet.
40. Als Betreiber möchte ich bei einem vollständigen Spielreset zusätzlich alle Allianz- und Beziehungsdaten einschließlich öffentlicher Chroniken und aller Bannerassets entfernen, damit der neue Spielstand sauber startet.
41. Als Betreiber möchte ich, dass die Reset-Bereinigung beliebig oft wiederholt werden kann, ohne Fehler und ohne Folgen, damit ein abgebrochener Reset nachgeholt werden kann.
42. Als Betreiber möchte ich, dass keine Rechte auf später wiederverwendete IDs übrig bleiben, damit eine neue Allianz nie fremde Zugänge erbt.
43. Als Mitglied einer anderen Allianz möchte ich, dass eine Auflösung der Partnerallianz meine Beziehung zu ihr und deren Wirkungen (Freund, Live-Position) sofort beendet, damit keine Wirkung ohne Gegenpartei bleibt.

Allianzdepots und Zugangsprivilegien
44. Als Entwickler eines künftigen Stations- oder Zugangssystems möchte ich einen getesteten Bereinigungs-Haken je Allianzkontext, damit Depot-Zuordnungen und allianzbezogene Zugangsregeln bei Austritt, Rauswurf, Kontolöschung, Auflösung und Reset zentral entfernt werden.
45. Als Eigentümer einer künftigen Depotstation möchte ich, dass bei Austritt oder Auflösung nur die Zuordnung endet und Station und Eigentum unverändert bleiben, damit ich nichts verliere.

Restparität
46. Als Spieler möchte ich, dass jeder Allianzname, jede Beschreibung und jedes Banner weiterhin ohne `[translate]`-Blöcke und BBCode im Namen funktionieren, damit nichts Unsicheres entsteht.
47. Als Mitglied möchte ich, dass Austritt, Rauswurf und Kontolöschung mich sofort aus allen allianzabhängigen Sichten (Karte, Forum, Chronik, Freundschaft über Allianz) entfernen, damit keine Rechte nachwirken.
48. Als Betreiber möchte ich, dass die Chronik für Nachfolge und Banner mit den bereits vorhandenen Eigenschaften (unveränderlich, paginiert, Namen zum Ereigniszeitpunkt, kleine Metadaten) arbeitet, damit keine neue Chronikart nötig ist.

## Implementation Decisions

### Abgrenzung und Funde

- Die Etappe umfasst: Präsidentennachfolge, allianzseitige Behandlung der Kontolöschung, Banner mit Asset-Schnittstelle und `$ALLIANCE_BANNER`, die vollständige Auflösungs- und Reset-Bereinigung samt wiederholbarem Nachlauf, die Chronikereignisse für Nachfolge und Banner.
- Befund aus dem Code: Die Kontolöschung markiert ein Konto nur (`deletionMark`), es gibt keinen ausführenden Prozess. Einen vollständigen Spielreset gibt es nicht. Beides wird nicht neu gebaut. Die Etappe liefert die allianzseitigen Operationen „Mitgliedschaft aus Kontolöschung entfernen“ und „Allianzdaten bereinigen“, die künftige Aufrufer verwenden. Die Aufrufer bleiben benannte Integrationspunkte.
- Befund: Allianzdepots und Zugangsprivilegien haben in SWU keine Datenmodelle. Die Etappe baut deshalb keine Tabellen dafür, sondern einen Bereinigungs-Haken (siehe unten), den die künftigen Systeme registrieren.
- Befund: Die Auflösung verlässt sich heute auf Fremdschlüssel-Kaskaden und verschickt beim Austritt des letzten Mitglieds keine Nachricht. Die Kaskaden bleiben die Grundlage der Bereinigung; die Etappe ergänzt, was Kaskaden nicht leisten (Nachrichten, Asset, wiederholbarer Nachlauf, Haken).

### Modulschnitt

- Alles bleibt im Allianz-Modul. `AllianceService` bleibt Hauptseam für Mitgliedschaft, Nachfolge und Auflösung, weil alle Lebenszyklusereignisse dort entstehen.
- Neuer tiefer **Bannerdienst** mit schmaler Schnittstelle (hochladen/ersetzen, entfernen, lesen). Er prüft Rechte, validiert den Inhalt, schreibt die Bannerreferenz und die Chronik und delegiert die Dateiablage an eine austauschbare **Asset-Schnittstelle** (Speichern, Löschen, Lesen). Adapter: lokales Dateisystem für die Entwicklung, In-Memory-Adapter für Tests.
- Neuer schmaler Port **Allianzkontext-Bereinigung** für Verbraucher außerhalb des Allianz-Moduls (künftige Depots, Zugangsprivilegien): Verbraucher registrieren eine Bereinigung für „Allianz aufgelöst“, „Mitglied entfernt“ und „Reset“. Ohne registrierte Verbraucher ist der Port ein No-Op. Die Registrierung ist Teil des Integrationsvertrags aus der Etappe Allianz-Infrastruktur.
- Die Nachfolgewahl ist eine reine Funktion über Mitglieder (Amt, letzte Aktivität, Beitrittszeit, User-ID) ohne Datenbankzugriff, damit die Regelkette isoliert prüfbar ist.
- Ein **Nachlaufdienst** wiederholt ausstehende Nachrichten und Dateilöschungen nach dem Muster des vorhandenen Diplomatie-Benachrichtigungsdispatchers (periodischer Intervall, Sperre gegen Überlappung, Lieferschlüssel für idempotente Zustellung).

### Nachfolgeregel

- Reihenfolge: zuletzt aktiver Vize; sonst zuletzt aktiver Diplomat; sonst zuletzt aktives übriges Mitglied; bei gleicher Aktivität längste Mitgliedschaft; danach niedrigste User-ID. Eine leere letzte Aktivität zählt als älteste Aktivität und schlägt jeden erfassten Wert nie.
- Auslöser: Wegfall des Präsidenten ohne manuelle Übergabe, also Kontolöschung. Der freiwillige Austritt eines Präsidenten mit weiteren Mitgliedern bleibt ein Fehler (ADR 0001, „Präsident muss übergeben“); die manuelle Übergabe bleibt unverändert.
- Gibt es keinen Kandidaten, wird die Allianz aufgelöst.
- Nachfolge, Mitgliedschaftsende des alten Präsidenten und Chronikeintrag erfolgen in derselben Transaktion unter der bestehenden Allianzsperre. Zwei gleichzeitige Auslöser führen zu genau einem Präsidenten.
- Der Nachfolger verliert sein bisheriges Amt zugunsten des Präsidentenamts (höchstens ein Amt).
- Der Chronikeintrag trägt Ereignistyp „automatische Nachfolge“, Akteur leer (System), betroffene Partei = neuer Präsident, in den Metadaten die frühere Präsidenten-ID und -Name zum Ereigniszeitpunkt. Kein Eintrag in der Diplomatie-Chronik.
- Systemnachricht an alle verbleibenden Mitglieder nach dem Commit: alter und neuer Präsident namentlich.

### Kontolöschung (allianzseitig)

- Eine Operation „Konto entfernt“ nimmt eine Spieler-ID entgegen, entfernt die Mitgliedschaft (und offene Bewerbungen) und folgt bei Präsident der Nachfolgeregel, sonst dem Austritts-Ablauf mit Chronikeintrag „Austritt“ und Benachrichtigung der Verwaltung.
- Beiträge, Chronikeinträge und Foren bleiben erhalten; Autor- und Betroffenenreferenzen werden durch bestehende `SET NULL`-Regeln auf null gesetzt, die festgehaltenen Namen bleiben (Anzeige „Gelöschter Siedler“).
- Die Operation ist idempotent: Für einen Spieler ohne Mitgliedschaft ist sie ein No-Op.

### Banner

- Berechtigung: neue Allianzaktion `manageBanner` für Präsident und Vize in der vorhandenen Rechtematrix.
- Validierung am tatsächlichen Inhalt: PNG-Signatur und dekodierbarer Header, höchstens 200 KB, Breite höchstens 600 und Höhe höchstens 150 Pixel, ein Bild, keine Animation. Alles andere wird mit einem fachlichen Fehler abgelehnt. Der gespeicherte Inhalt ist ein serverseitig neu kodiertes PNG, damit keine eingebetteten Zusatzdaten ausgeliefert werden.
- Das Asset hat einen vom Allianzbesitz unabhängigen, nicht erratbaren Schlüssel. Die Allianz speichert nur die Referenz (Schlüssel, Änderungszeit), nie den Bildinhalt. Auslieferung erfolgt über einen Lese-Endpunkt mit `Content-Type: image/png` und `X-Content-Type-Options: nosniff`; er verlangt keine Mitgliedschaft (Allianzseiten sind öffentlich).
- Ersetzen speichert zuerst das neue Asset, schreibt dann in einer Transaktion die neue Referenz und die Chronik und stellt die Löschung des alten Assets als Nachlaufaufgabe ein. Entfernen löscht die Referenz transaktional und stellt die Löschung ein.
- Die Allianzseite zeigt das Banner als festen Kopfbereich und ersetzt `$ALLIANCE_BANNER` in der Beschreibung sicher durch ein Bild-Element (kein rohes HTML). Ohne Banner liefert der Server weder Kopfbereich noch Platzhalterersatz; der Platzhalter wird zu leerem Text. Die Ersetzung erfolgt wie die vorhandenen Platzhalter beim Lesen und fügt den Eintrag der bestehenden Platzhalterliste hinzu.
- Banneränderungen werden mit Ratenbegrenzung über die vorhandene dauerhafte Ratenbegrenzung geschützt (neuer Befehlswert).
- Chronikereignisse: „Banner gesetzt/ersetzt“ und „Banner entfernt“, Akteur = Verwalter, Metadaten klein (zum Beispiel Bildmaße, keine Bilddaten).

### Auflösung und Reset

- Es gibt weiterhin genau einen Auflösungsablauf, der von den drei Wegen (Präsident löst auf, Austritt des letzten Mitglieds, Nachfolge ohne Kandidaten bei Kontolöschung) gemeinsam genutzt wird, damit alle dieselbe Bereinigung und dieselben Nachrichten erhalten. Das schließt die heute fehlende Nachricht beim Austritt des letzten Mitglieds (nur dieses eine Mitglied, also kein Adressat) bewusst ein: Adressaten sind die zum Zeitpunkt der Auflösung verbleibenden Mitglieder außer dem Auslöser.
- Die relationale Auflösung ist eine Transaktion und entfernt: Allianz, Mitgliedschaften, Bewerbungen, Beziehungen und Vorschläge, Beziehungsfreigaben samt Änderungen, Forum, interne Allianzchronik, Bannerreferenz. Für Depot-Zuordnungen und allianzbezogene Zugangsprivilegien ruft sie innerhalb derselben Transaktion den Bereinigungs-Port auf.
- Nach dem Commit: Systemnachrichten und Löschung des Bannerassets als Nachlaufaufgaben. Die Aufgaben werden in derselben Transaktion als Absicht persistiert (Muster: Diplomatie-Benachrichtigungen), sodass sie bei Absturz zwischen Commit und Versand nicht verloren gehen. Fehler im Nachlauf lassen den relationalen Zustand unverändert und werden wiederholt; Wiederholung ist idempotent (Lieferschlüssel für Nachrichten, „Löschen eines fehlenden Assets gilt als erfolgreich“).
- Öffentliche Diplomatie-Chronik-Einträge der aufgelösten Allianz bleiben bestehen (sie tragen Namen und IDs ohne Fremdschlüssel).
- **Spielreset:** Ein allianzseitiger Einstiegspunkt „alle Allianzdaten bereinigen“ entfernt zusätzlich alle Allianzen, Parteien, Beziehungen, Chroniken (auch die öffentliche Diplomatie-Chronik und Benachrichtigungsabsichten) und alle Bannerassets, auch solche ohne Referenz. Er ist idempotent und lässt Zählerstände so, dass keine alten IDs auf neue Allianzen zeigen können; allianzbezogene Verbraucher werden über den Bereinigungs-Port informiert. Ein aufrufender Spielreset existiert nicht und bleibt Integrationspunkt.

### Schemaänderungen

Alle Änderungen sind rückwärtskompatible, additive Migrationen mit Migrationstest nach dem vorhandenen Muster.

- Allianz: nullable Bannerreferenz (Schlüssel, Änderungszeit).
- Allianzchronik: neue Ereignistypen für automatische Nachfolge, Banner gesetzt/ersetzt und Banner entfernt; das Typenset ist laut Interne-Zusammenarbeit-Etappe offen erweiterbar. Ob eine Längenerweiterung der Typspalte nötig ist, wird beim Bau geprüft.
- Nachlaufaufgaben: eine Tabelle für ausstehende Dateilöschungen (Asset-Schlüssel, Versuche, nächster Versuch); ausstehende Nachrichten nutzen das vorhandene Absichtsmuster beziehungsweise eine Erweiterung davon (Empfänger, Text, Lieferschlüssel), ohne Fremdschlüssel auf die aufgelöste Allianz.
- Keine Schemaänderung für Depots und Zugangsprivilegien.

### API und gemeinsame Typen

- Gemeinsame DTOs in `packages/shared`: Bannerdaten in der Allianzdetail-Antwort (vorhanden ja/nein, Auslieferungs-URL, Änderungszeit), neue Chronik-Ereignistypen, Fähigkeit „Banner verwalten“ aus der servergelieferten Rechteantwort.
- Endpunkte: Banner hochladen/ersetzen, Banner entfernen, Banner lesen. Die Rechte folgen der servergelieferten Fähigkeit; das Frontend rät nicht.
- Keine neuen Endpunkte für Kontolöschung und Reset; sie sind interne Dienstoperationen.

### Frontend

- Allianzseite: fester Banner-Kopfbereich und sicher gerenderter `$ALLIANCE_BANNER`-Platzhalter; ohne Banner nichts.
- Verwaltung: Upload, Ersetzen, Entfernen mit servergelieferten Fehlermeldungen; nur sichtbar mit Fähigkeit.
- Chronikansicht zeigt die neuen Ereignistypen mit lesbaren deutschen Texten.

## Testing Decisions

- Ein gutes Test beobachtet Außenverhalten: Zustand nach dem Aufruf, gesendete Nachrichten, Chronik, Antworten auf direkte Requests. Quellcodeinterne Aufrufreihenfolgen werden nicht geprüft.
- **Seams (so für diese Etappe vorgesehen, da bereits die Seams der Vorgängeretappen):**
  1. `AllianceService` und Bannerdienst gegen In-Memory-Store und In-Memory-Asset-Adapter: Nachfolge, Kontolöschung, Auflösungswege, Banner-Rechte und -Validierung, Chronik, Nachrichtenadressaten.
  2. Echte Postgres-Tests (Integrationsmuster `*.int-spec.ts` mit `resetDatabase`): Kaskaden der Auflösung, Transaktionalität (Fehler im Nachlauf rollt nichts zurück), Konkurrenz (zwei gleichzeitige Präsidentenwegfälle, Auflösung gegen Beitritt), Idempotenz von Reset und Nachlauf, Migration.
  3. Controller-Ebene mit direkten Requests je Amt und manipulierten IDs: Bannerrechte, öffentlicher Banner-Lesepfad, Content-Type.
  4. Frontend-Seiten mit gemockter API: Banner-Kopfbereich, Platzhalter, fehlendes Banner, Fähigkeitssteuerung, Chroniktexte.
- Besondere Fälle: Nachfolge mit allen Prioritätsstufen, Gleichstand, leere Aktivität bei allen, leere Aktivität gemischt, kein Kandidat; Dateien mit falscher Endung/gefälschtem Content-Type, 200 KB ± 1, 600 × 150 ± 1, Polyglott-Dateien; Asset-Fehler beim Löschen, Nachrichtenfehler, Wiederholung doppelt; Reset zweimal; Nachlauf mit schon gelöschtem Asset.
- Prior Art: `alliance-lifecycle.int-spec.ts`, `alliance.int-spec.ts`, `alliance.service.spec.ts`, `forum.int-spec.ts`, `diplomacy-notification-dispatcher.service.spec.ts`, `last-activity.int-spec.ts`, Controller-Autorisierungstests der Internen Zusammenarbeit.

## Out of Scope

- Ausführung der Kontolöschung (Entfernen des Kontos nach `deletionMark`) und ein Spielreset-Auslöser. Beide sind künftige Integrationspunkte, die die hier gelieferten Operationen aufrufen.
- Datenmodelle für Allianzdepots, Zugangsprivilegien und Territorialfarbe; nur der Bereinigungs-Haken ist enthalten.
- Siedler-Abkommen und Parteiwechsel (Etappe 6).
- Forum-Export und -Archivierung.
- Der 30-prozentige Prestigeanteil aus STUs Piratenrunde.
- `[translate]`-Blöcke und BBCode in Allianznamen.
- Austrittsregeln des Präsidenten bei vorhandenen Mitgliedern: bleibt „erst übergeben“.
- Ein Objektspeicher-Adapter; nur Dateisystem und In-Memory.
- Wiederherstellung (Undo) einer Auflösung.

## Further Notes

- Der Nachfolge hängt an der in der Etappe Interne Zusammenarbeit erfassten letzten Aktivität. Bis zur ersten Anfrage nach deren Auslieferung sind Werte leer; die Regel „leer = älteste“ vermeidet STU-Bug §11.4 (Auflösung bei durchgehend leerer Aktivität).
- Die Etappe darf unabhängig von Etappe 6 ausgeliefert werden; Migrationen sind rückwärtskompatibel und werden vor der Nutzung ausgerollt. Es gibt keinen Fähigkeitsschalter (Nutzerentscheidung vom 2026-10-09); die Bannerfähigkeit erscheint erst, wenn Upload, Lesen, Entfernen, Bereinigung und Nachlauf serverseitig wirksam sind.
- Abweichung vom STU-Verhalten: Die Nachfolge ist deterministisch und bezieht Ämter ein; STU-Bugs und Sicherheitslücken des Bannerpfads werden nicht übernommen.
- Die Seams wurden nicht erneut mit dem Nutzer abgestimmt, weil sie den bereits bestätigten Seams der Vorgängeretappen entsprechen; ein neuer Seam ist nur die Asset-Schnittstelle.
