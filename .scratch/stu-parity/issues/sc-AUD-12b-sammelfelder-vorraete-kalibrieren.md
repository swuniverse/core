# Sammelfelder: Vorratsmengen kalibrieren

**Status:** ready-for-agent
**Priority:** P3
**Size:** S
**Blocked by:** sc-AUD-12a, col-AUD-12

## Ziel

Nach sc-AUD-12a haben Sammelfelder einen Vorrat mit vorläufigem Default. Die Höhe von `max_amount` je Ware und Feldtyp steht bei STU nur in der Datenbank (`stu_location_mining`). Sie soll an STU angeglichen oder ausdrücklich als SWU-eigene Balance festgelegt werden.

## STU-Quellen

- `src/Orm/Entity/LocationMining.php` (Werte nur in der STU-Datenbank, nicht im Repo)
- Datenanfrage Nr. 3 im Audit-README (aggregierte Abfrage `commodity_id`, Feldtyp, min/avg/max `max_amount`, Anzahl)

## SWU-Pfade

- Spieldaten bzw. Migration der Ortsvorräte aus sc-AUD-12a
- `apps/backend/src/modules/starmap/entities/galaxy-field-type.entity.ts` (`miningResources`), Karteneditor

## Akzeptanzkriterien

- [ ] `maxAmount` je Feldtyp/Ware gesetzt (STU-Werte oder dokumentierte SWU-Balance) und per Migration auf bestehende Vorräte angewandt, ohne laufende Vorräte über max zu heben.
- [ ] Werte im Karteneditor sichtbar bzw. pflegbar, soweit sc-WP-RES-1 die Feldtypen dort konfiguriert.
- [ ] Test, dass die Migration Bestände korrekt kappt bzw. auffüllt.

## Herkunft

- Audit 2026-11-17: [README.md](../audit-2026-11-17/README.md) Abschnitt I (Datenanfrage an STU, Punkt 3; Fallback „SWU-eigene Balance“).
- Gesplittet aus sc-AUD-12; blockiert durch die Datenanfrage col-AUD-12.

## Comments

- Die offene Datenfrage (STU-Werte oder SWU-eigene Balance) wird in col-AUD-12 geklärt; dieses Ticket setzt nur deren Antwort um.
