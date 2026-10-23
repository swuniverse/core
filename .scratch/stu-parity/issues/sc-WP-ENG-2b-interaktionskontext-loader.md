# Dünner NestJS-Loader für Interaktionskontext

**Status:** claimed
**Priority:** P1
**Size:** S
**Blocked by:** sc-WP-ENG-2a

## Ziel

Ein dünner NestJS-Adapter lädt Repository- und Resolver-Daten und formt daraus den reinen Policy-Kontext; er enthält keine Fachentscheidung.

## Akzeptanzkriterien

- [ ] Nur je Interaktion benötigte Daten laden.
- [ ] Keine Fachregeln außerhalb der Policy.
- [ ] Provider- und Mapper-Tests.
