# Spielerbetriebene Handelsposten: Verwaltung in der Stationsansicht

**Status:** resolved
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

- [x] `PATCH trade/posts/:id { name, description }` ist nur für den Eigentümer erlaubt: Name 3–40 Zeichen, Beschreibung ≤ 1000, bereinigt.
- [x] Die Stationsansicht hat eine Box „Handelsposten“: Name, Netz, Lager (belegt/gesamt), Lizenzbedingung, Anzahl Lizenznehmer, Formulare für Umbenennen und Lizenzbedingung sowie einen Link zu `/trade`.
- [x] Backend-Tests: Rechte und Validierung. Frontend-Test: Box und Formulare.

## Comments

- 2026-11-13: Umgesetzt (d0c91470).
  - `PATCH trade/posts/:id { name?, description? }` (`TradePostManagementService.update`) nur für den Eigentümer, sonst „Handelsposten nicht gefunden“. Bereinigung wie STU `ChangeTradePostName` (`trim(strip_tags(...))`), Steuerzeichen werden zu Leerzeichen, in der Beschreibung bleiben Zeilenumbrüche erhalten. Name 3–40 Zeichen, Beschreibung ≤ 1000 Zeichen, jeweils nach der Bereinigung gezählt; mindestens ein Feld ist Pflicht. Schreibt unter Zeilensperre des Postens.
  - `GET trade/stations/:id/post` liefert für die eigene Station den an sie gebundenen Posten oder `null`; fremde Stationen ergeben „Station nicht gefunden“. Inhalt: Name, Beschreibung, Netz mit Namen („Handelsnetz von <Eigentümer>“), Lager des Eigentümers (belegt inkl. Angebotsreserven / gesamt), Lizenzbedingung, Anzahl gültiger Lizenzen wie STU `getLicenseCount` (inkl. Eigentümerlizenz) und die handelbaren Waren für das Bedingungsformular.
  - Lizenzbedingung und Lizenznehmerliste nutzen die bestehenden Routen aus tmw-T2 (`PUT trade/posts/:id/license-info`, `GET trade/posts/:id/licenses`).
  - Frontend: Box „Handelsposten“ (`StationTradePostPanel`) in der Stationsansicht mit Name, Netz, Lager, Lizenz, Lizenznehmern, Formularen „Umbenennen“ und „Bedingung speichern“ sowie Link „Zum Handel“ (`/trade?tab=posts&post=<id>`); ohne Posten erscheint keine Box.
  - Tests: `trade-post-management.int-spec.ts` (Rechte, Bereinigung, Längen, Teilaktualisierung, Box-Daten, abgelaufene Lizenzen, fremde Station, Station ohne Posten), `trade.controller.spec.ts`, `StationTradePostPanel.spec.tsx` (Schiff/ohne Posten, Anzeige, Umbenennen, Bedingung mit Serverfehler). Mutationsprobe (Eigentümerprüfung beim Umbenennen entfernt) lässt den Rechtetest scheitern.
  - Gates: Lint 0 Fehler (Warnungen unverändert 1442/110), Typecheck und Build grün; Backend-Unit 2084/2085, Frontend 750/751 – die Fehler sind die bekannten zeitabhängigen Flakes (`password-reset.service.spec.ts`, `PanelBuildingManagement.spec.tsx`), einzeln grün.
