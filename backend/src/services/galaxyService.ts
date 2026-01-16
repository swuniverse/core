import prisma from '../lib/prisma';
import { PlanetClass, SystemType } from '@prisma/client';

export class GalaxyService {
  // STU-Style Galaxy: 36 Sektoren (6x6), jeder Sektor hat 20x20 Felder
  // Gesamte Galaxie: 120x120 Felder

  /**
   * Generate a weighted random STU system type
   * Only uses system types we have assets for
   */
  private static getRandomSystemType(): SystemType {
    const systemTypesWeighted: SystemType[] = [
      // Common systems (higher probability)
      SystemType.SMALL_YELLOW,    // (1021) - most common like our sun
      SystemType.SMALL_YELLOW,
      SystemType.SMALL_YELLOW,
      SystemType.SMALL_YELLOW,

      // Less common
      SystemType.SMALL_BLUE,      // (1001) - hot young stars
      SystemType.SMALL_BLUE,
      SystemType.MEDIUM_BLUE,     // (1041) - bright main sequence
      SystemType.RED_DWARF,       // (1061) - long-lived small stars
      SystemType.RED_DWARF,

      // Uncommon
      SystemType.BLUE_GIANT,      // (1053) - massive luminous stars

      // Rare systems
      SystemType.NEUTRON_STAR,    // (1070) - ultra-dense remnants
      SystemType.BINARY_SYSTEM,   // (1074) - twin star systems

      // Very rare
      SystemType.BLACK_HOLE,      // (1072) - gravitational anomalies
    ];

    return systemTypesWeighted[Math.floor(Math.random() * systemTypesWeighted.length)];
  }
  private readonly SECTORS_X = 6;
  private readonly SECTORS_Y = 6;
  private readonly FIELDS_PER_SECTOR = 20;

  // Initialize galaxy with sectors (STU-style: 36 sectors in 6x6 grid)
  async initializeGalaxy(name: string = 'Star Wars Universe') {
    // Check if galaxy already exists
    const existingGalaxy = await prisma.galaxy.findFirst();
    if (existingGalaxy) {
      return existingGalaxy;
    }

    // Create galaxy: 6x6 sectors = 36 total
    const galaxy = await prisma.galaxy.create({
      data: {
        name,
        sizeX: this.SECTORS_X,
        sizeY: this.SECTORS_Y,
      },
    });

    console.log(`🌌 Erstelle Galaxie "${name}" mit ${this.SECTORS_X}x${this.SECTORS_Y} Sektoren (${this.SECTORS_X * this.SECTORS_Y} total)...`);
    console.log(`📊 Jeder Sektor hat ${this.FIELDS_PER_SECTOR}x${this.FIELDS_PER_SECTOR} Felder`);
    console.log(`🗺️  Gesamte Galaxie: ${this.SECTORS_X * this.FIELDS_PER_SECTOR}x${this.SECTORS_Y * this.FIELDS_PER_SECTOR} Felder`);

    // Create 36 sectors (6x6 grid)
    const sectors = [];
    for (let x = 1; x <= this.SECTORS_X; x++) {
      for (let y = 1; y <= this.SECTORS_Y; y++) {
        // Determine sector type (85% normal, 10% nebula, 5% asteroid)
        const rand = Math.random();
        let sectorType = 'NORMAL';
        if (rand < 0.05) sectorType = 'ASTEROID_FIELD';
        else if (rand < 0.15) sectorType = 'NEBULA';

        sectors.push({
          galaxyId: galaxy.id,
          x,
          y,
          sectorType,
        });
      }
    }

    // Insert all 36 sectors
    await prisma.sector.createMany({
      data: sectors,
    });

    console.log(`✅ ${sectors.length} Sektoren erstellt`);

    // Generate systems in sectors (STU-style: systems contain planets)
    await this.generateSystemsInGalaxy(galaxy.id);

    return galaxy;
  }

