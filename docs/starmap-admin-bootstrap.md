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

## Automatische Nebelgebiete (optional)

Im Vollkarteneditor öffnet **Nebelgebiete erzeugen** eine schreibfreie Vorschau für die ausgewählte Ebene. Seed, Ziel (Galaxie, Systeme oder beide) und Flächenanteil sind einstellbar. Standard: `swu-nebula-v1`, beide Ebenen, ausgewogen. Die Vorschau zeigt Feldkosten, Schäden und Ressourcen; erst **Anwenden** schreibt die Änderungen gemeinsam. Ändert sich der Kartenstand zwischenzeitlich, muss eine neue Vorschau erzeugt werden.

Die Erzeugung ergänzt ausschließlich gewöhnliche freie Weltraumfelder. Startsysteme, Wurmlöcher, Hyperraumrouten, Himmelskörper, alle Systemränder als mögliche Eintrittspositionen, belegte Felder und individuelle Feldeinstellungen werden geschützt. Vorhandene Nebel und anderes Sondergelände bleiben erhalten. Derselbe Seed und dieselbe Dichte erzeugen beim erneuten Anwenden keine weiteren Nebelfelder.

Verwendet werden vorhandene sehr dünne, dünne und mittlere Nebeltypen mit ihren bestehenden Spielwerten. Es gibt keine automatische Bestandsmigration und keine Änderung beim Laden der Karte. `MAP_EDITOR` berechtigt zu beiden Endpunkten:

```http
POST /starmap/admin/layers/:id/nebula/preview
{ "seed": "swu-nebula-v1", "target": "BOTH", "density": "BALANCED" }

POST /starmap/admin/layers/:id/nebula/apply
{ "seed": "swu-nebula-v1", "target": "BOTH", "density": "BALANCED", "fingerprint": "<aus der Vorschau>" }
```
