# Handelslizenzen: Verlängerung, Ablauf und Abfragen

**Status:** resolved
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

- [x] Verlängerung bezahlt die aktuell konfigurierte Bedingung aus einem eigenen Warenkonto desselben Netzes und setzt den neuen Ablauf auf `max(jetzt, aktueller Ablauf) + konfigurierte Tage`.
- [x] Abbuchung, Eigentümergutschrift und Ablaufänderung erfolgen in einer gemeinsamen Datenbanktransaktion.
- [x] Ein täglicher Maintenance-Handler sendet beim erstmaligen Eintritt in das Sieben-Tage-Fenster genau eine Warnung und löscht abgelaufene Lizenzen.
- [x] Eine Lizenz ist genau bis zu ihrem Ablaufzeitpunkt gültig; ab diesem Zeitpunkt gewährt sie keine Handels- oder Netzrechte mehr und wird beim nächsten Lauf gelöscht.
- [x] `GET trade/licenses` liefert die eigenen gültigen Lizenzen samt Ablauf.
- [x] `GET trade/posts/:id/licenses` ist ausschließlich für den Posteneigentümer zugänglich und liefert dessen ausgestellte Lizenzen.
- [x] Preisänderungen wirken auf spätere Verlängerungen; der bereits gespeicherte Ablauf bleibt bis dahin unverändert.
- [x] Backend-Tests decken frühe und verspätete Verlängerung, Zahlung, Autorisierung, Warnung genau einmal und Ablaufgrenzen ab.

## Entscheidung

Anders als STU verkürzt eine frühe Verlängerung die Restlaufzeit nicht. Warnungen werden nicht täglich wiederholt, und abgelaufene Zeilen gewähren bereits vor der physischen Bereinigung keine Rechte.

## Comments

- 2026-11-12: Umgesetzt.
  - Verlängerung: `TradeLicensePurchaseService.renew` und `POST trade/posts/:id/licenses/renewal` mit `{ accountPostId }`. Wie STU `RenewTradeLicense` aus dem Kontenmenü ohne Schiff am Posten, bezahlt aber aus einem beliebigen eigenen Warenkonto desselben Netzes zur aktuell konfigurierten Bedingung. Neuer Ablauf `max(jetzt, Ablauf) + Tage`, Warnzeitpunkt wird zurückgesetzt. Abbuchung, Eigentümergutschrift und Ablaufänderung in einer Transaktion (gleiche Sperrreihenfolge wie beim Kauf); der Eigentümer erhält eine Handelsmeldung nach Commit. Auch eine abgelaufene, noch nicht bereinigte Lizenz lässt sich verlängern (verspätete Verlängerung).
  - Wartung: `TradeLicenseMaintenanceService` (Handler `trade-licenses`, im `TickModule` registriert, läuft täglich um 3 Uhr Spielzeit). Löscht Lizenzen ab ihrem Ablaufzeitpunkt mit Ablaufmeldung und warnt genau einmal beim Eintritt in das Sieben-Tage-Fenster (`warningSentAt`); beide Meldungen nennen wie STU den aktuellen Lizenzpreis. Ordner System wie STU `SPECIAL_SYSTEM`.
  - Abfragen: `GET trade/licenses` (eigene gültige Lizenzen) und `GET trade/posts/:id/licenses` (nur Posteneigentümer, gültige ausgestellte Lizenzen). Gültig heißt `expiresAt > jetzt`; abgelaufene Zeilen gewähren vor der Bereinigung nichts. Verträge `TradeLicenseDto` und `IssuedTradeLicenseDto` in `packages/shared`.
  - Prüfungen: `trade-license-lifecycle.int-spec.ts` (7 Tests: frühe/späte Verlängerung, Preisänderung, Autorisierung und Fehlerfälle ohne Seiteneffekte, Warnung genau einmal mit Ablaufgrenze, beide Abfragen); Mutationsprobe (Filter `warningSentAt` entfernt) lässt den Wartungstest scheitern; Kaufsuite weiter grün (zusammen 17/17), App-Boot-HTTP-Test grün. `nx run-many -t lint typecheck build -p shared backend frontend` grün (Warnungen unverändert); Backend 2022/2022.
  - Hinweis für `tmw-T2d`/`tmw-T3`: `licenseStatus` in `GET trade/posts` leitet sich weiterhin aus Warenkonten ab, nicht aus Lizenzen.