  // Generate systems distributed across all sectors (STU-style)
  private async generateSystemsInGalaxy(galaxyId: number) {
    console.log(`⭐ Generiere Sonnensysteme in der Galaxie...`);

    const sectors = await prisma.sector.findMany({
      where: { galaxyId },
    });

    const systemNames = [
      'Tatooine', 'Hoth', 'Endor', 'Coruscant', 'Naboo',
      'Dantooine', 'Yavin', 'Bespin', 'Dagobah', 'Alderaan',
      'Kashyyyk', 'Mustafar', 'Kamino', 'Geonosis', 'Utapau',
      'Corellia', 'Mandalore', 'Ord Mantell', 'Ryloth', 'Mon Cala',
      'Scarif', 'Jedha', 'Lothal', 'Atollon', 'Dathomir',
      'Felucia', 'Mygeeto', 'Saleucami', 'Cato Neimoidia', 'Polis Massa',
      'Kessel', 'Sullust', 'Nar Shaddaa', 'Bothawui', 'Fondor'
    ];
    const planetClassesEnum: PlanetClass[] = [
      // ===== LEBENSFREUNDLICHE KLASSEN (höhere Wahrscheinlichkeit) =====
      PlanetClass.CLASS_M,        // erdähnlich - most common
      PlanetClass.CLASS_M,
      PlanetClass.CLASS_M,
      PlanetClass.CLASS_O,        // ozeanisch - common
      PlanetClass.CLASS_O,
      PlanetClass.CLASS_L,        // bewaldet - forests like Endor
      PlanetClass.CLASS_L,
      PlanetClass.CLASS_H,        // wüstenbedeckt - deserts like Tatooine
      PlanetClass.CLASS_H,
      PlanetClass.CLASS_P,        // eisbedeckt - ice worlds like Hoth
      PlanetClass.CLASS_K,        // marsähnlich - rocky worlds
      PlanetClass.CLASS_G,        // tundrabedeckt - tundra worlds
      PlanetClass.CLASS_D,        // mondähnlich - moon-like worlds

      // ===== EXTREME KLASSEN (selten, schwer kolonisierbar) =====
      PlanetClass.CLASS_Q,        // dichte Atmosphäre - toxic atmosphere
      PlanetClass.CLASS_X,        // vulkanisch - volcanic like Mustafar

      // ===== UNBEWOHNBARE PLANETEN (seltener) =====
      PlanetClass.CLASS_S,        // gezeitengebunden - tidally locked
      PlanetClass.CLASS_T,        // extreme Rotation - fast rotating
      PlanetClass.CLASS_I_1,      // Gasriese Typ 1 - like Yavin
      PlanetClass.CLASS_I_2,      // Gasriese Typ 2 - like Bespin
      PlanetClass.CLASS_I_3,      // Gasriese Typ 3 - massive gas giants
      PlanetClass.CLASS_N,        // spezielle Eigenschaften - unique worlds

      // Additional variety for more common types
      PlanetClass.CLASS_P_T,      // eisbedeckt weniger Wasser - polar ice
    ];

    let totalSystems = 0;
    let totalPlanets = 0;
    const usedNames = new Set<string>();

    for (const sector of sectors) {
      // Each sector has 400 fields (20x20)
      // 2-4% should have systems = 8-16 systems per sector
      const systemsInSector = Math.floor(Math.random() * 9) + 8; // 8-16 systems
      const occupiedFields = new Set<string>();

      for (let i = 0; i < systemsInSector; i++) {
        // Random field position (1-20, 1-20)
        let fieldX: number, fieldY: number, fieldKey: string;
        let attempts = 0;
        
        do {
          fieldX = Math.floor(Math.random() * this.FIELDS_PER_SECTOR) + 1;
          fieldY = Math.floor(Math.random() * this.FIELDS_PER_SECTOR) + 1;
          fieldKey = `${fieldX},${fieldY}`;
          attempts++;
        } while (occupiedFields.has(fieldKey) && attempts < 100);

        if (attempts >= 100) continue;
        occupiedFields.add(fieldKey);

        // Generate unique system name
        let systemName: string;
        let nameAttempts = 0;
        do {
          const baseName = systemNames[Math.floor(Math.random() * systemNames.length)];
          const suffix = Math.floor(Math.random() * 1000);
          systemName = usedNames.size < systemNames.length ? `${baseName}-System` : `${baseName}-${suffix}`;
          nameAttempts++;
        } while (usedNames.has(systemName) && nameAttempts < 50);

        if (nameAttempts >= 50) continue;
        usedNames.add(systemName);

        // Use STU weighted random system type generation

        // Create the system
        const system = await prisma.system.create({
          data: {
            name: systemName,
            sectorId: sector.id,
            fieldX,
            fieldY,
            systemType: GalaxyService.getRandomSystemType(), // Use STU system types
            gridSize: Math.floor(Math.random() * 11) + 25, // 25-35 (STU-style larger systems)
          },
        });

        // Generate STU-style rich systems with 6-15 objects
        await this.generateRichSystemContent(system, systemName, planetClassesEnum);
        totalPlanets += await this.countSystemObjects(system.id);

        totalSystems++;
      }
    }

    console.log(`✅ ${totalSystems} Systeme mit ${totalPlanets} Planeten in ${sectors.length} Sektoren generiert`);
  }

