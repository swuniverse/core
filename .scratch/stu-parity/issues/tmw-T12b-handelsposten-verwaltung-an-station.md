# Spielerbetriebene Handelsposten: Verwaltung in der Stationsansicht

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** tmw-T12a, sc-WP-STAT-2

## Ziel

Der Eigentümer verwaltet seinen Handelsposten aus der Stationsansicht: Name und Beschreibung ändern, Lizenzbedingung setzen, Lizenznehmer einsehen, Lager und Belegung sehen. Die Stationsansicht zeigt den Posten mit Link zur Handelsseite. Das automatische Lesen der Dock-Nachrichten gehört zu sc-WP-STAT-3a/3b und ist hier nicht enthalten.

## STU-Quellen

- `src/Module/Trade/Action/ChangeTradePostName/*` (nur der Eigentümer, Länge und Bereinigung)
- `src/Module/Trade/View/ShowTradePostInfo/*`, `ShowLicenseMenu/*`, `src/html/station/*` (Postenbox der Station)

## SWU-Pfade

- Stationsansicht aus sc-WP-STAT-2
- Modul `apps/backend/src/modules/trade/`

## Akzeptanzkriterien

- [ ] `PATCH trade/posts/:id { name, description }` ist nur für den Eigentümer erlaubt: Name 3–40 Zeichen, Beschreibung ≤ 1000, bereinigt.
- [ ] Die Stationsansicht hat eine Box „Handelsposten“: Name, Netz, Lager (belegt/gesamt), Lizenzbedingung, Anzahl Lizenznehmer, Formulare für Umbenennen und Lizenzbedingung sowie einen Link zu `/trade`.
- [ ] Backend-Tests: Rechte und Validierung. Frontend-Test: Box und Formulare.

## Comments
