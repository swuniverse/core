# Interdiktornetz: Implosion und Gesamtabnahme

**Status:** ready-for-agent
**Priority:** P3
**Size:** M
**Blocked by:** sc-WP-SPEC-1b

## Ziel

Der Netzeigner kann ein fertiges Netz explizit implodieren lassen. Gemeinsame Kampfschaden-/Zerstörungslogik, vollständige Nachrichten und die verdichtete Schiffsoberfläche schließen SPEC-1 ab.

## STU-Quellen

Pfade relativ zu `../../st-universe/core/src/`:
- `Module/Ship/Action/TholianWeb/ImplodeTholianWeb.php`
- `Module/Spacecraft/Lib/Battle/Weapon/TholianWebWeaponPhase.php`
- `Module/Spacecraft/Lib/Destruction/Handler/TholianWebDestruction.php`

## SWU-Pfade

Netzdienst aus 1a/b, `combat/` (gemeinsame Schadenanwendung), `spacecraft-destruction.service.ts`, `messaging/`, `ShipQuickActions.tsx`, `FieldContextPanel.tsx`, Shared-DTOs.

## Akzeptanzkriterien

- [ ] Implosion verlangt Netz-Eigentum, fertigen aktiven Status und qualifizierten intakten Erbauerprojektor gemäß 1a. Fremde, unfertige oder schon terminale Netze verweigern die Aktion ohne Schaden.
- [ ] Je noch zulässigem gebundenem Ziel STU-Schaden: ceil(randomInteger(65,85) × maxHull / 100), Energiewaffenschaden mit 25 % Kritchance. Injizierbarer RNG, gemeinsame aktuelle Schaden-/Schild-/System-/Zerstörungslogik; kein direkter pauschaler Hull-UPDATE. Gültiger Urlaubsschutz wird erneut geprüft, geschützte Ziele schadlos freigegeben.
- [ ] Netz und Zielverweise werden genau einmal freigegeben, Überlebende konsistent gespeichert; zerstörte Schiffe erhalten Crew-/Fracht-/Flottenbereinigung über den vorhandenen Zerstörungsdienst und werden nicht wiederbelebt.
- [ ] Jeder Zieleigner erhält seine eigenen Folgen als Meldung, Erbauer sieht das Ergebnis. Bericht/Historiendaten bleiben nach Netzlöschung nachvollziehbar; keine zusätzlichen Prestige-/Beutequellen erfinden.
- [ ] Gleichzeitige Implosion/Auflösung/Tick erzeugt weder doppelten Schaden noch doppelte Meldungen. Schaden, Status, Historie und transaktionale Nachrichten rollen bei Fehler gemeinsam zurück.
- [ ] Verdichtete Schiff-UI zeigt Aufbau/Unterstützer/Countdown, aktive Gefangene und Eigentümeraktionen mit Kosten/Gründen. Implosion benötigt ausdrückliche destruktive Bestätigung; fremde Spieler sehen ihren Fangstatus und den Bewegungsgrund.
- [ ] Deterministische Service-/PostgreSQLtests prüfen minimale/maximale RNG-Werte, Kritchance, Schilde/Systemschaden, Urlaubsschutz, Zerstörung, Mehrziele, Eigentum, Konkurrenz und Rollback; Frontend testet Bestätigung und API.
- [ ] End-to-End-Abnahme aller ursprünglichen SPEC-1-Kriterien dokumentiert, Pflichtprüfungen der betroffenen Projekte grün. Parent bleibt Tracking-Split, die Feature-Fertigstellung wird nach Abschluss aller Kinder in der Map ergänzt.

## Comments

- 2026-11-16 – Triage: Kind des Tracking-Splits [SPEC-1](sc-WP-SPEC-1-interdiktornetz.md). Vorschläge sind erst nach Freigabe verbindlich; kein Produktcode geändert. Siehe [Audit](../triage-2026-11-16.md).