  // Helper: Convert number to Roman numeral
  private romanNumeral(num: number): string {
    const romanNumerals: [number, string][] = [
      [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ];
    let result = '';
    for (const [value, numeral] of romanNumerals) {
      while (num >= value) {
        result += numeral;
        num -= value;
      }
    }
    return result;
  }

  /**
   * Generate STU-style rich system content with planets, moons, and asteroids
   * Creates 15-25 total objects per system for maximum expansion opportunities
   */
  private async generateRichSystemContent(system: any, systemName: string, planetClassesEnum: any[]) {
    const gridCenter = Math.floor(system.gridSize / 2);

    // Track occupied grid positions to avoid overlaps
    const occupiedPositions = new Set<string>();

    // Reserve 3x3 area for central star
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const x = gridCenter + dx;
        const y = gridCenter + dy;
        if (x >= 1 && x <= system.gridSize && y >= 1 && y <= system.gridSize) {
          occupiedPositions.add(`${x},${y}`);
        }
      }
    }

    // Phase 1: Generate 6-12 main planets in orbital zones
    const planetsCount = Math.floor(Math.random() * 7) + 6; // 6-12 main planets
    const createdPlanets = [];

    for (let p = 0; p < planetsCount; p++) {
      const planetName = `${systemName.replace('-System', '')} ${this.romanNumeral(p + 1)}`;
      const planetClass = planetClassesEnum[Math.floor(Math.random() * planetClassesEnum.length)];

      // Strategic orbital placement in zones
      const orbitZone = p < 3 ? 'inner' : p < 8 ? 'middle' : 'outer';
      const orbitRadius = this.getOrbitRadiusForZone(orbitZone, system.gridSize);
      const orbitAngle = Math.floor(Math.random() * 360);

      // Convert orbital position to grid coordinates
      const gridPos = this.orbitToGridPosition(orbitRadius, orbitAngle, gridCenter);

      // Ensure position is free and within bounds
      if (this.isPositionValid(gridPos, system.gridSize, occupiedPositions)) {
        const planet = await prisma.planet.create({
          data: {
            name: planetName,
            systemId: system.id,
            planetClass,
            celestialType: 'PLANET',
            orbitRadius,
            orbitAngle,
            gridX: gridPos.x,
            gridY: gridPos.y,
            sizeX: 10,
            sizeY: 10,
          },
        });

        // Create planet fields (10x10 grid with layers) - same as original homeworld creation
        const fields = [];
        for (let x = 0; x < 10; x++) {
          for (let y = 0; y < 10; y++) {
            let fieldLayer: string;
            let fieldType: string;

            if (y <= 1) {
              // ORBIT layer (2 rows)
              fieldLayer = 'ORBIT';
              fieldType = 'SPACE';
            } else if (y <= 7) {
              // SURFACE layer (6 rows)
              fieldLayer = 'SURFACE';
              const rand = Math.random();
              if (rand < 0.2) fieldType = 'WATER';
              else if (rand < 0.25) fieldType = 'MOUNTAIN';
              else fieldType = 'LAND'; // Most fields are LAND
            } else {
              // UNDERGROUND layer (2 rows)
              fieldLayer = 'UNDERGROUND';
              const rand = Math.random();
              if (rand < 0.1) fieldType = 'CRYSTAL';
              else if (rand < 0.2) fieldType = 'METAL';
              else fieldType = 'ROCK';
            }

            fields.push({
              planetId: planet.id,
              x,
              y,
              fieldLayer,
              fieldType,
            });
          }
        }

        await prisma.planetField.createMany({
          data: fields,
        });

        createdPlanets.push(planet);
        occupiedPositions.add(`${gridPos.x},${gridPos.y}`);
      }
    }

