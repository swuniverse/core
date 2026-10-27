# Dünner NestJS-Loader für Interaktionskontext

**Status:** ready-for-agent
**Priority:** P1
**Size:** S
**Blocked by:** —

## Ziel

Ein dünner NestJS-Adapter lädt Repository- und Resolver-Daten und formt daraus den reinen Policy-Kontext; er enthält keine Fachentscheidung.

## Akzeptanzkriterien

- [ ] Nur je Interaktion benötigte Daten laden.
- [ ] Keine Fachregeln außerhalb der Policy.
- [ ] Provider- und Mapper-Tests.

## Comments

- 2026-10-23: Implementierung nach zwei Prüfversuchen abgebrochen. Der verpflichtende Gesamttest scheitert reproduzierbar im bereits bestehenden `spacecraft-destruction.service.spec.ts`: Erwartet wird Wrackmodul `10101`, die aktuellen Spieldaten liefern `10201`. Loader-Implementierung und ihre drei Tests waren grün; Produktcode wurde gemäß Abbruchregel verworfen. Bitte Testfixture bzw. erwartete Commodity-ID mit den aktuellen Spieldaten abgleichen und das Issue danach erneut auf `ready-for-agent` setzen.
