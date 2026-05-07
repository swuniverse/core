import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Layer } from '../entities/layer.entity';
import { StarSystem } from '../entities/star-system.entity';
import { CelestialObject, CelestialObjectType } from '../entities/celestial-object.entity';

const STAR_NAMES = [
  'Tatooine', 'Coruscant', 'Naboo', 'Hoth', 'Endor', 'Dagobah',
  'Mustafar', 'Kashyyyk', 'Kamino', 'Geonosis', 'Bespin', 'Yavin',
  'Alderaan', 'Mandalore', 'Lothal', 'Scarif', 'Jedha', 'Jakku',
  'Corellia', 'Kessel', 'Dantooine', 'Mon Cala', 'Sullust', 'Ryloth',
  'Nal Hutta', 'Felucia', 'Christophsis', 'Dathomir', 'Ilum', 'Crait',
  'Exegol', 'Kijimi', 'Pasaana', 'Ajan Kloss', 'Nevarro', 'Arvala-7',
];

const PLANET_CLASSES = [101, 102, 103, 104, 105, 201, 202, 203, 301, 302];

@Injectable()
export class GalaxyGeneratorService {
  private readonly logger = new Logger(GalaxyGeneratorService.name);

  constructor(
    @InjectRepository(Layer)
    private readonly layerRepo: Repository<Layer>,
    @InjectRepository(StarSystem)
    private readonly systemRepo: Repository<StarSystem>,
    @InjectRepository(CelestialObject)
    private readonly objectRepo: Repository<CelestialObject>,
  ) {}

  async seedIfEmpty(): Promise<void> {
    const layerCount = await this.layerRepo.count();
    if (layerCount > 0) {
      this.logger.log('Galaxy already seeded, skipping');
      return;
    }

    this.logger.log('Seeding galaxy...');
    await this.generateGalaxy();
    this.logger.log('Galaxy seeded successfully');
  }

  private async generateGalaxy(): Promise<void> {
    const layer = this.layerRepo.create({
      name: 'Outer Rim',
      width: 8,
      height: 8,
      sectorSize: 20,
      isDefault: true,
      isColonizable: true,
      isNoobZone: true,
      isFinished: false,
      isHidden: false,
    });
    await this.layerRepo.save(layer);

    const systemCount = 12 + Math.floor(Math.random() * 8); // 12-20 systems
    const usedPositions = new Set<string>();
    const shuffledNames = [...STAR_NAMES].sort(() => Math.random() - 0.5);

    for (let i = 0; i < systemCount; i++) {
      let cx: number, cy: number;
      do {
        cx = Math.floor(Math.random() * layer.width);
        cy = Math.floor(Math.random() * layer.height);
      } while (usedPositions.has(`${cx},${cy}`));
      usedPositions.add(`${cx},${cy}`);

      const system = this.systemRepo.create({
        name: shuffledNames[i] || `System-${i}`,
        cx,
        cy,
        layerId: layer.id,
        systemTypeId: 1001 + Math.floor(Math.random() * 10),
        maxX: 20,
        maxY: 20,
      });
      await this.systemRepo.save(system);

      await this.generateSystemObjects(system);
    }
  }

  private async generateSystemObjects(system: StarSystem): Promise<void> {
    const planetCount = 2 + Math.floor(Math.random() * 4); // 2-5 planets

    for (let i = 0; i < planetCount; i++) {
      const planet = this.objectRepo.create({
        systemId: system.id,
        objectType: CelestialObjectType.PLANET,
        name: `${system.name} ${this.toRoman(i + 1)}`,
        posX: 3 + i * 3 + Math.floor(Math.random() * 2),
        posY: 8 + Math.floor(Math.random() * 5),
        classId: PLANET_CLASSES[Math.floor(Math.random() * PLANET_CLASSES.length)],
        isColonizable: Math.random() > 0.3,
      });
      await this.objectRepo.save(planet);

      // Chance for moon
      if (Math.random() > 0.6) {
        const moon = this.objectRepo.create({
          systemId: system.id,
          objectType: CelestialObjectType.MOON,
          name: `${planet.name}a`,
          posX: planet.posX + 1,
          posY: planet.posY - 1,
          classId: 401,
          isColonizable: Math.random() > 0.5,
        });
        await this.objectRepo.save(moon);
      }
    }

    // Asteroid belt
    if (Math.random() > 0.5) {
      const beltY = 15 + Math.floor(Math.random() * 4);
      for (let a = 0; a < 3; a++) {
        const asteroid = this.objectRepo.create({
          systemId: system.id,
          objectType: CelestialObjectType.ASTEROID,
          name: null,
          posX: 5 + a * 4,
          posY: beltY,
          classId: 501,
          isColonizable: false,
        });
        await this.objectRepo.save(asteroid);
      }
    }
  }

  private toRoman(n: number): string {
    const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    return numerals[n - 1] || `${n}`;
  }
}
