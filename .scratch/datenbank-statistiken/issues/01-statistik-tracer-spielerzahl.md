# 01: Statistik-Tracer: Spielerzahl von Haupttick bis Chart

**What to build:** Die vollständige Strecke für eine erste **Statistik**. Der **Haupttick** schreibt je Kennzahl einen **Snapshot** (neue Tabelle samt Migration, Kennzahlen-Register, eindeutig je Kennzahl/Serie/Zeitpunkt; Fehler brechen den Haupttick nicht ab). Eine Lese-API im Datenbank-Modul liefert die Serien je **Zeiteinheit** (Tick ca. 48 Punkte, Täglich/Wöchentlich/Monatlich ca. 30 Buckets, Aggregation beim Lesen), nur für angemeldete Spieler und nur Aggregate. Der Hub-Platzhalter „Statistiken“ wird zum echten Eintrag mit eigener Ansicht, Zeiteinheit-Umschalter und einer eigenen SVG-Chart-Komponente (gestapelte Flächen, Legende, Hover-Tooltip, ohne neue Bibliothek, SWU-Look). Erster Chart ist „Spieler“, gestapelt aus **aktiv** (24 h) / **inaktiv** / Urlaub gemäß `CONTEXT.md`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Nach einem Haupttick liefert die Lese-API für alle vier Zeiteinheiten die Serien aktiv/inaktiv/Urlaub korrekt (Backend-Integrationstest gegen echte DB, Vorbild `*.int-spec.ts`)
- [ ] Ein Fehler beim Snapshot-Schreiben bricht den Haupttick nicht ab und wird protokolliert
- [ ] Ein zweiter Lauf zum selben Zeitpunkt erzeugt keine Duplikate
- [ ] Die API verlangt Anmeldung und liefert keine Einzeldaten
- [ ] Der Hub-Eintrag „Statistiken“ öffnet die Seite; der Umschalter wechselt die Zeiteinheit (Frontend-Test mit gemockter API, Vorbild `database.spec.tsx`)
- [ ] Der Chart zeigt gestapelte Flächen, Legende mit Farbquadrat und Tooltip mit Zeitpunkt und Werten
- [ ] Neue Kennzahlen lassen sich durch eine einzelne Registrierung ergänzen
