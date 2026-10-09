# 01: Parteiabstraktion (Prefactor)

**What to build:** Die Diplomatie-Logik und ihre Ablage arbeiten auf Parteien statt auf Allianz-IDs, und die Datenbank lässt Spielerparteien zu. Allianz↔Allianz verhält sich exakt wie bisher; Siedler können noch nichts Neues. Grundlage für alle weiteren Tickets (Spec: `siedler-abkommen-spec.md`, Abschnitte Parteienmodell, Gemeinsame Zustandsmaschine, Chronik).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Dienst und Ablage (TypeORM und In-Memory) adressieren Beziehungen, Vorschläge, Änderungen und Chronik über Parteien; kanonische Paarbildung und Paarsperre gelten parteiübergreifend
- [ ] Rückwärtskompatible Migration: Paar-Eindeutigkeit, Selbstbeziehung, Vasallen-Konsistenz und Chronikspalten gelten für gemischte Parteitypen; Chronik kennt Spieler als Seite und den Endgrund „Partei ist einer Allianz beigetreten“; Unveränderlichkeits-Trigger bleibt
- [ ] Shared DTOs tragen einen Parteityp (Allianz oder Spieler), ohne bestehende Verträge zu brechen
- [ ] Alle bestehenden Diplomatie-, Resolver- und Frontendtests bleiben unverändert grün
- [ ] Migrationstest (Recording-Query-Runner) für Anlegen und Zurückrollen
