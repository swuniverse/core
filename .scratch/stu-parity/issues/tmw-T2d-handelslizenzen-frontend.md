# Handelslizenzen: Frontend-Integration

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** tmw-T2b, tmw-T2c, tmw-T1d

## Ziel

Handelsseite und Schiffsdetail machen eigene Lizenzen, Eigentümerverwaltung, Kauf und Verlängerung vollständig bedienbar.

## STU-Quellen

- `src/html/trade/license/*`
- `src/Module/Trade/View/ShowLicenseMenu/*`, `ShowLicenseList/*`, `ShowLicenseInfo/*`
- `src/Module/Ship/View/ShowTradeMenuPayment/*`

## SWU-Pfade

- `apps/frontend/src/pages/trade.tsx`
- `apps/frontend/src/pages/spacecraft-detail.tsx`
- Shared Trade-DTOs unter `packages/shared/`

## Akzeptanzkriterien

- [x] Die Handelsseite zeigt eigene Lizenzen mit Posten, Handelsnetz und Ablaufzeit.
- [x] Posteneigentümer können Lizenzbedingungen bearbeiten und ausschließlich ihre ausgestellten Lizenzen sehen.
- [x] Kaufdialog bietet nur zulässige eigene Zahlschiffe und Warenkonten mit ausreichendem Bestand an.
- [x] Eine bestehende Lizenz kann mit Anzeige der aktuellen Bedingung und des resultierenden Ablaufs verlängert werden.
- [x] Das Schiffsdetail zeigt am passenden Posten den Einstieg „Handelsmenü“; unzulässige Situationen erklären den Ablehnungsgrund.
- [x] Frontend-Tests decken Lizenzliste, Eigentümerverwaltung, beide Kaufquellen, Verlängerung und Fehlerdarstellung ab.

## Entscheidung

Das Frontend bildet ausschließlich serverseitig autorisierte Optionen ab; Sicherheits- und Bestandsprüfungen bleiben verbindlich im Backend.

## Comments

- 2026-11-12: Umgesetzt.
  - Backend-Lesemodell, weil der Lizenzpreis bisher nur für den Eigentümer lesbar war: `GET trade/posts/:id/license-menu?shipId=` (`TradeLicenseMenuService`) liefert Bedingung mit Warenname, eigene gültige Lizenz, resultierenden Verlängerungsablauf, zulässige Zahlschiffe (eigen, am Posten nach Presence-Policy, Fracht deckt den Preis), zulässige Warenkonten (eigen, gleiches Netz, Bestand deckt den Preis), einen Ablehnungsgrund für den Kauf sowie für den Eigentümer die handelbaren Preiswaren. `GET trade/spacecraft/:id/post` meldet den Posten am Schiffsort samt Grund, warum das Schiff ihn gerade nicht nutzen kann. Die Presence-Policy liefert dafür `reason()` (Fremdschiff, anderer Ort, Flug, Hyperantrieb, Tarnung). Kauf- und Verlängerungsendpunkte bleiben verbindlich.
  - Frontend: Tab „Lizenzen“ auf `/trade` (Posten, Netz, Ablauf); `TradeLicensePanel` in der Posteninfo mit Kauf (Radio-Auswahl der Zahlquellen), Verlängerung (Warenkonto, aktuelle Bedingung, neuer Ablauf), Ablehnungs- und Fehlermeldungen sowie Lizenzverwaltung nur für Eigentümer (Bedingung bearbeiten, ausgestellte Lizenzen). Das Schiffsdetail zeigt über `TradePostEntry` am Posten den Einstieg „Handelsmenü“ (`/trade?tab=posts&post=…&ship=…`) oder den Ablehnungsgrund.
  - Prüfungen: `trade-license-menu.int-spec.ts` (5 Tests: Quellenfilter, Ablehnungsgründe, gültige Lizenz mit Verlängerungsablauf, Eigentümerwaren, Posten am Schiff); Presence-Gründe und Controller-Routen unit-getestet; Frontend `trade.spec.tsx` (Lizenzliste, Kauf aus Fracht und Konto, Fehlerdarstellung, Ablehnungsgrund, Verlängerung, Eigentümerverwaltung, keine Verwaltung für Fremde) und `TradePostEntry.spec.tsx` (Link, Grund, kein Posten). Handels-Integrationssuiten und App-Boot 4/24 grün. `nx run-many -t lint typecheck build -p shared backend frontend` grün (Warnungen unverändert); Backend 2028/2028; Frontend 699/699.
