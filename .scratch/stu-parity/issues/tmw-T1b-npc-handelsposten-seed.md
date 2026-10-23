# NPC-Handelsposten deterministisch säen

**Status:** claimed
**Priority:** P1
**Size:** S
**Blocked by:** tmw-T1a

## Ziel
Idempotenter Seed für fünf NPC-Posten.

## Akzeptanzkriterien
- [ ] Netz-IDs 1 Imperium, 2 Rebellenallianz, 3 Hutten-Kartell.
- [ ] Namen exakt: „Imperialer Versorgungsknoten Aurek/Besh“, „Versorgungsstützpunkt Aurek/Besh“, „Hutten-Handelsposten“ (Aurek und Besh jeweils als getrennte Namen).
- [ ] Deterministische Standortregel: geeignete Kandidaten nach kanonischer Ebene, dann Koordinaten lexikographisch sortieren und die ersten benötigten unterschiedlichen Orte wählen.
- [ ] Level 1, Lager 10000, Transfer 200; Seed idempotent.
