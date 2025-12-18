import prisma from '../lib/prisma';

export class GalaxyService {
  // STU-Style Galaxy: 36 Sektoren (6x6), jeder Sektor hat 20x20 Felder
  // Gesamte Galaxie: 120x120 Felder
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

    const systemTypes = ['SINGLE_STAR', 'BINARY_STAR', 'NEUTRON_STAR', 'BLACK_HOLE'];
    const systemNames = [
      'Tatooine', 'Hoth', 'Endor', 'Coruscant', 'Naboo',
      'Dantooine', 'Yavin', 'Bespin', 'Dagobah', 'Alderaan',
      'Kashyyyk', 'Mustafar', 'Kamino', 'Geonosis', 'Utapau',
      'Corellia', 'Mandalore', 'Ord Mantell', 'Ryloth', 'Mon Cala',
      'Scarif', 'Jedha', 'Lothal', 'Atollon', 'Dathomir',
      'Felucia', 'Mygeeto', 'Saleucami', 'Cato Neimoidia', 'Polis Massa',
      'Kessel', 'Sullust', 'Nar Shaddaa', 'Bothawui', 'Fondor'
    ];
    const planetTypes = ['TERRAN', 'DESERT', 'JUNGLE', 'ICE', 'VOLCANIC'];

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

        // 90% SINGLE_STAR, 8% BINARY_STAR, 1.5% NEUTRON_STAR, 0.5% BLACK_HOLE
        const rand = Math.random();
        let systemType = 'SINGLE_STAR';
        if (rand < 0.005) systemType = 'BLACK_HOLE';
        else if (rand < 0.02) systemType = 'NEUTRON_STAR';
        else if (rand < 0.10) systemType = 'BINARY_STAR';

        // Create the system
        const system = await prisma.system.create({
          data: {
            name: systemName,
            sectorId: sector.id,
            fieldX,
            fieldY,
            systemType,
            gridSize: Math.floor(Math.random() * 21) + 20, // 20-40
          },
        });

        // Generate 1-5 planets per system
        const planetsInSystem = Math.floor(Math.random() * 5) + 1; // 1-5 planets
        
        for (let p = 0; p < planetsInSystem; p++) {
          const planetName = `${systemName.replace('-System', '')} ${this.romanNumeral(p + 1)}`;
          const planetType = planetTypes[Math.floor(Math.random() * planetTypes.length)];
          const orbitRadius = p + 2; // Inner planets closer (2-6)
          const orbitAngle = Math.floor(Math.random() * 360); // Random starting position

          await prisma.planet.create({
            data: {
              name: planetName,
              systemId: system.id,
              planetType,
              orbitRadius,
              orbitAngle,
              sizeX: 10,
              sizeY: 10,
            },
          });

          totalPlanets++;
        }

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

