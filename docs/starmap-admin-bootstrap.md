# Starmap Admin Bootstrap

## Ziel

STU-naher manueller Kartenaufbau.

Kein Pflicht-Generator.
Admin baut Layer, Grid, Sektoren, Systeme und Systemfelder schrittweise auf.

## Wie STU das macht

Aus `st-universe/core`:

- Karteneditor ist Teil des normalen Admin-Web-UIs
- Karte wird in **20x20 Sektionen** bearbeitet
- Galaxy-Felder werden feldweise oder sektionsweise gepflegt
- Systeme werden auf Galaxy-Feldern markiert
- danach können leere Systeme **batchweise** erzeugt werden
- Systemfelder werden separat im Systemeditor bearbeitet

Relevante STU-Dateien:

- `src/Module/Admin/View/Map/ShowMapEditor.php`
- `src/Module/Admin/View/Map/EditSection/EditSection.php`
- `src/Module/Admin/Action/Map/EditField/EditField.php`
- `src/Module/Admin/View/Map/ShowSystemEditField/ShowSystemEditField.php`
- `src/Module/Admin/Action/Map/EditSystemField/EditSystemField.php`
- `src/Module/Admin/Action/Map/GenerateEmptySystems/GenerateEmptySystems.php`
- `src/Component/StarSystem/GenerateEmptySystems.php`

## Was wir davon übernehmen

### Direkt

- 20x20 Sektor-/Sektionen-Denke
- manuelles Authoring zuerst
- getrennte Galaxy- und System-Editorlogik
- Feldtyp als zentrales Bearbeitungsobjekt
- Admin-only Zugriff

### Vorläufig nicht

- automatische Batch-Systemerzeugung als Standardpfad
- Bildgenerierung wie `ShowMapOverall`
- volle Regionen-/Grenzen-/Influence-Area-Featuretiefe

## Setup

### 1. Admin-User setzen

```sql
UPDATE users
SET "isAdmin" = true
WHERE username = 'admin';
```

### 2. Default Field Types anlegen

```http
POST /starmap/admin/field-types/ensure-defaults
Authorization: Bearer <admin-token>
```

### 3. Layer anlegen

```http
POST /starmap/admin/layers
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "Galaxy",
  "width": 120,
  "height": 120,
  "sectorSize": 20,
  "isDefault": true,
  "isColonizable": true,
  "isNoobZone": false,
  "isFinished": false,
  "isHidden": false
}
```

### 4. Layer-Grid initialisieren

```http
POST /starmap/admin/layers/1/initialize-grid
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "defaultFieldTypeId": 1
}
```

### 5. Sektoren grob füllen

```http
POST /starmap/admin/sectors/fill
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "layerId": 1,
  "sectorX": 0,
  "sectorY": 0,
  "fieldTypeId": 3,
  "factionZone": "REBEL",
  "adminRegionKey": "rebel-core-1"
}
```

### 6. Einzelfelder fein nachbearbeiten

```http
PATCH /starmap/admin/fields/123
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "fieldTypeId": 2,
  "factionZone": "REBEL",
  "adminRegionKey": "yavin-sector"
}
```

### 7. Sternsystem auf Feld setzen

```http
POST /starmap/admin/systems
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "layerId": 1,
  "name": "Yavin",
  "cx": 12,
  "cy": 7,
  "systemTypeId": 1,
  "maxX": 22,
  "maxY": 22
}
```

### 8. System-Grid initialisieren

```http
POST /starmap/admin/systems/1/initialize-grid
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "defaultFieldTypeId": 1
}
```

### 9. Systemfelder fein nachbearbeiten

```http
PATCH /starmap/admin/system-fields/1
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "fieldTypeId": 4,
  "celestialObjectId": null
}
```

## Nächste sinnvolle Schritte

- Admin-Frontend für 20x20 Sektion bauen
- Sektorübersicht mit Feldfarben bauen
- `FieldType` Katalog erweitern
- optional später: batchweise Systeminitialisierung wie STU
