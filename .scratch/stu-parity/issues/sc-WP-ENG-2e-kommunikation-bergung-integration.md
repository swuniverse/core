# Policy in Kommunikation und Bergung integrieren

**Status:** needs-info
**Priority:** P1
**Size:** S
**Blocked by:** sc-WP-ENG-2a, sc-WP-ENG-2b

## Ziel

Kommunikation und Wrackbergung nutzen Loader und Policy ohne Verhaltensverlust.

## Offene Frage

Soll sc-WP-ENG-2e erst wieder freigegeben werden, nachdem der blockierende Kontext-Loader sc-WP-ENG-2b implementiert und als resolved markiert wurde?

## Akzeptanzkriterien

- [ ] Strukturierte Ergebnisse und bestehende Meldungen verwenden.
- [ ] Traktor-Hook dokumentiert; Integrationstests vorhanden.

## Comments

- 2026-10-23: Beim Verstehen festgestellt, dass der deklarierte Blocker sc-WP-ENG-2b weiterhin `needs-info` ist und sein Produktcode gemäß Abbruchregel verworfen wurde; im Repository existiert daher kein Interaktionskontext-Loader, den Kommunikation und Wrackbergung integrieren könnten. Umsetzung bis zur Auflösung von sc-WP-ENG-2b blockiert.
