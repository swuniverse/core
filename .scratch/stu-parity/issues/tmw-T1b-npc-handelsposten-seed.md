# NPC-Handelsposten deterministisch säen

**Status:** resolved
**Priority:** P1
**Size:** S
**Blocked by:** tmw-T1a

## Ziel
Idempotenter Seed für fünf NPC-Posten.

## Akzeptanzkriterien
- [x] Netz-IDs 1 Imperium, 2 Rebellenallianz, 3 Hutten-Kartell.
- [x] Namen exakt: „Imperialer Versorgungsknoten Aurek/Besh“, „Versorgungsstützpunkt Aurek/Besh“, „Hutten-Handelsposten“ (Aurek und Besh jeweils als getrennte Namen).
- [x] Deterministische Standortregel: geeignete Kandidaten nach kanonischer Ebene, dann Koordinaten lexikographisch sortieren und die ersten benötigten unterschiedlichen Orte wählen.
- [x] Level 1, Lager 10000, Transfer 200; Seed idempotent.

## Comments

- Idempotenter Bootstrap-Seed in `TradeModule`: fünf NPC-Posten werden auf der kanonischen Ebene nach Koordinaten und Fraktionszone verteilt und über ihre stabilen Namen aktualisiert. Unit-Tests decken Werte, Standortwahl und Wiederholung ab; keine offenen Folgepunkte.
