# Handels-Shoutbox je Netzwerk

**Status:** needs-info
**Priority:** P2
**Size:** S
**Blocked by:** tmw-T2

## Ziel

Jedes Handelsnetz hat eine Shoutbox: eine kurze Chatliste mit den letzten Einträgen. Schreiben und Lesen darf, wer eine Lizenz an einem Posten des Netzes hat.

## STU-Quellen

- `src/Module/Trade/Action/AddShoutBoxEntry/*` (`hasLicenseByUserAndNetwork`, Länge, Bereinigung alter Einträge)
- `src/Module/Trade/View/ShowShoutBox/*`, `ShowShoutBoxList/*`
- `src/Orm/Entity/TradeShoutbox.php`

## SWU-Pfade

- Modul `apps/backend/src/modules/trade/`
- BBCode bzw. Textbereinigung: `apps/frontend/src/components/BbCodeText.tsx`, Muster aus `apps/backend/src/modules/holonet/`
- Frontend: `apps/frontend/src/pages/trade.tsx`

## Akzeptanzkriterien

- [ ] Entität `TradeShoutboxEntry` (Netz, Spieler, Zeit, Text ≤ 200 Zeichen). `POST/GET trade/networks/:id/shoutbox` nur mit Lizenz im Netz. Je Netz werden die letzten 30 Einträge aufbewahrt (ältere werden gelöscht). Es gibt eine Ratenbegrenzung, und der Text wird von HTML bereinigt.
- [ ] Die Handelsseite zeigt je Netz eine Shoutbox-Box (Zeit, Spielerlink, Text) mit Eingabefeld. Sie aktualisiert sich beim Öffnen und nach dem Senden.
- [ ] Backend-Tests: Lizenzpflicht, Längen- und Anzahlgrenze, Bereinigung. Frontend-Test: Senden und Anzeige.

## Comments

- 2026-11-02: Umsetzung lokal vollständig (Entity/Migration, lizenzgeschützte GET/POST-API, HTML-Bereinigung, 200-Zeichen-/30-Einträge-Grenze, Rate-Limit und Handelsseiten-UI). Fokussierte Backend- und Frontend-Tests sowie alle Builds sind grün. Der verpflichtende `nx affected`-Gate bleibt nach zwei ernsthaften Läufen an fachfremden, bereits vorhandenen Backend-Baselinefehlern rot: Typecheck in `field-effect-consequence.spec.ts`, `wreck-decay.service.spec.ts` und `tutorial.service.spec.ts`; außerdem sechs bestehende Spacecraft-/Tick-Tests. Produktcode wurde gemäß Abbruchregel verworfen. Bitte Baseline reparieren und Issue erneut auf `ready-for-agent` setzen.
