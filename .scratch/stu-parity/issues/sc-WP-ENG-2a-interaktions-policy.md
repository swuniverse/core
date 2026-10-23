# Reine Interaktions-Policy

**Status:** resolved
**Priority:** P1
**Size:** S
**Blocked by:** —

## Ziel

Eine injektionsfreie deklarative Policy entscheidet aus übergebenem Kontext und liefert `{ allowed: boolean, reason: string | null }`. Bestehende deutsche Ablehnungsmeldungen bleiben unverändert.

## Akzeptanzkriterien

- [x] Keine NestJS-, Repository- oder Entity-Importe.
- [x] Regeln für Position, Crew/Kampffähigkeit, Hyperraum, Schilde, Urlaub, Zerstörung, Blockade und Haltung.
- [x] Erste Ablehnung gewinnt; Unit-Tests je Regel und für Meldungserhalt.

## Comments

- Reine, deklarative Interaktions-Policy unter `apps/backend/src/modules/spacecraft/interaction-policy.ts` ergänzt. Sie wertet ausschließlich übergebenen Kontext und eine geordnete Regelliste aus; die Unit-Tests decken jede Regel, Meldungserhalt, selektive Regeln und First-Rejection-Wins ab. Die Anbindung an Laufzeitkontexte folgt in sc-WP-ENG-2b bis 2e.
