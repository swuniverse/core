# Feldeffekte, Teil 2c: Sperren (kein Messpunkt, kein Stationsbau, keine Subraumspuren, keine Anomalien)

**Status:** resolved
**Priority:** P2
**Size:** S
**Blocked by:** tmw-K1a

## Ziel

Die Sperr-Effekte werden durchgesetzt. Felder mit `NO_MEASUREPOINT` werden nie als Kartographie-Messpunkt gewählt. `NO_STATION_CONSTRUCTION` verbietet den Stationsbau, `NO_SUBSPACE_LINES` unterdrückt Flugsignaturen bzw. ihre Anzeige, `NO_ANOMALIES` verhindert das Entstehen von Anomalien. Teile, deren Verbraucher noch fehlen, werden als Prüffunktion bereitgestellt und von den späteren Issues (sc-WP-STAT-1a/1b, sc-WP-NAV-2a, tmw-K10a) verwendet.

## STU-Quellen

- `src/Lib/Map/FieldTypeEffectEnum.php`
- `src/Module/Ship/Action/BuildConstruction/BuildConstruction.php` (Meldung „In diesem Sektor kann keine Station errichtet werden“)
- `src/Lib/Map/VisualPanel/Layer/Data/AbstractSubspaceData.php` (`NO_SUBSPACE_LINES`)
- `src/Orm/Repository/LocationRepository.php` (Anomalie-Erzeugung schließt `NO_ANOMALIES` aus), Messpunktauswahl in `AstroMapping`

## SWU-Pfade

- `apps/backend/src/modules/spacecraft/spacecraft.service.ts` (Messpunktauswahl ~Z. 640–670, filtert heute nur `damage <= 0`), `cartography-plan.service.ts`
- `apps/backend/src/modules/starmap/entities/galaxy-field-type.entity.ts`, `system-field.entity.ts`
- Effekt-Katalog aus tmw-K1a

## Akzeptanzkriterien

- [x] Die Messpunktauswahl schließt Felder mit `NO_MEASUREPOINT` aus (Feldtyp oder Feld-Flag). Bestehende Kartographiepläne bleiben gültig, betroffen sind nur neu erzeugte.
- [x] Ein zentraler Dienst `FieldEffectQuery.has(field, effect)` ist bereitgestellt und dokumentiert. sc-WP-STAT-1a/1b, sc-WP-NAV-2a und tmw-K10a nutzen ihn für `NO_STATION_CONSTRUCTION`, `NO_SUBSPACE_LINES` und `NO_ANOMALIES`. Sind diese Verbraucher bei Umsetzung schon vorhanden, werden sie hier angeschlossen.
- [x] Backend-Tests: Die Messpunktauswahl überspringt gesperrte Felder, und der Abfragedienst erkennt Effekte aus Feldtyp und Feld-Flags.

## Comments

`FieldEffectQuery` wertet Feld- und Feldtyp-Effekte zentral aus. Neue Kartographiepläne filtern `NO_MEASUREPOINT`; der vorhandene Stationsbau nutzt den Dienst für `NO_STATION_CONSTRUCTION`. Verbraucher für `NO_SUBSPACE_LINES` und `NO_ANOMALIES` sind noch nicht vorhanden und können den exportierten Dienst in ihren Folgeissues verwenden.