    // Phase 2: Add moons to 30% of planets
    const planetsWithMoons = createdPlanets.filter(() => Math.random() < 0.3);

    for (const parentPlanet of planetsWithMoons) {
      const moonsCount = Math.floor(Math.random() * 3) + 1; // 1-3 moons per planet

      for (let m = 0; m < moonsCount; m++) {
        const moonName = `${parentPlanet.name}-${String.fromCharCode(97 + m)}`; // a, b, c...
        const moonClass = this.selectMoonClass(planetClassesEnum);

        // Place moon near parent planet
        const moonPos = this.findMoonPosition(parentPlanet, system.gridSize, occupiedPositions);

        if (moonPos) {
          const moon = await prisma.planet.create({
            data: {
              name: moonName,
              systemId: system.id,
              planetClass: moonClass,
              celestialType: 'MOON',
              parentPlanetId: parentPlanet.id,
              orbitRadius: 1, // Close to parent
              orbitAngle: Math.floor(Math.random() * 360),
              gridX: moonPos.x,
              gridY: moonPos.y,
              sizeX: 5, // Smaller than planets
              sizeY: 5,
            },
          });

          // Create moon fields (5x5 grid) - STU-style: No underground layer for moons
          const moonFields = [];
          for (let x = 0; x < 5; x++) {
            for (let y = 0; y < 5; y++) {
              let fieldLayer: string;
              let fieldType: string;

              if (y <= 0) {
                // ORBIT layer (1 row)
                fieldLayer = 'ORBIT';
                fieldType = 'SPACE';
              } else {
                // SURFACE layer (4 rows) - STU-style: Moons have no underground
                fieldLayer = 'SURFACE';
                const rand = Math.random();
                if (rand < 0.15) fieldType = 'WATER';
                else if (rand < 0.25) fieldType = 'MOUNTAIN';
                else fieldType = 'LAND';
              }

              moonFields.push({
                planetId: moon.id,
                x,
                y,
                fieldLayer,
                fieldType,
              });
            }
          }

          await prisma.planetField.createMany({
            data: moonFields,
          });

          occupiedPositions.add(`${moonPos.x},${moonPos.y}`);
        }
      }
    }

    // Phase 3: Add asteroid fields (2-5 clusters)
    const asteroidClustersCount = Math.floor(Math.random() * 4) + 2; // 2-5 clusters

    for (let a = 0; a < asteroidClustersCount; a++) {
      const asteroidName = `${systemName.replace('-System', '')} Asteroid Field ${this.romanNumeral(a + 1)}`;
      const asteroidPos = this.findRandomPosition(system.gridSize, occupiedPositions, 3); // Keep 3 units from other objects

      if (asteroidPos) {
        // Generate random asteroid variant with proper STU asset support
        const asteroidVariants = ['NORMAL', 'GREEN', 'RED', 'ICE'];
        const randomVariant = asteroidVariants[Math.floor(Math.random() * asteroidVariants.length)];

        await prisma.planet.create({
          data: {
            systemId: system.id,
            name: asteroidName,
            planetClass: 'CLASS_K', // Rocky asteroid field class
            celestialType: 'ASTEROID_FIELD',
            asteroidVariant: randomVariant,
            gridX: asteroidPos.x,
            gridY: asteroidPos.y,
            visualSeed: Math.floor(Math.random() * 1000) + 1,
            durastahl: Math.floor(Math.random() * 5000) + 2000, // 2000-7000 durastahl
            kristallinesSilizium: Math.floor(Math.random() * 3000) + 1000, // 1000-4000 kristallines silizium
            // Default planet values for asteroid fields
            credits: 0,
            tibannaGas: 0,
            energiemodule: 0,
            kyberKristalle: 0,
            bacta: 0,
            beskar: 0,
            energyStorage: 0,
            energyStorageCapacity: 1000,
            storageCapacity: 500,
          },
        });

        occupiedPositions.add(`${asteroidPos.x},${asteroidPos.y}`);
      }
    }