  // Generate planets distributed across all sectors (DEPRECATED - use generateSystemsInGalaxy)
  private async generatePlanetsInGalaxy(galaxyId: number) {
    console.log(`🪐 Generiere Planeten in der Galaxie...`);

    const sectors = await prisma.sector.findMany({
      where: { galaxyId },
    });

    const planetTypes = ['TERRAN', 'DESERT', 'JUNGLE', 'ICE', 'VOLCANIC'];
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

        const planetType = planetTypes[Math.floor(Math.random() * planetTypes.length)];

        await prisma.planet.create({
          data: {
            name: planetName,
            sectorId: sector.id,
            fieldX,
            fieldY,
            planetType,
            sizeX: 10,
            sizeY: 10,
          },
        });

        totalPlanets++;
      }
    }

    console.log(`✅ ${totalPlanets} Planeten in ${sectors.length} Sektoren generiert`);
  }

  // Create start planets for each faction (STU-style with Systems)
  async createStartPlanets() {
    const galaxy = await prisma.galaxy.findFirst({
      include: { sectors: true },
    });

    if (!galaxy) {
      throw new Error('Galaxie nicht gefunden. Führe zuerst initializeGalaxy aus.');
    }

    // Check if start planets already exist
    const existingStartPlanets = await prisma.startPlanet.findMany();
    if (existingStartPlanets.length > 0) {
      console.log('⚠️  Startplaneten existieren bereits, überspringe Erstellung');
      return existingStartPlanets;
    }

    const factions = await prisma.faction.findMany();
    const startPlanets = [];

    console.log('🏠 Erstelle Start-Systeme für Fraktionen...');

    for (const faction of factions) {
      // Imperium: Sektoren 1-2 (links oben)
      // Rebellen: Sektoren 5-6 (rechts oben)
      const startSectorX = faction.id === 1 ? [1, 2] : [5, 6];
      const startSectorY = [1, 2]; // Beide oben

      // Create 3 start systems per faction
      const systemsPerFaction = 3;

      for (let i = 0; i < systemsPerFaction; i++) {
        const sectorX = startSectorX[i % 2];
        const sectorY = startSectorY[Math.floor(i / 2) % 2];
        
        const sector = galaxy.sectors.find(s => s.x === sectorX && s.y === sectorY);

        if (!sector) {
          console.log(`⚠️  Sektor nicht gefunden: ${sectorX},${sectorY}`);
          continue;
        }

        // Random field position in sector (avoid edges)
        let fieldX = Math.floor(Math.random() * 16) + 3; // 3-18
        let fieldY = Math.floor(Math.random() * 16) + 3; // 3-18
        let attempts = 0;

        // Check if field is already occupied by a system
        let existingSystem = await prisma.system.findUnique({
          where: {
            sectorId_fieldX_fieldY: {
              sectorId: sector.id,
              fieldX,
              fieldY,
            },
          },
        });

        while (existingSystem && attempts < 50) {
          fieldX = Math.floor(Math.random() * 16) + 3;
          fieldY = Math.floor(Math.random() * 16) + 3;
          existingSystem = await prisma.system.findUnique({
            where: {
              sectorId_fieldX_fieldY: {
                sectorId: sector.id,
                fieldX,
                fieldY,
              },
            },
          });
          attempts++;
        }

        if (attempts >= 50) {
          console.log(`⚠️  Konnte kein freies Feld in Sektor ${sectorX},${sectorY} finden`);
          continue;
        }

        const systemName = `${faction.name} Home-System ${i + 1}`;

        // Create the start system
        const system = await prisma.system.create({
          data: {
            name: systemName,
            sectorId: sector.id,
            fieldX,
            fieldY,
            systemType: 'SINGLE_STAR',
          },
        });

        // Create 1 start planet in this system
        const planetName = `${faction.name} Homeworld ${i + 1}`;

        const planet = await prisma.planet.create({
          data: {
            name: planetName,
            systemId: system.id,
            planetType: 'TERRAN', // Start planets are always TERRAN
            orbitRadius: 3, // Habitable zone
            orbitAngle: 0,
            sizeX: 10,
            sizeY: 10,
          },
        });

        // Create planet fields (10x10 grid with layers)
        const fields = [];
        for (let x = 0; x < 10; x++) {
          for (let y = 0; y < 10; y++) {
            let fieldLayer: string;
            let fieldType: string;

            if (y <= 1) {
              // ORBIT layer
              fieldLayer = 'ORBIT';
              fieldType = 'SPACE';
            } else if (y <= 7) {
              // SURFACE layer
              fieldLayer = 'SURFACE';
              const rand = Math.random();
              if (rand < 0.2) fieldType = 'WATER';
              else if (rand < 0.25) fieldType = 'MOUNTAIN';
              else fieldType = 'LAND';
            } else {
              // UNDERGROUND layer
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

        // Register as start planet
        startPlanets.push({
          factionId: faction.id,
          planetName: planet.name,
          sectorX: sector.x,
          sectorY: sector.y,
        });

        console.log(`✅ Startplanet erstellt: ${planetName} für ${faction.name} bei Sektor ${sectorX},${sectorY} Feld ${fieldX},${fieldY}`);
      }
    }

    await prisma.startPlanet.createMany({
      data: startPlanets,
    });

    console.log(`✅ ${startPlanets.length} Startplaneten erstellt`);

    return startPlanets;
  }

  // Get available start planets for a faction
  async getAvailableStartPlanets(factionId: number) {
    const startPlanets = await prisma.startPlanet.findMany({
      where: { factionId },
      include: {
        faction: true,
      },
    });

    const planetsWithDetails = await Promise.all(
      startPlanets.map(async (sp) => {
        const planet = await prisma.planet.findFirst({
          where: {
            name: sp.planetName,
            playerId: null, // Only unclaimed planets
          },
          include: {
            system: {
              include: {
                sector: true,
              },
            },
          },
        });

        if (!planet) return null;

        return {
          id: planet.id,
          name: planet.name,
          planetType: planet.planetType,
          sectorX: planet.system.sector.x,
          sectorY: planet.system.sector.y,
          systemName: planet.system.name,
          systemType: planet.system.systemType,
          available: true,
        };
      })
    );

    return planetsWithDetails.filter(p => p !== null);
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

