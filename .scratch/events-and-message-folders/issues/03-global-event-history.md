# 03: Globale Ereignishistory und Kartenlinks bereitstellen

**What to build:** Spielende können unter `/events` die globale Ereignishistory nach Typ und Text durchsuchen, das Ergebnislimit wählen, Typzähler sehen und über sichere Ortslinks zur passenden Karten- oder Systemansicht navigieren.

**Blocked by:** 01: Globale Ereignis-API absichern und durchsuchbar machen.

**Status:** resolved

- [ ] `/events` ist eine geschützte, über die primäre Navigation erreichbare Ereignishistory.
- [ ] Typfilter, Suche und Ergebnislimit werden als stabiler URL-Zustand verwendet.
- [ ] Die Seite zeigt Typzähler, absteigend sortierte Ergebnisse und einen klaren Leerzustand.
- [ ] Galaxie- und Systemorte führen nur dann zur passenden Kartenansicht, wenn keine ungewollte Erkundungsinformation offengelegt wird.
- [ ] Frontend- und Vertragstests prüfen Filter, Suche, Limit, Zähler, Leerzustand und Ortsnavigation.

## Comments

- Resolved on integration/events-and-message-folders.