    // Phase 4: Legacy special objects removed
    // DEBRIS_FIELD and SPACE_STATION had no real STU assets and caused UI errors
    // Only ASTEROID_FIELD objects are supported with 700-series assets
  }

  /**
   * Count total celestial objects in a system (planets + moons + asteroid fields)
   */
  private async countSystemObjects(systemId: number): Promise<number> {
    // All celestial objects are now Planet records (including asteroid fields)
    return await prisma.planet.count({ where: { systemId } });
  }

  /**
   * Get orbit radius based on orbital zone and system size
   */
  private getOrbitRadiusForZone(zone: 'inner' | 'middle' | 'outer', gridSize: number): number {
    const maxRadius = Math.floor(gridSize * 0.4); // 40% of grid size

    switch (zone) {
      case 'inner': return Math.floor(Math.random() * Math.max(2, Math.floor(maxRadius * 0.3))) + 2; // 2 to 30% of max
      case 'middle': return Math.floor(Math.random() * Math.floor(maxRadius * 0.3)) + Math.floor(maxRadius * 0.3) + 1; // 30% to 60%
      case 'outer': return Math.floor(Math.random() * Math.floor(maxRadius * 0.4)) + Math.floor(maxRadius * 0.6) + 1; // 60% to 100%
      default: return 3;
    }
  }

  /**
   * Convert orbital coordinates to grid coordinates
   */
  private orbitToGridPosition(orbitRadius: number, orbitAngle: number, gridCenter: number): { x: number, y: number } {
    const angleRad = (orbitAngle * Math.PI) / 180;
    const x = Math.round(gridCenter + orbitRadius * Math.cos(angleRad));
    const y = Math.round(gridCenter + orbitRadius * Math.sin(angleRad));

    return { x, y };
  }

  /**
   * Check if a position is valid (within bounds and not occupied)
   */
  private isPositionValid(pos: { x: number, y: number }, gridSize: number, occupiedPositions: Set<string>): boolean {
    return pos.x >= 1 && pos.x <= gridSize &&
           pos.y >= 1 && pos.y <= gridSize &&
           !occupiedPositions.has(`${pos.x},${pos.y}`);
  }

  /**
   * Select appropriate planet class for moons (smaller, less habitable)
   */
  private selectMoonClass(planetClassesEnum: any[]): any {
    // Prefer moon-appropriate classes
    const moonPreferredClasses = ['CLASS_D', 'CLASS_P', 'CLASS_K', 'CLASS_S'];
    const availableMoonClasses = planetClassesEnum.filter(cls =>
      moonPreferredClasses.includes(cls.toString())
    );

    if (availableMoonClasses.length > 0) {
      return availableMoonClasses[Math.floor(Math.random() * availableMoonClasses.length)];
    }

    // Fallback to any class
    return planetClassesEnum[Math.floor(Math.random() * planetClassesEnum.length)];
  }

  /**
   * Find suitable position for a moon near its parent planet
   */
  private findMoonPosition(parentPlanet: any, gridSize: number, occupiedPositions: Set<string>): { x: number, y: number } | null {
    // Try positions in a 3x3 area around parent planet
    const parentX = parentPlanet.gridX;
    const parentY = parentPlanet.gridY;

    for (let attempts = 0; attempts < 20; attempts++) {
      const dx = Math.floor(Math.random() * 5) - 2; // -2 to 2
      const dy = Math.floor(Math.random() * 5) - 2; // -2 to 2

      if (dx === 0 && dy === 0) continue; // Don't place on parent

      const moonX = parentX + dx;
      const moonY = parentY + dy;

      if (this.isPositionValid({ x: moonX, y: moonY }, gridSize, occupiedPositions)) {
        return { x: moonX, y: moonY };
      }
    }

    return null;
  }

  /**
   * Find random free position with minimum distance from other objects
   */
  private findRandomPosition(gridSize: number, occupiedPositions: Set<string>, minDistance: number = 1): { x: number, y: number } | null {
    for (let attempts = 0; attempts < 50; attempts++) {
      const x = Math.floor(Math.random() * gridSize) + 1;
      const y = Math.floor(Math.random() * gridSize) + 1;

      let tooClose = false;

      // Check minimum distance
      for (let dx = -minDistance; dx <= minDistance; dx++) {
        for (let dy = -minDistance; dy <= minDistance; dy++) {
          const checkX = x + dx;
          const checkY = y + dy;

          if (occupiedPositions.has(`${checkX},${checkY}`)) {
            tooClose = true;
            break;
          }
        }
        if (tooClose) break;
      }

      if (!tooClose) {
        return { x, y };
      }
    }

    return null;
  }

  // Generate planets distributed across all sectors (DEPRECATED - use generateSystemsInGalaxy)
  private async generatePlanetsInGalaxy(galaxyId: number) {
    console.log(`🪐 Generiere Planeten in der Galaxie...`);

    const sectors = await prisma.sector.findMany({
      where: { galaxyId },
    });

    const planetTypes = ['TERRAN', 'DESERT', 'JUNGLE', 'ICE', 'VOLCANIC', 'FOREST', 'VOLCANO', 'OCEAN', 'CONTINENTAL', 'TROPICAL', 'TEMPERATE', 'HIGHLAND', 'MARSH', 'SWAMP', 'ARCHIPELAGO', 'COLONY', 'INDUSTRIAL', 'AGRICULTURAL', 'MINING', 'CITY', 'URBAN', 'RESEARCH', 'TRADING', 'MILITARY', 'MOON', 'BARREN', 'ROCKY', 'CRATER', 'LIFELESS', 'WASTELAND', 'ASTEROID_FIELD', 'DEBRIS_FIELD', 'SPACE_STATION', 'OUTPOST'];
    const planetClassesEnum: PlanetClass[] = [
      // ===== LEBENSFREUNDLICHE KLASSEN (höhere Wahrscheinlichkeit) =====
      PlanetClass.CLASS_M,        // erdähnlich - most common
      PlanetClass.CLASS_M,
      PlanetClass.CLASS_M,
      PlanetClass.CLASS_O,        // ozeanisch - common
      PlanetClass.CLASS_O,
      PlanetClass.CLASS_L,        // bewaldet - forests like Endor
      PlanetClass.CLASS_L,
      PlanetClass.CLASS_H,        // wüstenbedeckt - deserts like Tatooine
      PlanetClass.CLASS_H,
      PlanetClass.CLASS_P,        // eisbedeckt - ice worlds like Hoth
      PlanetClass.CLASS_K,        // marsähnlich - rocky worlds
      PlanetClass.CLASS_G,        // tundrabedeckt - tundra worlds
      PlanetClass.CLASS_D,        // mondähnlich - moon-like worlds

      // ===== EXTREME KLASSEN (selten, schwer kolonisierbar) =====
      PlanetClass.CLASS_Q,        // dichte Atmosphäre - toxic atmosphere
      PlanetClass.CLASS_X,        // vulkanisch - volcanic like Mustafar

      // ===== UNBEWOHNBARE PLANETEN (seltener) =====
      PlanetClass.CLASS_S,        // gezeitengebunden - tidally locked
      PlanetClass.CLASS_T,        // extreme Rotation - fast rotating
      PlanetClass.CLASS_I_1,      // Gasriese Typ 1 - like Yavin
      PlanetClass.CLASS_I_2,      // Gasriese Typ 2 - like Bespin
      PlanetClass.CLASS_I_3,      // Gasriese Typ 3 - massive gas giants
      PlanetClass.CLASS_N,        // spezielle Eigenschaften - unique worlds

      // Additional variety for more common types
      PlanetClass.CLASS_P_T,      // eisbedeckt weniger Wasser - polar ice
    ];
    const planetNames = [
      'Tatooine', 'Hoth', 'Endor', 'Coruscant', 'Naboo',
      'Dantooine', 'Yavin', 'Bespin', 'Dagobah', 'Alderaan',
      'Kashyyyk', 'Mustafar', 'Kamino', 'Geonosis', 'Utapau',
      'Corellia', 'Mandalore', 'Ord Mantell', 'Ryloth', 'Mon Cala',
      'Scarif', 'Jedha', 'Lothal', 'Atollon', 'Dathomir',
      'Felucia', 'Mygeeto', 'Saleucami', 'Cato Neimoidia', 'Polis Massa'
    ];

    let totalPlanets = 0;
    const usedNames = new Set<string>();

    for (const sector of sectors) {
      // Each sector has 400 fields (20x20)
      // 5-10% should have planets = 20-40 planets per sector
      const planetsInSector = Math.floor(Math.random() * 21) + 20; // 20-40 planets
      const occupiedFields = new Set<string>();

      for (let i = 0; i < planetsInSector; i++) {
        // Random field position (1-20, 1-20)
        let fieldX: number, fieldY: number, fieldKey: string;
        let attempts = 0;
        
        do {
          fieldX = Math.floor(Math.random() * this.FIELDS_PER_SECTOR) + 1;
          fieldY = Math.floor(Math.random() * this.FIELDS_PER_SECTOR) + 1;
          fieldKey = `${fieldX},${fieldY}`;
          attempts++;
        } while (occupiedFields.has(fieldKey) && attempts < 100);

        if (attempts >= 100) continue; // Skip if can't find free field

        occupiedFields.add(fieldKey);

        // Generate unique planet name
        let planetName: string;
        let nameAttempts = 0;
        do {
          const baseName = planetNames[Math.floor(Math.random() * planetNames.length)];
          const suffix = Math.floor(Math.random() * 1000);
          planetName = usedNames.size < planetNames.length ? baseName : `${baseName} ${suffix}`;
          nameAttempts++;
        } while (usedNames.has(planetName) && nameAttempts < 50);

        if (nameAttempts >= 50) continue;
        usedNames.add(planetName);

        const planetClass = planetClassesEnum[Math.floor(Math.random() * planetClassesEnum.length)];

        await prisma.planet.create({
          data: {
            name: planetName,
            systemId: sector.id,
            planetClass: planetClass,
            sizeX: 10,
            sizeY: 10,
          },
        });

        totalPlanets++;
      }
    }

    console.log(`✅ ${totalPlanets} Planeten in ${sectors.length} Sektoren generiert`);
  }

  // DEPRECATED: Fixed homeworld creation replaced with dynamic start planet selection
  async createStartPlanets() {
    console.log('⚠️  createStartPlanets() is deprecated - using dynamic start planet selection instead');
    console.log('✅ Startplaneten creation skipped - players will select from generated planets');
    return [];
  }

  // Get available start planets for a faction (Dynamic selection from generated planets)
  async getAvailableStartPlanets(factionId: number, options?: {
    nearSystemName?: string;  // Co-op feature - search near specific system
    refreshCount?: number;    // For randomization seed
  }) {
    // 1. Define faction territory sectors (opposite corners of 6x6 galaxy)
    const factionSectors = factionId === 1
      ? [[1,1], [1,2], [2,1], [2,2]]  // Imperium (top-left corner)
      : [[5,5], [5,6], [6,5], [6,6]]; // Rebellen (bottom-right corner)

    // 2. Build base query for habitable planets in faction territory
    let habitablePlanets = await prisma.planet.findMany({
      where: {
        planetClass: { in: ['CLASS_M', 'CLASS_L', 'CLASS_O'] }, // Only habitable classes
        playerId: null,  // Unclaimed only
        celestialType: 'PLANET',  // Not moons or asteroids
        system: {
          sector: {
            OR: factionSectors.map(([x, y]) => ({ x, y }))
          }
        }
      },
      include: {
        system: {
          include: {
            sector: true
          }
        }
      }
    });

    // 3. Handle co-op near system search
    if (options?.nearSystemName) {
      try {
        // Find the target system
        const targetSystem = await prisma.system.findFirst({
          where: {
            name: {
              contains: options.nearSystemName,
              mode: 'insensitive'
            }
          },
          include: { sector: true }
        });

        if (targetSystem) {
          // Filter planets to those within 2 sectors of the target system
          habitablePlanets = habitablePlanets.filter(planet => {
            const distance = Math.abs(planet.system.sector.x - targetSystem.sector.x) +
                           Math.abs(planet.system.sector.y - targetSystem.sector.y);
            return distance <= 2; // Within 2 sectors
          });

          console.log(`🤝 Co-op search: Found ${habitablePlanets.length} planets near "${options.nearSystemName}"`);
        } else {
          console.log(`⚠️  Co-op search: System "${options.nearSystemName}" not found`);
          // Return empty result for invalid system names
          return [];
        }
      } catch (error) {
        console.error('Error in co-op search:', error);
        return [];
      }
    }

    // 4. Randomize selection (use refreshCount as seed for different results)
    const seed = (options?.refreshCount || 0) + factionId;
    const shuffled = habitablePlanets.sort(() => {
      // Use deterministic randomization based on seed
      return (Math.sin(seed * 9999) * 10000) % 2 - 1;
    });

    // 5. Select up to 4 planets and format them
    const selectedPlanets = shuffled.slice(0, 4);

    console.log(`🌍 Dynamic selection: Found ${selectedPlanets.length} start planets for faction ${factionId}${options?.nearSystemName ? ` near ${options.nearSystemName}` : ''}`);

    return selectedPlanets.map(planet => ({
      id: planet.id,
      name: planet.name,
      planetClass: planet.planetClass,
      visualSeed: planet.visualSeed,
      sectorX: planet.system.sector.x,
      sectorY: planet.system.sector.y,
      systemName: planet.system.name,
      systemType: planet.system.systemType,
      available: true,
    }));
  }

  // Claim a start planet for a player
  async claimStartPlanet(playerId: number, planetId: number) {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { planets: true },
    });

    if (!player) {
      throw new Error('Player not found');
    }

    if (player.planets.length > 0) {
      throw new Error('Player already has a planet');
    }

    const planet = await prisma.planet.findUnique({
      where: { id: planetId },
      include: { fields: true },
    });

    if (!planet) {
      throw new Error('Planet not found');
    }

    if (planet.playerId) {
      throw new Error('Planet already claimed');
    }

    // Get or create building types
    const buildingTypes = await this.ensureBuildingTypes();

    // Assign planet to player
    const updatedPlanet = await prisma.planet.update({
      where: { id: planetId },
      data: { playerId },
      include: {
        system: {
          include: {
            sector: true,
          },
        },
        fields: true,
        player: true,
      },
    });

    // Build starter buildings
    await this.buildStarterBuildings(planet.id, buildingTypes);

    console.log(`✅ Player ${playerId} claimed planet ${planet.name}`);

    return updatedPlanet;
  }

  // Ensure building types exist in database
  private async ensureBuildingTypes() {
    // Simply return all building types from database
    // They should be seeded via seed-building-types.ts
    const buildingTypes = await prisma.buildingType.findMany();
    
    if (buildingTypes.length === 0) {
      throw new Error('No building types found in database. Please run seed-building-types.ts first.');
    }
    
    return buildingTypes;
  }

  // Build starter buildings on a new planet
  private async buildStarterBuildings(planetId: number, buildingTypes: any[]) {
    const commandCenter = buildingTypes.find(bt => bt.name === 'Kommandozentrale');
    const solarPlant = buildingTypes.find(bt => bt.name === 'Solarkraftwerk');
    const durastahlMine = buildingTypes.find(bt => bt.name === 'Durastahl-Mine');

    if (!commandCenter || !solarPlant || !durastahlMine) {
      console.error('Available building types:', buildingTypes.map(bt => bt.name));
      throw new Error('Required building types not found');
    }

    // Get available fields
    const fields = await prisma.planetField.findMany({
      where: { 
        planetId,
        fieldType: 'LAND',
        buildingId: null,
      },
      take: 3,
    });

    if (fields.length < 3) {
      throw new Error('Not enough land fields for starter buildings');
    }

    // Build Command Center
    const cc = await prisma.building.create({
      data: {
        planetId,
        buildingTypeId: commandCenter.id,
        level: 1,
        isActive: true,
        completedAt: new Date(),
      },
    });

    await prisma.planetField.update({
      where: { id: fields[0].id },
      data: { buildingId: cc.id },
    });

    // Build Solar Plant
    const sp = await prisma.building.create({
      data: {
        planetId,
        buildingTypeId: solarPlant.id,
        level: 1,
        isActive: true,
        completedAt: new Date(),
      },
    });

    await prisma.planetField.update({
      where: { id: fields[1].id },
      data: { buildingId: sp.id },
    });

    // Build Durastahl Mine
    const dm = await prisma.building.create({
      data: {
        planetId,
        buildingTypeId: durastahlMine.id,
        level: 1,
        isActive: true,
        completedAt: new Date(),
      },
    });

    await prisma.planetField.update({
      where: { id: fields[2].id },
      data: { buildingId: dm.id },
    });

    console.log(`✅ Built starter buildings on planet ${planetId}`);
  }
}

export const galaxyService = new GalaxyService();

