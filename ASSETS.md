# Asset System Setup

## Übersicht

Das Star Wars - HoloNet Projekt verwendet ein externes Asset-Repository für Planeten-Bilder und andere grafische Ressourcen.

## Asset Repository

- **URL**: https://github.com/swholonet/assets
- **GitHub Pages**: https://swholonet.github.io/assets/

## Planeten-Bilder

### Verzeichnisstruktur

```
assets/
└── planets/
    ├── desert_1.png
    ├── ice_1.png
    ├── forest_1.png
    ├── city_1.png
    ├── volcano_1.png
    ├── desert_2.png (optional: Variationen)
    ├── ice_2.png
    └── ...
```

### Unterstützte Planeten-Typen

| Typ | Enum-Wert | Dateiname | Beschreibung |
|-----|-----------|-----------|--------------|
| Wüste | `DESERT` | `desert_1.png` | Trockene Welt mit Mineralvorkommen |
| Eis | `ICE` | `ice_1.png` | Gefrorener Planet mit Wasserreserven |
| Wald | `FOREST` | `forest_1.png` | Grüner Planet mit ausgedehnten Wäldern |
| Stadt | `CITY` | `city_1.png` | Urbanisierte Welt mit fortschrittlicher Infrastruktur |
| Vulkan | `VOLCANO` | `volcano_1.png` | Geschmolzene Oberfläche mit seltenen Mineralien |
| Dschungel | `JUNGLE` | `jungle_1.png` | Dichte Vegetation, reich an organischen Materialien |
| Terranisch | `TERRAN` | (fallback zu forest) | Erdähnlicher Planet |

### Bildanforderungen

- **Format**: PNG mit Transparenz
- **Auflösung**: 512x512px empfohlen
- **Dateigröße**: < 200KB pro Bild
- **Stil**: Konsistenter visueller Stil für alle Planeten

## Backend-Konfiguration

### config.ts

```typescript
export const config = {
  ASSET_BASE_URL: 'https://swholonet.github.io/assets',
  // ...
};

export function getPlanetImageUrl(planetType: string, visualSeed: number = 1): string {
  const normalizedType = planetType.toLowerCase();
  return `${config.ASSET_BASE_URL}/planets/${normalizedType}_${visualSeed}.png`;
}
```

### Prisma Schema

```prisma
enum PlanetType {
  DESERT
  ICE
  FOREST
  CITY
  VOLCANO
  JUNGLE
  VOLCANIC
  TERRAN
}

model Planet {
  // ...
  planetType      PlanetType @default(TERRAN)
  visualSeed      Int?       // Für Variationen (1-N)
  // ...
}
```

## Frontend-Komponente

### PlanetImage.tsx

Die `PlanetImage` Komponente lädt automatisch Planeten-Bilder aus dem Asset-Repository:

```tsx
import PlanetImage from '../components/PlanetImage';

<PlanetImage 
  planetType="DESERT"
  visualSeed={1}
  alt="Tatooine"
  size={200}
  className="rounded-lg"
/>
```

### Features

- **Automatisches Laden**: Bilder werden dynamisch aus dem Asset-Repo geladen
- **Fallback-Logik**: Zeigt grauen SVG-Kreis bei fehlenden Bildern
- **Lazy Loading**: Optimierte Performance durch lazy loading
- **Error Handling**: Graceful degradation bei Netzwerkfehlern
- **Type Mapping**: Automatische Zuordnung von Alias-Namen (VOLCANIC → VOLCANO)

### Hilfs-Funktionen

```typescript
import { getPlanetTypeLabel, planetTypeColors } from '../components/PlanetImage';

// Deutsche Labels
getPlanetTypeLabel('DESERT'); // → 'Wüste'

// Tailwind CSS Farben
planetTypeColors['ICE']; // → 'bg-cyan-400'
```

## Umgebungsvariablen

### Backend (.env)

```env
# Nicht erforderlich, da in config.ts hardcoded
```

