# Handelslizenzen: Frontend-Integration

**Status:** ready-for-agent
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

- [ ] Die Handelsseite zeigt eigene Lizenzen mit Posten, Handelsnetz und Ablaufzeit.
- [ ] Posteneigentümer können Lizenzbedingungen bearbeiten und ausschließlich ihre ausgestellten Lizenzen sehen.
- [ ] Kaufdialog bietet nur zulässige eigene Zahlschiffe und Warenkonten mit ausreichendem Bestand an.
- [ ] Eine bestehende Lizenz kann mit Anzeige der aktuellen Bedingung und des resultierenden Ablaufs verlängert werden.
- [ ] Das Schiffsdetail zeigt am passenden Posten den Einstieg „Handelsmenü“; unzulässige Situationen erklären den Ablehnungsgrund.
- [ ] Frontend-Tests decken Lizenzliste, Eigentümerverwaltung, beide Kaufquellen, Verlängerung und Fehlerdarstellung ab.

## Entscheidung

Das Frontend bildet ausschließlich serverseitig autorisierte Optionen ab; Sicherheits- und Bestandsprüfungen bleiben verbindlich im Backend.
