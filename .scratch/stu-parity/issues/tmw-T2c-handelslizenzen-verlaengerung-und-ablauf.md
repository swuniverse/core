# Handelslizenzen: Verlängerung, Ablauf und Abfragen

**Status:** ready-for-agent
**Priority:** P2
**Size:** S
**Blocked by:** tmw-T2b, sh-AP-07a

## Ziel

Handelslizenzen lassen sich ohne Zeitverlust verlängern, werden vor Ablauf einmalig angekündigt und nach Ablauf täglich bereinigt. Spieler und Posteneigentümer erhalten geschützte Übersichten.

## STU-Quellen

- `src/Module/Trade/Action/RenewTradeLicense/*`
- `src/Module/Trade/View/ShowLicenseList/*`, `ShowLicenseInfo/*`
- `src/Module/Maintenance/OldTradeLicenseDeletion.php`

## SWU-Pfade

- `apps/backend/src/modules/trade/`
- `apps/backend/src/modules/tick/`
- `apps/backend/src/modules/messaging/messaging.service.ts`

## Akzeptanzkriterien

- [ ] Verlängerung bezahlt die aktuell konfigurierte Bedingung aus einem eigenen Warenkonto desselben Netzes und setzt den neuen Ablauf auf `max(jetzt, aktueller Ablauf) + konfigurierte Tage`.
- [ ] Abbuchung, Eigentümergutschrift und Ablaufänderung erfolgen in einer gemeinsamen Datenbanktransaktion.
- [ ] Ein täglicher Maintenance-Handler sendet beim erstmaligen Eintritt in das Sieben-Tage-Fenster genau eine Warnung und löscht abgelaufene Lizenzen.
- [ ] Eine Lizenz ist genau bis zu ihrem Ablaufzeitpunkt gültig; ab diesem Zeitpunkt gewährt sie keine Handels- oder Netzrechte mehr und wird beim nächsten Lauf gelöscht.
- [ ] `GET trade/licenses` liefert die eigenen gültigen Lizenzen samt Ablauf.
- [ ] `GET trade/posts/:id/licenses` ist ausschließlich für den Posteneigentümer zugänglich und liefert dessen ausgestellte Lizenzen.
- [ ] Preisänderungen wirken auf spätere Verlängerungen; der bereits gespeicherte Ablauf bleibt bis dahin unverändert.
- [ ] Backend-Tests decken frühe und verspätete Verlängerung, Zahlung, Autorisierung, Warnung genau einmal und Ablaufgrenzen ab.

## Entscheidung

Anders als STU verkürzt eine frühe Verlängerung die Restlaufzeit nicht. Warnungen werden nicht täglich wiederholt, und abgelaufene Zeilen gewähren bereits vor der physischen Bereinigung keine Rechte.
