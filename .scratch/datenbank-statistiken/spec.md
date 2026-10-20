Status: ready-for-agent

# Datenbank-Statistiken

## Problem Statement

Spieler sehen in der Datenbank nur statische Kataloge und Ranglisten. Wie sich das Universum entwickelt (Spielerzahl, Schiffe, Kolonien, Kämpfe), ist nicht erkennbar. Der Hub-Eintrag „Statistiken" unter „Sonstiges" ist nur ein Platzhalter („Zeitreihen werden aufgebaut"). STU bietet hier einfache Zeitreihen-Charts, die optisch dürftig sind.

## Solution

Eine Seite **Datenbank / Statistiken**, erreichbar aus dem Hub, die für alle angemeldeten Spieler **Statistiken** als gestapelte Flächendiagramme im SWU-Look zeigt. Eine Umschaltung der **Zeiteinheit** (Tick, Täglich, Wöchentlich, Monatlich) steuert die Auflösung. Der **Haupttick** schreibt je Kennzahl einen **Snapshot**, aus dem die Charts gelesen werden. Die Charts starten bei null, ohne zurückgerechnete Historie.

## User Stories

1. Als Spieler möchte ich im Datenbank-Hub einen echten Eintrag „Statistiken" finden, damit ich die Entwicklung des Universums einsehen kann.
2. Als Spieler möchte ich die Zeiteinheit zwischen Tick, Täglich, Wöchentlich und Monatlich umschalten, damit ich kurzfristige und langfristige Trends sehe.
3. Als Spieler möchte ich die Spielerzahl gestapelt nach aktiv (24 h), inaktiv und Urlaub sehen, damit ich die Gesamtzahl und die Aktivität erkenne.
4. Als Spieler möchte ich die Schiffsanzahl gestapelt nach Fraktion sehen, damit ich die Stärkeverhältnisse einschätzen kann.
5. Als Spieler möchte ich die Kolonien gestapelt nach Fraktion sehen, damit ich die Ausbreitung der Fraktionen verfolge.
6. Als Spieler möchte ich die Spielerzahl je Fraktion sehen, damit ich die Machtbalance erkenne.
7. Als Spieler möchte ich die Holonet-Beiträge und -Kommentare als zwei Serien sehen, damit ich die Kommunikationsaktivität erkenne.
8. Als Spieler möchte ich die in den letzten 24 h geflogenen Felder sehen, damit ich die Bewegungsaktivität einschätzen kann.
9. Als Spieler möchte ich den Zuwachs an Privatnachrichten je Zeiteinheit sehen, auch wenn Nachrichten später gelöscht werden.
10. Als Spieler möchte ich die kumulativ entdeckten Systeme (**Systementdeckung** über alle Spieler) sehen, damit ich den Kartierungsfortschritt verfolge.
11. Als Spieler möchte ich Kampfereignisse (Gefechte, zerstörte Schiffe) je Zeiteinheit sehen, damit ich die Konfliktlage erkenne.
12. Als Spieler möchte ich die Anzahl der Allianzen und die durchschnittliche Mitgliederzahl sehen, damit ich die Organisation der Spieler erkenne.
13. Als Spieler möchte ich das Gesamtprestige bzw. den Prestige-Median sehen, damit ich die Entwicklung der Fortschrittswerte verfolge.
14. Als Spieler möchte ich beim Überfahren eines Charts einen Tooltip mit Zeitpunkt und Werten aller Serien sehen, damit ich exakte Zahlen ablesen kann.
15. Als Spieler möchte ich eine Legende mit Farbmarkierung je Serie sehen, damit ich die Flächen zuordnen kann.
16. Als Spieler möchte ich gut lesbare Achsenbeschriftungen ohne gedrehten Text sehen, damit die Zeitachse schnell erfassbar ist.
17. Als Spieler möchte ich, dass die Charts auf kleinen Bildschirmen lesbar bleiben, damit ich sie auch mobil nutzen kann.
18. Als Spieler möchte ich eine verständliche Leeranzeige sehen, solange noch nicht genug Snapshots vorliegen, damit die Seite nicht kaputt wirkt.
19. Als Spieler möchte ich, dass die Statistiken nur Aggregate zeigen, damit keine Einzeldaten anderer Spieler offengelegt werden.
20. Als Betreiber möchte ich, dass jeder Haupttick automatisch Snapshots schreibt, damit keine manuelle Pflege nötig ist.
21. Als Betreiber möchte ich, dass ein Fehler beim Schreiben der Snapshots den Haupttick nicht abbricht, damit das Spiel weiterläuft.
22. Als Betreiber möchte ich, dass Snapshots unbegrenzt aufbewahrt werden, damit Langzeitverläufe erhalten bleiben.
23. Als Betreiber möchte ich, dass ein Haupttick pro Zeitpunkt höchstens einen Snapshot je Kennzahl und Serie erzeugt, damit Wiederholungen keine Duplikate erzeugen.
24. Als Entwickler möchte ich neue Kennzahlen durch eine einzelne Registrierung ergänzen können, damit spätere Statistiken (Forschung, Wirtschaft) wenig Aufwand bedeuten.

## Implementation Decisions

- **Snapshot-Speicher:** Neue Tabelle für Snapshots mit Kennzahl, Serie, Zeitpunkt (Haupttick) und Wert. Eindeutig je (Kennzahl, Serie, Zeitpunkt). Neue Migration nach dem bestehenden Muster. Keine Aufbewahrungsgrenze.
- **Kennzahlen-Register:** Jede Kennzahl ist eine registrierte Definition mit Schlüssel, Titel, Serien (Schlüssel, Anzeigename), Aggregationsart (letzter Wert vs. Summe/Zuwachs) und einer Erfassungsfunktion. Neue Kennzahlen entstehen durch Registrierung.
- **Erfassung:** Ein Statistik-Modul schreibt je Haupttick Snapshots für alle registrierten Kennzahlen. Es wird vom Haupttick nach dem Spieltakt aufgerufen. Fehler werden protokolliert und brechen den Haupttick nicht ab.
- **Ereigniszähler:** Für geflogene Felder und empfangene Privatnachrichten gibt es eine Stundenzähler-Tabelle (Kennzahl, Stunde, Anzahl), die an den jeweiligen Stellen inkrementiert wird (Schiffsbewegung, Senden einer Privatnachricht im Ordner `PERSONAL`). Der Snapshot „geflogene Felder letzte 24 h" ist die Summe der letzten 24 Stundenzeilen. Privatnachrichten werden als Zuwachs je Zeiteinheit aus den Stundenzeilen gelesen, nicht aus dem aktuellen Bestand der Nachrichten.
- **Definitionen:** Aktiver Spieler = Aktivität in den letzten 24 h anhand der letzten Aktivität. Inaktiv = nicht aktiv und nicht im Urlaub. Urlaub wird getrennt gezählt. Maßgeblich ist `CONTEXT.md` (Abschnitt „Statistiken").
- **Kennzahlen der ersten Version:** Spieler (aktiv / inaktiv / Urlaub), Schiffe nach Fraktion, Kolonien nach Fraktion, Spieler je Fraktion, Holonet (Beiträge / Kommentare), geflogene Felder 24 h, Privatnachrichten, entdeckte Systeme (kumulativ), Kampf (Gefechte / zerstörte Schiffe), Allianzen (Anzahl / Ø Mitglieder), Prestige (Gesamt oder Median).
- **Lese-API:** Ein Endpunkt im bestehenden Datenbank-Modul liefert je Kennzahl die Serien für eine Zeiteinheit. Tick = letzte ca. 48 Haupttick-Punkte. Täglich/Wöchentlich/Monatlich = ca. 30 Buckets, aggregiert beim Lesen per SQL (Bucket-Wert je Aggregationsart). Zugriff für alle angemeldeten Spieler. Antwort enthält nur Aggregate.
- **Frontend:** Der Hub-Platzhalter „Statistiken" wird zu einem Eintrag mit eigener Ansicht innerhalb der Datenbankseite. Zeiteinheit-Umschalter, Raster aus Chart-Karten.
- **Chart-Komponente:** Eigene schlanke SVG-Komponente (gestapelte Flächen und Linien) ohne neue Bibliothek, im SWU-Look (dunkel, Gitterlinien, Legende mit Farbquadrat, Hover-Tooltip, lesbare Achsenbeschriftung). Farben aus den bestehenden Design-Tokens.
- **Kein Backfill:** Die Charts beginnen ab Einführung bei null.
- **Keine ADR:** Keine der Entscheidungen ist schwer umkehrbar.

## Testing Decisions

- **Gute Tests** prüfen nur beobachtbares Verhalten (Snapshot-Inhalte nach einem Haupttick, Antwort der Lese-API, gerenderte Chart-Ausgabe), keine Interna wie Registerstruktur oder SQL-Text.
- **Seam 1 (Backend, höchster Seam):** Die Lese-API des Datenbank-Moduls gegen eine echte Datenbank. Ein Haupttick läuft nach vorbereiteten Daten (Spieler, Schiffe, Kolonien, Urlauber, Nachrichten, Bewegungen). Geprüft wird dann die API-Antwort je Zeiteinheit. Dieser eine Seam deckt Erfassung, Zähler, Aggregation und Zugriffsschutz ab. Vorbild: bestehende `*.int-spec.ts` (z. B. in Allianz) und die Specs im Datenbank-Modul.
- **Seam 2 (Frontend):** Die Statistikseite mit gemockter API. Geprüft werden Umschalten der Zeiteinheit, Rendern von Charts, Legende, Leeranzeige. Vorbild: `database.spec.tsx`.
- Die Chart-Komponente wird über Seam 2 mitgetestet und nicht separat.

## Out of Scope

- Rückgerechnete Historie.
- Statistiken zu Forschung und Wirtschaft (Waren, Credits). Eigene spätere Spec.
- Aufbewahrungsgrenzen oder Rollup-Tabellen.
- Persönliche oder allianzbezogene Statistiken.
- Export oder Download der Daten.
- Neue Konzepte nur für die Statistik (NPC-Schiffe, KN).

## Further Notes

- STU-Vorlage: Statistiken unter der Datenbank mit Zeiteinheit-Umschalter. Abweichungen: keine NPC-Schiffe (stattdessen Fraktion), Holonet statt KN.
- Begriffe sind in `CONTEXT.md` unter „Statistiken" definiert (Haupttick, Statistik, Snapshot, Zeiteinheit, Aktiver Spieler).
- Die letzte Aktivität wird höchstens alle 5 Minuten gestempelt. „Aktiv letzte 24 h" ist deshalb leicht unscharf, was für diese Statistik ausreicht.
