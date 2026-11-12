# Ionensturm: Wirkung auf Schiffe und Stationen

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** tmw-K10b1

## Ziel

Zweites Child aus `tmw-K10b`. Schiffe in Sturmfeldern erleiden je Tick Schaden, Stationen verlieren ihre Schilde, beim Einflug fällt der Antrieb zeitweise aus und es gibt bis zu 20 % Schaden. Dafür entsteht ein gemeinsamer Schadensdienst nach STU `ApplyDamage`, den `tmw-K1b2` wiederverwenden kann.

## STU-Quellen

- `src/Component/Anomaly/Type/IonStorm/IonStormHandler.php` (`damageSpacecrafts`, `deactivateShields`, `deactivateDrive`, `damageSpacecraft`, `getHullDamageFactor`, `handleIncomingSpacecraft`)
- `src/Module/Spacecraft/Lib/Damage/ApplyDamage.php`, `DamageWrapper.php`, `SystemDamage.php`
- `src/Module/Control/StuRandom.php` (asymmetrische Verteilung für den Antriebsausfall)

## SWU-Pfade

- `apps/backend/src/modules/anomaly/ion-storm.handler.ts`
- neuer Schadensdienst unter `apps/backend/src/modules/spacecraft/`
- `spacecraft-runtime-state.service.ts`, `spacecraft-destruction.service.ts` (`finalizeInManager` mit Grund Anomalie)
- Antriebsprüfungen in `spacecraft.service.ts` und `wormhole-passage-planner.ts`

## Akzeptanzkriterien

- [ ] Gemeinsamer Schadensdienst nach STU `ApplyDamage`: Schilde absorbieren mit Schildfaktor `100 − Schildstufe × 10`, Hüllenschaden mit Hüllenfaktor über die Hüllenmodul-Stufe (8 % je Stufe, mit Ionensturm-Schutz 16 %), Kritischer Treffer 1:21 mit Systemschaden an den Zielsystemen, Zerstörung über den Zerstörungsdienst (neuer Grund Anomalie) mit Meldung.
- [ ] Je Tick erhalten Schiffe in Sturmfeldern mit mehr als einem Restticks Schaden `ceil(rand(1, 10, normalverteilt) × maxHull × Intensität / 10000)`; Stationen verlieren nur aktive Schilde. Besitzer im Urlaubsmodus sind ausgenommen. Jeder Besitzer erhält eine Meldung je Fahrzeug.
- [ ] Beim Einflug: Meldung, Antriebsausfall und Schaden mit bis zu 20 %.
- [ ] Antriebsausfall zeitbasiert wie STU: Hyperantrieb (sonst Impulsantrieb) wird deaktiviert, Cooldown als Zeitstempel `jetzt + rand(0, 3600 s, asymmetrisch um 600 s)`. Die Antriebsprüfungen (Aktivieren, Fliegen, System verlassen, Wurmloch) werten Zeitstempel-Cooldowns zeitbewusst aus; bestehende Zähler-Cooldowns bleiben gültig.
- [ ] Backend-Tests mit deterministischem Zufall: Tickschaden Schiff/Station, Schildabsorption, Krit mit Systemschaden, Zerstörung, Einflugschaden, Antriebsausfall und sein Ablauf.
- [ ] `lint`, `typecheck`, `test` und `build` sind grün.

## Entscheidung

Product Owner, 2026-11-12: voller STU-Port des Schadens als wiederverwendbarer Dienst; Antriebsausfall zeitbasiert wie STU.

## Comments

- 2026-11-12: Aus `tmw-K10b` abgespalten.