### Frontend (.env.development)

```env
VITE_ASSET_BASE_URL=https://swholonet.github.io/assets
```

### Production (.env.production)

```env
VITE_ASSET_BASE_URL=https://swholonet.github.io/assets
```

## Asset-Repository Setup

### Erstmalige Einrichtung

1. Repository erstellen:
```bash
git clone https://github.com/swholonet/assets.git
cd assets
mkdir -p planets
```

2. Bilder hinzufügen:
```bash
# Planeten-Bilder in planets/ Ordner kopieren
cp ~/Downloads/desert_1.png planets/
cp ~/Downloads/ice_1.png planets/
# ...
```

3. GitHub Pages aktivieren:
   - Repository Settings → Pages
   - Source: `main` branch, `/ (root)` folder
   - Save

4. Testen:
```bash
# Nach ~1 Minute verfügbar
curl https://swholonet.github.io/assets/planets/desert_1.png
```

### Neue Bilder hinzufügen

1. Bilder in `planets/` Ordner kopieren
2. Commit & Push:
```bash
git add planets/
git commit -m "Add new planet images"
git push
```

3. Warten (~1 Minute für GitHub Pages Update)

### Variationen hinzufügen

Für mehrere Variationen des gleichen Typs:

```
planets/
├── desert_1.png   # Standard
├── desert_2.png   # Variation 1
├── desert_3.png   # Variation 2
```

Im Backend:
```typescript
await prisma.planet.create({
  data: {
    planetType: 'DESERT',
    visualSeed: 2,  // Verwendet desert_2.png
    // ...
  }
});
```

## Verwendete Komponenten

### PlanetSelection.tsx
- Zeigt Planeten-Auswahl mit großen Bildern
- Verwendet PlanetImage-Komponente

### Planets.tsx
- Listet alle Spieler-Planeten auf
- Zeigt 100x100px Vorschaubilder

### SystemView.tsx
- Zeigt Planeten im System
- Grid-basierte Darstellung (zu klein für Bilder, verwendet Farben)

## Performance-Überlegungen

- **CDN**: GitHub Pages verwendet CDN (schnell weltweit)
- **Caching**: Browser cachen Bilder automatisch
- **Lazy Loading**: Bilder werden erst bei Sichtbarkeit geladen
- **Fallback**: Bei Netzwerkfehlern wird SVG-Fallback verwendet

## Troubleshooting

### Bilder werden nicht geladen

1. Prüfe GitHub Pages Status:
   - Repository → Settings → Pages
   - "Your site is live at..." sollte sichtbar sein

2. Prüfe URL manuell:
```bash
curl -I https://swholonet.github.io/assets/planets/desert_1.png
# Sollte HTTP 200 zurückgeben
```

3. Prüfe Browser Console:
```javascript
console.log(import.meta.env.VITE_ASSET_BASE_URL);
// Sollte: https://swholonet.github.io/assets
```

4. Prüfe CORS:
   - GitHub Pages erlaubt CORS standardmäßig
   - Keine zusätzliche Konfiguration nötig

### Fallback wird angezeigt

- Dateiname-Check: Muss `{type}_{seed}.png` sein (lowercase)
- Pfad-Check: Muss in `planets/` Ordner sein
- Format-Check: Muss `.png` sein (nicht .jpg, .webp, etc.)

## Zukünftige Erweiterungen

### Geplante Assets

- Schiffs-Sprites (`ships/`)
- Gebäude-Icons (`buildings/`)
- UI-Elemente (`ui/`)
- Sound-Effekte (`sounds/`)

### Animierte Planeten

Für animierte Planeten (z.B. rotierende GIFs):

```
planets/
├── desert_1.png    # Static
├── desert_1.gif    # Animated (optional)
```

Komponente könnte automatisch `.gif` bevorzugen falls vorhanden.

## Lizenz

Alle Assets im Asset-Repository unterliegen der gleichen Lizenz wie das Hauptprojekt.
