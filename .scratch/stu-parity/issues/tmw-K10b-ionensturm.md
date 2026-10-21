# Ionensturm

**Status:** ready-for-agent
**Priority:** P2
**Size:** M
**Blocked by:** tmw-K10a

## Ziel

Ionenstürme als zweiter Anomalietyp: Ein Wurzelobjekt mit Richtung, Geschwindigkeit und Intensität bewegt sich über die Karte, breitet sich auf Nachbarfelder aus und verschwindet wieder. Schiffe im Sturm erleiden je Tick Rumpfschaden abhängig von der Intensität, ihre Schilde fallen aus, und ihre Antriebe gehen zeitweise offline. Beim Einflug gibt es bis zu 20 % Schaden.

## STU-Quellen

- `src/Component/Anomaly/Type/IonStorm/IonStormHandler.php` (`checkForCreation` mit maximaler Sturmzahl, `damageSpacecrafts`, `deactivateShields`, `deactivateDrive` mit Cooldown um 30 Min., `damageSpacecraft` `rand(1, pct) × maxHull × intensity / 10000`, Krit 1:21, Einflug 20 %)
- `.../IonStormData.php`, `IonStormMovement.php`, `IonStormMovementType.php`, `IonStormPropagation.php` (Ausbreitung 1–3, Split 10–90 %, Tickübertrag 20–70 %), `LocationPool*.php`
- Asset `st-universe/assets/anomalies/2.png`

## SWU-Pfade

- Framework aus tmw-K10a
- `apps/backend/src/modules/spacecraft/spacecraft-runtime-state.service.ts` (System-`cooldown` für `WARPDRIVE`/`SUBLIGHT_DRIVE`, `SHIELDS`), `spacecraft-destruction.service.ts`
- `apps/backend/src/modules/starmap/entities/galaxy-field.entity.ts`, `space-location.entity.ts`

## Akzeptanzkriterien

- [ ] Der Ionensturm-Handler ist im Register aus tmw-K10a eingetragen. Die maximale Sturmzahl je Ebene ist konfigurierbar. Neue Stürme entstehen nur auf passierbaren Galaxiefeldern ohne `NO_ANOMALIES`.
- [ ] Bewegung und Ausbreitung folgen den STU-Regeln (Richtung und Geschwindigkeit in den Daten der Wurzel, Ausbreitung auf Nachbarn, Übertrag der Restticks). Der Sturm bleibt auf der Ebene und auf passierbaren Feldern.
- [ ] Je Tick erhalten Schiffe auf Sturmfeldern Rumpfschaden nach der STU-Formel (Schilde dämpfen ihn), die Schilde werden abgeschaltet, und der aktive Antrieb erhält einen Cooldown. Ein zerstörtes Schiff läuft über den Zerstörungsdienst.
- [ ] Beim Einflug gibt es bis zu 20 % Schaden mit Meldung.
- [ ] Anzeige in LSS und Feldkontext als Sturmfelder mit Intensität. Die Navigation warnt beim Ziel im Sturm.
- [ ] Backend-Tests mit deterministischem Zufall: Erzeugung, Bewegung, Ausbreitung, Tickschaden, Einflugschaden, Antriebsausfall. Frontend-Test: Darstellung im LSS.

## Comments
