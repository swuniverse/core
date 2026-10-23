# Reine Interaktions-Policy

**Status:** ready-for-agent
**Priority:** P1
**Size:** S
**Blocked by:** —

## Ziel

Eine injektionsfreie deklarative Policy entscheidet aus übergebenem Kontext und liefert `{ allowed: boolean, reason: string | null }`. Bestehende deutsche Ablehnungsmeldungen bleiben unverändert.

## Akzeptanzkriterien

- [ ] Keine NestJS-, Repository- oder Entity-Importe.
- [ ] Regeln für Position, Crew/Kampffähigkeit, Hyperraum, Schilde, Urlaub, Zerstörung, Blockade und Haltung.
- [ ] Erste Ablehnung gewinnt; Unit-Tests je Regel und für Meldungserhalt.
